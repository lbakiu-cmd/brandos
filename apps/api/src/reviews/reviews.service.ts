import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@brandos/database";

@Injectable()
export class ReviewsService {
  async list(userId: string) {
    const membership = await prisma.membership.findFirst({
      where: { userId },
      include: { business: true },
    });
    if (!membership) throw new NotFoundException("No business found.");
    const businessId = membership.businessId;
    const biz = membership.business;

    let reviews = await prisma.googleReview.findMany({
      where: { businessId },
      orderBy: { reviewDate: "desc" },
    });

    const total = reviews.length;
    const replied = reviews.filter((r) => r.replyText !== null).length;
    const avgRating = total > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1) : "0.0";
    const responseRate = total > 0 ? Math.round((replied / total) * 100) : 0;

    return {
      business: biz,
      stats: {
        totalReviews: total,
        repliedCount: replied,
        pendingCount: total - replied,
        averageRating: Number(avgRating),
        responseRatePercent: responseRate,
      },
      reviews,
    };
  }

  async generateAiReply(userId: string, reviewId: string) {
    const membership = await prisma.membership.findFirst({
      where: { userId },
      include: { business: true },
    });
    if (!membership) throw new NotFoundException("No business found.");

    const review = await prisma.googleReview.findFirst({
      where: { id: reviewId, businessId: membership.businessId },
    });
    if (!review) throw new NotFoundException("Review not found.");

    const biz = membership.business;
    const author = review.authorName.split(" ")[0];
    let draft = "";

    if (review.rating === 5) {
      draft = `Hi ${author}! Thank you so much for the 5-star review! We are thrilled to hear you had such a wonderful experience with our team at ${biz.name} in ${biz.city || "the area"}. Your kind words mean the world to our local business, and we look forward to seeing you again soon!`;
    } else if (review.rating === 4) {
      draft = `Thank you ${author} for taking the time to share your review! We're glad you had a positive experience with ${biz.name}. We're always striving for 5-star excellence and appreciate your helpful feedback. See you next time!`;
    } else if (review.rating === 3) {
      draft = `Hello ${author}, thank you for sharing your candid feedback. At ${biz.name}, we hold ourselves to the highest standards of customer care. We would love the opportunity to learn more about your visit and ensure your next experience is exceptional. Please feel free to reach out to us directly at ${biz.phone || "our front desk"}.`;
    } else {
      draft = `Dear ${author}, thank you for bringing this to our attention. We are deeply sorry that your experience did not reflect the standard of quality we strive for at ${biz.name}. We take customer satisfaction very seriously and would appreciate the chance to make this right. Please contact our management team directly at ${biz.phone || biz.email || "our office"} so we can assist you promptly.`;
    }

    return prisma.googleReview.update({
      where: { id: reviewId },
      data: { aiReplyDraft: draft },
    });
  }

  async updateReply(userId: string, reviewId: string, replyText: string) {
    const membership = await prisma.membership.findFirst({ where: { userId } });
    if (!membership) throw new NotFoundException("No business found.");

    if (!replyText || !replyText.trim()) {
      throw new BadRequestException("Reply text cannot be empty.");
    }

    const businessId = membership.businessId;
    const cleanReply = replyText.trim();

    // 1. Try finding review in database by ID or author name
    let review = await prisma.googleReview.findFirst({
      where: {
        businessId,
        OR: [
          { id: reviewId },
          { authorName: { equals: reviewId, mode: "insensitive" } },
        ],
      },
    });

    // 2. Also check if the business has a GOOGLE_BUSINESS_PROFILE IntegrationAccount with metricsCache.recentReviews
    let matchedSnippet: any = null;
    try {
      const gbpAccount = await prisma.integrationAccount.findFirst({
        where: {
          businessId,
          provider: "GOOGLE_BUSINESS_PROFILE" as any,
        },
      });

      if (gbpAccount && gbpAccount.metricsCache) {
        const cache: any = JSON.parse(JSON.stringify(gbpAccount.metricsCache));
        if (Array.isArray(cache.recentReviews)) {
          let cacheUpdated = false;
          cache.recentReviews = cache.recentReviews.map((r: any, idx: number) => {
            const isMatch =
              r.id === reviewId ||
              idx.toString() === reviewId ||
              (r.author && (
                r.author.toLowerCase() === reviewId.toLowerCase() ||
                reviewId.toLowerCase().includes(r.author.toLowerCase()) ||
                r.author.toLowerCase().includes(reviewId.toLowerCase())
              ));

            if (isMatch) {
              matchedSnippet = r;
              cacheUpdated = true;
              return {
                ...r,
                replied: true,
                reply: cleanReply,
                aiDraft: undefined,
              };
            }
            return r;
          });

          if (cacheUpdated) {
            await prisma.integrationAccount.update({
              where: { id: gbpAccount.id },
              data: { metricsCache: cache },
            });
          }
        }
      }
    } catch (err) {
      // Non-blocking for metrics cache updates
    }

    // 3. Update database record if it already exists
    if (review) {
      return prisma.googleReview.update({
        where: { id: review.id },
        data: {
          replyText: cleanReply,
          repliedAt: new Date(),
          aiReplyDraft: null,
        },
      });
    }

    // 4. If review wasn't found in google_reviews table, persist it as a permanent record
    const authorName = matchedSnippet?.author || (reviewId.startsWith("rev_") ? "Customer Review" : reviewId);
    return prisma.googleReview.create({
      data: {
        businessId,
        authorName,
        rating: matchedSnippet?.rating ? Number(matchedSnippet.rating) : 5,
        comment: matchedSnippet?.comment || null,
        replyText: cleanReply,
        repliedAt: new Date(),
        aiReplyDraft: null,
      },
    });
  }
}
