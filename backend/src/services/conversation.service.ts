import prisma from '../prisma/client';
import logger from '../utils/logger';
import conversationEngine, {
  ConversationState,
  EngineDecision,
} from '../ai/conversationEngine';
import projectKnowledgeService from './projectKnowledge.service';
import followUpService from './followUp.service';
import whatsappService from '../whatsapp/whatsapp.service';
import conversationMemoryService from './conversationMemory.service';
import { ConversationMessageHistory } from '../ai/prompts';

export interface HandleMessageInput {
  leadId: string;
  messageText: string;
  senderType: 'CUSTOMER' | 'SYSTEM';
  channel?: 'WHATSAPP' | 'TEST';
  externalMessageId?: string;
}

export interface ConversationResult {
  conversationId: string;
  leadId: string;
  customerMessage: any;
  aiMessage: any;
  analysis: any;
  decision?: EngineDecision;
  isDuplicate?: boolean;
}

class ConversationService {
  /**
   * Handle an incoming message from a lead (either live WhatsApp or Test simulator)
   * Enforces conversation state tracking, idempotency, and action separation.
   */
  public async handleIncomingMessage(input: HandleMessageInput): Promise<ConversationResult> {
    const { leadId, messageText, channel = 'TEST', externalMessageId } = input;

    // 1. Idempotency Check: Verify duplicate externalMessageId to prevent repeated processing
    if (externalMessageId) {
      const existingMessage = await prisma.message.findFirst({
        where: { externalMessageId },
      });
      if (existingMessage) {
        logger.warn(
          { externalMessageId, leadId },
          'Duplicate incoming message detected via externalMessageId. Ignoring to prevent duplicate responses.'
        );
        return {
          conversationId: existingMessage.conversationId,
          leadId,
          customerMessage: existingMessage,
          aiMessage: null,
          analysis: null,
          isDuplicate: true,
        };
      }
    }

    // 2. Fetch Lead & associated Project
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        project: {
          include: {
            inventory: true,
            knowledge: true,
          },
        },
        campaign: true,
      },
    });

    if (!lead) {
      throw new Error(`Lead with ID ${leadId} not found`);
    }

    // 3. Fetch or reactivate conversation (ACTIVE or IDLE)
    let conversation = await prisma.conversation.findFirst({
      where: {
        leadId: lead.id,
        status: { in: ['ACTIVE', 'IDLE'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          leadId: lead.id,
          campaignId: lead.campaignId,
          projectId: lead.projectId,
          channel,
          status: 'ACTIVE',
        },
      });
    } else if (!conversation.projectId && lead.projectId) {
      // Ensure conversation is linked directly to project
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { projectId: lead.projectId },
      });
    }

    // 4. Save Customer message to DB (Guarded by DB-level unique constraint on externalMessageId)
    let customerMsg: any;
    try {
      customerMsg = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderType: 'CUSTOMER',
          messageText,
          externalMessageId,
          deliveryStatus: 'READ',
          sentAt: new Date(),
          receivedAt: new Date(),
        },
      });
    } catch (createErr: any) {
      // P2002: Prisma unique constraint violation on externalMessageId
      if (createErr.code === 'P2002' && externalMessageId) {
        logger.warn(
          { externalMessageId, leadId },
          'Duplicate incoming message caught by unique DB constraint. Suppressing duplicate reply.'
        );
        const existing = await prisma.message.findUnique({
          where: { externalMessageId },
        });
        return {
          conversationId: conversation.id,
          leadId,
          customerMessage: existing,
          aiMessage: null,
          analysis: null,
          isDuplicate: true,
        };
      }
      throw createErr;
    }

    // 5. Fetch optimized sliding window of recent messages + rolling summary
    const memoryResult = await conversationMemoryService.getConversationWindow(conversation.id);
    const history: ConversationMessageHistory[] = memoryResult.history;
    const conversationSummary = memoryResult.summary;

    // 6. Get Project Knowledge Context
    const projectContext = await projectKnowledgeService.getProjectContext(lead.projectId);
    if (!projectContext) {
      throw new Error(`Project knowledge context not found for project ID ${lead.projectId}`);
    }

    // 7. Invoke Conversation Engine State Machine
    const conversationState: ConversationState = {
      conversationId: conversation.id,
      leadId: lead.id,
      leadName: lead.name,
      leadPhone: lead.phone,
      status: conversation.status as any,
      lastCustomerIntent: conversation.lastCustomerIntent,
      lastAssistantAction: conversation.lastAssistantAction,
      pendingQuestion: conversation.pendingQuestion,
      actionType: conversation.actionType as any,
      actionStatus: conversation.actionStatus as any,
      actionTime: conversation.actionTime,
      actionConfirmed: conversation.actionConfirmed,
      knownConfiguration: lead.configuration,
      knownBudget: lead.budget,
    };

    const decision = await conversationEngine.evaluateMessage(
      conversationState,
      messageText,
      history,
      projectContext,
      conversationSummary
    );

    // 8. Backend Action Validation & Persistence (Execute actions BEFORE confirming)
    if (decision.intent === 'OPT_OUT') {
      // Opt-out handling: Update lead, mark not interested, cancel pending followups
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: 'NOT_INTERESTED',
          interestLevel: 'NOT_INTERESTED',
          followUpRequired: false,
          followUpReason: decision.followUpReason,
          updatedAt: new Date(),
        },
      });

      await prisma.followUp.updateMany({
        where: { leadId: lead.id, status: 'PENDING' },
        data: { status: 'COMPLETED' },
      });
    } else if (
      decision.proposedAction.type === 'SCHEDULE_CALLBACK' ||
      decision.proposedAction.type === 'UPDATE_CALLBACK_TIME'
    ) {
      // Callback persistence: Idempotent create or update follow-up record
      const scheduledTime = decision.updatedState.actionTime || 'Requested time';
      const followUpReason = `Callback requested for ${scheduledTime}`;

      const existingFollowUp = await prisma.followUp.findFirst({
        where: {
          leadId: lead.id,
          conversationId: conversation.id,
        },
      });

      if (existingFollowUp) {
        await prisma.followUp.update({
          where: { id: existingFollowUp.id },
          data: {
            reason: followUpReason,
            priority: 'HIGH',
            status: 'PENDING',
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.followUp.create({
          data: {
            leadId: lead.id,
            conversationId: conversation.id,
            reason: followUpReason,
            priority: 'HIGH',
            status: 'PENDING',
          },
        });
      }

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: 'FOLLOW_UP',
          interestLevel: 'HIGH',
          followUpRequired: true,
          followUpReason,
          updatedAt: new Date(),
        },
      });
    }

    // 9. Update Lead preferences (budget, configuration) if newly extracted
    const leadUpdates: any = { updatedAt: new Date() };
    if (decision.extractedData.configuration && !lead.configuration) {
      leadUpdates.configuration = decision.extractedData.configuration;
    }
    if (decision.extractedData.budget) {
      leadUpdates.budget = decision.extractedData.budget;
    }
    if (decision.intent !== 'OPT_OUT') {
      leadUpdates.interestLevel = decision.interestLevel;
      leadUpdates.followUpRequired = decision.followUpRequired;
      if (decision.followUpReason) {
        leadUpdates.followUpReason = decision.followUpReason;
      }
    }
    await prisma.lead.update({
      where: { id: lead.id },
      data: leadUpdates,
    });

    // 10. Persist Conversation State to Database
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        status: decision.updatedState.status,
        lastCustomerIntent: decision.updatedState.lastCustomerIntent,
        lastAssistantAction: decision.updatedState.lastAssistantAction,
        pendingQuestion: decision.updatedState.pendingQuestion,
        actionType: decision.updatedState.actionType,
        actionStatus: decision.updatedState.actionStatus,
        actionTime: decision.updatedState.actionTime,
        actionConfirmed: decision.updatedState.actionConfirmed,
        lastMessageAt: new Date(),
      },
    });

    // 11. Handle Outbound Message Sending (Support intentional NO_REPLY)
    let aiMsg: any = null;

    if (decision.shouldSendReply && decision.replyMessage) {
      aiMsg = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderType: 'AI',
          messageText: decision.replyMessage,
          deliveryStatus: channel === 'WHATSAPP' ? 'SENT' : 'DELIVERED',
          sentAt: new Date(),
        },
      });

      // Send to customer via WhatsApp only if channel is WHATSAPP
      if (channel === 'WHATSAPP') {
        whatsappService
          .sendTextMessage(lead.phone, decision.replyMessage)
          .then(async (sendRes) => {
            if (sendRes.success && sendRes.messageId) {
              await prisma.message.update({
                where: { id: aiMsg.id },
                data: { externalMessageId: sendRes.messageId, deliveryStatus: 'SENT' },
              });
            }
          })
          .catch((err: any) => logger.error({ err }, 'Outbound WhatsApp delivery failed'));
      }
    } else {
      logger.info(
        { conversationId: conversation.id, leadId: lead.id },
        'Intentional NO_REPLY applied: suppressed unnecessary or repeated outbound message.'
      );
    }

    // 12. Store AI Analysis Audit record
    const analysisRecord = await prisma.aIAnalysis.create({
      data: {
        conversationId: conversation.id,
        leadId: lead.id,
        intent: decision.intent,
        interestLevel: decision.interestLevel,
        followUpRequired: decision.followUpRequired,
        followUpReason: decision.followUpReason,
        configuration: decision.extractedData.configuration || lead.configuration,
        budget: decision.extractedData.budget || lead.budget,
        preferredLocation: lead.project?.location || null,
        callbackRequested: decision.updatedState.actionType === 'CALLBACK',
        siteVisitRequested: decision.updatedState.actionType === 'SITE_VISIT',
        summary: decision.summary,
        confidenceScore: 0.95,
        model: 'conversation-state-engine-v2',
        promptVersion: 'v2.0-state-engine',
      },
    });

    // 13. Update Campaign metrics if linked
    if (lead.campaignId) {
      await this.refreshCampaignStats(lead.campaignId);
    }

    return {
      conversationId: conversation.id,
      leadId: lead.id,
      customerMessage: customerMsg,
      aiMessage: aiMsg,
      analysis: analysisRecord,
      decision,
    };
  }

  /**
   * Start initial proactive outreach to a lead
   */
  public async initiateOutreach(leadId: string, channel: 'WHATSAPP' | 'TEST' = 'TEST') {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { project: true },
    });
    if (!lead) throw new Error('Lead not found');

    const conversation = await prisma.conversation.create({
      data: {
        leadId: lead.id,
        campaignId: lead.campaignId,
        projectId: lead.projectId,
        channel,
        status: 'ACTIVE',
        lastAssistantAction: 'ASKED_PROPERTY_INTEREST',
        pendingQuestion: 'GENERAL',
      },
    });

    const configs = (lead.project as any)?.configurations || '2 & 3 BHK';
    const initialMessage =
      `Hi ${lead.name}! 👋\n\n` +
      `Thank you for your interest in ${lead.project.name}.\n\n` +
      `It's a premium residential project featuring ${configs} apartments, luxurious amenities, and beautiful views of the Creek, City & Express Highway.\n\n` +
      `Are you currently looking for a property?`;

    const aiMsg = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: 'AI',
        messageText: initialMessage,
        deliveryStatus: channel === 'WHATSAPP' ? 'SENT' : 'DELIVERED',
      },
    });

    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: 'CONTACTED' },
    });

    if (channel === 'WHATSAPP') {
      whatsappService
        .sendTextMessage(lead.phone, initialMessage)
        .then(async (res) => {
          if (res.success && res.messageId) {
            await prisma.message.update({
              where: { id: aiMsg.id },
              data: { externalMessageId: res.messageId, deliveryStatus: 'SENT' },
            });
          }
        })
        .catch((err: any) =>
          logger.error({ err }, 'Failed sending initial WhatsApp outreach')
        );
    }

    return { conversation, initialMessage: aiMsg };
  }

  /**
   * Recalculate campaign progress statistics
   */
  public async refreshCampaignStats(campaignId: string) {
    const counts = await prisma.lead.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: { id: true },
    });

    const stats: Record<string, number> = {};
    counts.forEach((c) => {
      stats[c.status] = c._count.id;
    });

    const interestedCount = stats['INTERESTED'] || 0;
    const followUpCount = stats['FOLLOW_UP'] || 0;
    const notInterestedCount = stats['NOT_INTERESTED'] || 0;
    const contactedCount = stats['CONTACTED'] || 0;
    const respondedCount = stats['RESPONDED'] || 0;

    const totalResponses = interestedCount + followUpCount + notInterestedCount + respondedCount;

    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        interestedLeads: interestedCount,
        followUpLeads: followUpCount,
        notInterested: notInterestedCount,
        responses: totalResponses,
        updatedAt: new Date(),
      },
    });
  }
}

export const conversationService = new ConversationService();
export default conversationService;
