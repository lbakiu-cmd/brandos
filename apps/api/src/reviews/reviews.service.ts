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

    // Seed realistic Google reviews if none exist
    if (reviews.length === 0) {
      const sampleReviews = [
        {
          businessId,
          authorName: "Sarah Jenkins",
          rating: 5,
          comment: `Amazing service at ${biz.name}! The team was so welcoming, efficient, and professional. Best in ${biz.city || "town"}. Highly recommend!`,
          reviewDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
        {
          businessId,
          authorName: "Michael Rodriguez",
          rating: 5,
          comment: "Super transparent pricing and excellent care. Will definitely be returning.",
          reviewDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          replyText: `Thank you Michael! We appreciate your trust in ${biz.name}.`,
          repliedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        },
        {
          businessId,
          authorName: "David Chen",
          rating: 4,
          comment: "Great experience overall. Wait time was about 15 minutes past my appointment time, but the quality of service made up for it.",
          reviewDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
        {
          businessId,
          authorName: "Emily Watson",
          rating: 3,
          comment: "Decent service, but communication could be improved regarding follow-up steps.",
          reviewDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
        },
        {
          businessId,
          authorName: "Alex Vance",
          rating: 1,
          comment: "Had trouble getting in touch with someone on the phone to reschedule.",
          reviewDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        },
      ];

      await prisma.googleReview.createMany({ data: sampleReviews });
      reviews = await prisma.googleReview.findMany({
        where: { businessId },
        orderBy: { reviewDate: "desc" },
      });
    }

    const total = reviews.length;
    const replied = reviews.filter((r) => r.replyText !== null).length;
    const avgRating = total > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1) : "5.0";
    const responseRate = total > 0 ? Math.round((replied / total) * 100) : 100;

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

    const review = await prisma.googleReview.findFirst({
      where: { id: reviewId, businessId: membership.businessId },
    });
    if (!review) throw new NotFoundException("Review not found.");

    return prisma.googleReview.update({
      where: { id: reviewId },
      data: {
        replyText: replyText.trim(),
        repliedAt: new Date(),
        aiReplyDraft: null,
      },
    });
  }
}
