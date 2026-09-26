import { Request, Response } from 'express';
import whatsappService from '../whatsapp/whatsapp.service';
import conversationService from '../services/conversation.service';
import prisma from '../prisma/client';
import queueService from '../queues/queue.service';
import logger from '../utils/logger';

/**
 * Meta WhatsApp Webhook Verification (GET)
 */
export const verifyWhatsAppWebhook = (req: Request, res: Response) => {
  const mode = req.query['hub.mode'] as string;
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;

  const verifiedChallenge = whatsappService.verifyWebhookChallenge(mode, token, challenge);
  if (verifiedChallenge) {
    return res.status(200).send(verifiedChallenge);
  }

  return res.status(403).send('Forbidden');
};

/**
 * Meta WhatsApp Inbound Message Event Handler (POST)
 */
export const handleWhatsAppWebhook = async (req: Request, res: Response) => {
  try {
    // 1. Immediately acknowledge webhook with 200 OK to prevent Meta retries
    res.status(200).send('EVENT_RECEIVED');

    // 2. Handle Message Delivery Status Updates (SENT, DELIVERED, READ, FAILED)
    const statusEvents = whatsappService.parseInboundStatuses(req.body);
    if (statusEvents && statusEvents.length > 0) {
      for (const st of statusEvents) {
        try {
          const updated = await prisma.message.updateMany({
            where: { externalMessageId: st.messageId },
            data: { deliveryStatus: st.status },
          });
          if (updated.count > 0) {
            logger.info(
              { messageId: st.messageId, status: st.status },
              'Updated WhatsApp message delivery status'
            );
          }
        } catch (stErr) {
          logger.warn({ stErr, messageId: st.messageId }, 'Failed to update message delivery status');
        }
      }
    }

    const events = whatsappService.parseInboundWebhook(req.body);
    if (!events || events.length === 0) {
      return;
    }

    // 3. Asynchronously process each message through the queue
    for (const ev of events) {
      await queueService.addJob(
        'ai-analysis',
        ev,
        { attempts: 3 },
        async (eventData) => {
          try {
            // Deduplicate incoming webhook messages immediately
            if (eventData.messageId) {
              const existingMsg = await prisma.message.findUnique({
                where: { externalMessageId: eventData.messageId },
              });
              if (existingMsg) {
                logger.info(
                  { messageId: eventData.messageId },
                  'Inbound WhatsApp message already processed. Dropping duplicate event.'
                );
                return;
              }
            }

            const rawPhone = eventData.fromPhone.replace(/\D/g, '');
            // Find lead by phone
            let lead = await prisma.lead.findFirst({
              where: {
                phone: { contains: rawPhone.slice(-10) }, // match last 10 digits
              },
            });

            // If lead doesn't exist, create an inbound WhatsApp lead
            if (!lead) {
              const defaultProject = await prisma.project.findFirst();
              if (!defaultProject) return;

              lead = await prisma.lead.create({
                data: {
                  name: eventData.senderName || `WhatsApp User ${rawPhone.slice(-4)}`,
                  phone: rawPhone,
                  projectId: defaultProject.id,
                  source: 'WHATSAPP_INBOUND',
                  status: 'RESPONDED',
                },
              });
            }

            // Route to Conversation Service (with database-level unique constraint guard)
            await conversationService.handleIncomingMessage({
              leadId: lead.id,
              messageText: eventData.messageText,
              senderType: 'CUSTOMER',
              channel: 'WHATSAPP',
              externalMessageId: eventData.messageId,
            });

            logger.info({ leadId: lead.id, phone: rawPhone }, 'Inbound WhatsApp message processed');
          } catch (err) {
            logger.error({ err, eventData }, 'Failed handling inbound WhatsApp job');
          }
        }
      );
    }
  } catch (err: any) {
    logger.error({ err }, 'Error in handleWhatsAppWebhook');
  }
};

