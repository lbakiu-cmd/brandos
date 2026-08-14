import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { prisma } from "@brandos/database";

@Injectable()
export class InboxService {
  async connectFakeInstagram(userId: string) {
    const membership = await prisma.membership.findFirst({
      where: { userId },
      include: { business: true },
    });
    if (!membership) {
      throw new NotFoundException("No business found for this user.");
    }

    const platformAccountId = "fake-ig-" + membership.businessId.slice(0, 8);

    return prisma.socialAccount.upsert({
      where: {
        businessId_platform_platformAccountId: {
          businessId: membership.businessId,
          platform: "INSTAGRAM",
          platformAccountId,
        },
      },
      update: { status: "ACTIVE" },
      create: {
        businessId: membership.businessId,
        platform: "INSTAGRAM",
        platformAccountId,
        username: "fake.instagram.demo",
        displayName: membership.business.name + " (Fake IG)",
        status: "ACTIVE",
      },
    });
  }

  async ingestMetaWebhook(payload: any) {
    let processed = 0;
    const entries: any[] = payload?.entry ?? [];

    for (const entry of entries) {
      const messagingEvents: any[] = entry?.messaging ?? [];

      for (const event of messagingEvents) {
        const recipientId: string | undefined = event?.recipient?.id;
        const senderId: string | undefined = event?.sender?.id;
        const text: string | undefined = event?.message?.text;
        const mid: string | undefined = event?.message?.mid;

        if (!recipientId || !senderId || !text || !mid) continue;

        const account = await prisma.socialAccount.findFirst({
          where: { platformAccountId: recipientId },
        });
        if (!account) continue;

        const conversation = await prisma.conversation.upsert({
          where: {
            socialAccountId_externalConversationId: {
              socialAccountId: account.id,
              externalConversationId: senderId,
            },
          },
          update: { lastMessageAt: new Date() },
          create: {
            businessId: account.businessId,
            socialAccountId: account.id,
            externalConversationId: senderId,
            participantName: "Customer " + senderId.slice(-4),
            lastMessageAt: new Date(),
          },
        });

        const existing = await prisma.message.findUnique({
          where: { externalMessageId: mid },
        });
        if (existing) continue;

        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            businessId: account.businessId,
            direction: "INBOUND",
            senderType: "CUSTOMER",
            externalMessageId: mid,
            body: text,
            sentAt: new Date(Number(event.timestamp) || Date.now()),
          },
        });

        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { unreadCount: { increment: 1 }, lastMessageAt: new Date() },
        });

        processed++;
      }
    }

    return { processed };
  }

  async listConversations(userId: string) {
    const memberships = await prisma.membership.findMany({ where: { userId } });
    const businessIds = memberships.map((m) => m.businessId);

    return prisma.conversation.findMany({
      where: { businessId: { in: businessIds } },
      orderBy: { lastMessageAt: "desc" },
      include: {
        socialAccount: {
          select: { platform: true, username: true, displayName: true },
        },
      },
    });
  }

  async listMessages(conversationId: string) {
    return prisma.message.findMany({
      where: { conversationId },
      orderBy: { sentAt: "asc" },
    });
  }

  async reply(conversationId: string, text: string, userId: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException("Conversation not found.");

    return prisma.message.create({
      data: {
        conversationId,
        businessId: conversation.businessId,
        direction: "OUTBOUND",
        senderType: "AGENT",
        authorId: userId,
        body: text,
        externalMessageId: "fake-out-" + randomUUID(),
        sentAt: new Date(),
      },
    });
  }
}