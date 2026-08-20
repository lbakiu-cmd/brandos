export type IntegrationProvider = "META" | "GOOGLE" | "LINKEDIN" | "TIKTOK" | "X";

export interface IntegrationAccount {
  provider: IntegrationProvider;
  accountId: string;
  displayName: string;
  connectedAt: Date;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
}

export interface WebhookEventPayload {
  object: string;
  entry: Array<{
    id: string;
    time: number;
    messaging?: Array<{
      sender: { id: string };
      recipient: { id: string };
      timestamp: number;
      message?: { mid: string; text: string };
    }>;
  }>;
}
