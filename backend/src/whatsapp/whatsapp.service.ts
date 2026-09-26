import logger from '../utils/logger';

export interface WhatsAppInboundPayload {
  object: string;
  entry?: Array<{
    id: string;
    changes?: Array<{
      value?: {
        messaging_product?: string;
        metadata?: {
          display_phone_number?: string;
          phone_number_id?: string;
        };
        contacts?: Array<{
          profile?: { name?: string };
          wa_id?: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text?: { body: string };
        }>;
      };
      field?: string;
    }>;
  }>;
}

export interface InboundMessageEvent {
  fromPhone: string;
  senderName: string;
  messageText: string;
  messageId: string;
  timestamp: string;
}

export interface InboundStatusEvent {
  messageId: string;
  recipientId: string;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  timestamp: string;
}

class WhatsAppService {
  private phoneNumberId: string;
  private accessToken: string;
  private apiVersion: string;
  private verifyToken: string;

  constructor() {
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0';
    this.verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'leadengage_webhook_verify_token_2026';
  }

  /**
   * Verify webhook challenge from Meta
   */
  public verifyWebhookChallenge(mode?: string, token?: string, challenge?: string): string | null {
    if (mode === 'subscribe' && token === this.verifyToken) {
      logger.info('Meta WhatsApp Webhook subscription verified successfully.');
      return challenge || null;
    }
    logger.warn({ mode, token }, 'Meta WhatsApp Webhook verification failed: token mismatch');
    return null;
  }

  /**
   * Parse inbound Meta WhatsApp webhook payload into clean event objects
   */
  public parseInboundWebhook(payload: WhatsAppInboundPayload): InboundMessageEvent[] {
    const events: InboundMessageEvent[] = [];

    if (!payload.entry) return events;

    for (const entry of payload.entry) {
      if (!entry.changes) continue;

      for (const change of entry.changes) {
        const val = change.value;
        if (!val || !val.messages) continue;

        const contactMap: Record<string, string> = {};
        if (val.contacts) {
          for (const c of val.contacts) {
            if (c.wa_id && c.profile?.name) {
              contactMap[c.wa_id] = c.profile.name;
            }
          }
        }

        for (const msg of val.messages) {
          if (msg.type === 'text' && msg.text?.body) {
            events.push({
              fromPhone: msg.from,
              senderName: contactMap[msg.from] || 'Lead',
              messageText: msg.text.body,
              messageId: msg.id,
              timestamp: msg.timestamp,
            });
          }
        }
      }
    }

    return events;
  }

  /**
   * Parse status updates (sent, delivered, read, failed) from Meta WhatsApp webhook
   */
  public parseInboundStatuses(payload: any): InboundStatusEvent[] {
    const statuses: InboundStatusEvent[] = [];

    if (!payload?.entry) return statuses;

    for (const entry of payload.entry) {
      if (!entry.changes) continue;

      for (const change of entry.changes) {
        const val = change.value;
        if (!val || !val.statuses) continue;

        for (const st of val.statuses) {
          if (st.id && st.status) {
            let normalizedStatus: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' = 'SENT';
            const rawStatus = (st.status || '').toLowerCase();
            if (rawStatus === 'delivered') normalizedStatus = 'DELIVERED';
            else if (rawStatus === 'read') normalizedStatus = 'READ';
            else if (rawStatus === 'failed') normalizedStatus = 'FAILED';

            statuses.push({
              messageId: st.id,
              recipientId: st.recipient_id || '',
              status: normalizedStatus,
              timestamp: st.timestamp,
            });
          }
        }
      }
    }

    return statuses;
  }

  /**
   * Send WhatsApp text message using Meta Cloud API
   */
  public async sendTextMessage(toPhone: string, messageText: string): Promise<{ success: boolean; messageId?: string }> {
    if (!this.phoneNumberId || !this.accessToken) {
      logger.info({ toPhone, messageText }, '[WhatsApp MOCK / DEV] Message simulated: not sent to live Meta API');
      return { success: true, messageId: `mock-wa-${Date.now()}` };
    }

    const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: toPhone.replace(/\D/g, ''),
          type: 'text',
          text: { preview_url: false, body: messageText },
        }),
      });

      const data = (await response.json()) as any;
      if (!response.ok) {
        logger.error({ data }, 'Meta WhatsApp API error response');
        return { success: false };
      }

      const messageId = data?.messages?.[0]?.id;
      logger.info({ toPhone, messageId }, 'WhatsApp message delivered to Meta Cloud API');
      return { success: true, messageId };
    } catch (err) {
      logger.error({ err, toPhone }, 'Failed to invoke Meta WhatsApp Cloud API');
      return { success: false };
    }
  }
}

export const whatsappService = new WhatsAppService();
export default whatsappService;

