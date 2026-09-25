import prisma from '../prisma/client';
import logger from '../utils/logger';
import aiService, { StructuredAIOutput } from '../ai/ai.service';
import projectKnowledgeService from './projectKnowledge.service';
import followUpService from './followUp.service';
import whatsappService from '../whatsapp/whatsapp.service';
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
  analysis: StructuredAIOutput;
}

class ConversationService {
  /**
   * Handle an incoming message from a lead (either live WhatsApp or Test simulator)
   */
  public async handleIncomingMessage(input: HandleMessageInput): Promise<ConversationResult> {
    const { leadId, messageText, channel = 'TEST', externalMessageId } = input;

    // 1. Fetch Lead & associated Project
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        project: true,
        campaign: true,
      },
    });

    if (!lead) {
      throw new Error(`Lead with ID ${leadId} not found`);
    }

    // 2. Fetch or create active conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        leadId: lead.id,
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          leadId: lead.id,
          campaignId: lead.campaignId,
          channel,
          status: 'ACTIVE',
        },
      });
    }

    // 3. Fetch conversation history BEFORE saving the current customer message.
    //    This ensures the latest customer message is passed explicitly once as `messageText`
    //    and not duplicated inside the `history` array.
    const priorMessages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { sentAt: 'asc' },
    });

    const history: ConversationMessageHistory[] = priorMessages.map((m) => ({
      senderType: m.senderType as any,
      messageText: m.messageText,
      sentAt: m.sentAt,
    }));

    // 4. Save Customer message to DB
    const customerMsg = await prisma.message.create({
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

    // 5. Get Project Knowledge Context
    const projectContext = await projectKnowledgeService.getProjectContext(lead.projectId);
    if (!projectContext) {
      throw new Error(`Project knowledge context not found for project ID ${lead.projectId}`);
    }

    // 6. Invoke AI Layer for Conversation + Structured Analysis
    const analysis = await aiService.processConversation(
      lead.name,
      messageText,
      history,
      projectContext
    );

    // 7. Save AI Response Message
    const aiMsg = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: 'AI',
        messageText: analysis.nextSuggestedMessage,
        deliveryStatus: channel === 'WHATSAPP' ? 'SENT' : 'DELIVERED',
        sentAt: new Date(),
      },
    });

    // 8. If channel is WhatsApp, send outbound message to customer
    if (channel === 'WHATSAPP') {
      whatsappService
        .sendTextMessage(lead.phone, analysis.nextSuggestedMessage)
        .catch((err: any) => logger.error({ err }, 'Outbound WhatsApp delivery failed'));
    }

    // 9. Store AI Analysis record
    await prisma.aIAnalysis.create({
      data: {
        conversationId: conversation.id,
        leadId: lead.id,
        intent: analysis.intent,
        interestLevel: analysis.interestLevel,
        followUpRequired: analysis.followUpRequired,
        followUpReason: analysis.followUpReason,
        configuration: analysis.configuration,
        budget: analysis.budget,
        preferredLocation: analysis.preferredLocation,
        callbackRequested: analysis.callbackRequested,
        siteVisitRequested: analysis.siteVisitRequested,
        summary: analysis.summary,
        confidenceScore: 0.95,
        model: analysis.model,
        promptVersion: analysis.promptVersion,
      },
    });

    // 10. Update Lead Status & Extracted entities
    let newLeadStatus = 'RESPONDED';
    if (analysis.followUpRequired) {
      newLeadStatus = 'FOLLOW_UP';
    } else if (analysis.interestLevel === 'NOT_INTERESTED') {
      newLeadStatus = 'NOT_INTERESTED';
    } else if (analysis.interestLevel === 'HIGH' || analysis.interestLevel === 'MEDIUM') {
      newLeadStatus = 'INTERESTED';
    }

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: newLeadStatus,
        interestLevel: analysis.interestLevel,
        followUpRequired: analysis.followUpRequired,
        followUpReason: analysis.followUpReason,
        configuration: analysis.configuration || lead.configuration,
        budget: analysis.budget || lead.budget,
        updatedAt: new Date(),
      },
    });

    // 11. Create or Update Follow-up if required
    if (analysis.followUpRequired) {
      await followUpService.createOrUpdateFollowUp(
        lead.id,
        conversation.id,
        analysis.followUpReason,
        analysis.interestLevel === 'HIGH' ? 'HIGH' : 'MEDIUM'
      );
    }

    // 12. Update Conversation timestamp
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
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
      analysis,
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
        channel,
        status: 'ACTIVE',
      },
    });

    const configs = (lead.project as any).configurations || '2 & 3 BHK';
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
        deliveryStatus: 'DELIVERED',
      },
    });

    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: 'CONTACTED' },
    });

    if (channel === 'WHATSAPP') {
      whatsappService.sendTextMessage(lead.phone, initialMessage).catch((err: any) =>
        logger.error({ err }, 'Failed sending initial WhatsApp outreach')
      );
    }

    return { conversation, initialMessage: aiMsg };
  }

  /**
   * Recalculate campaign progress statistics
   */
  public async refreshCampaignStats(campaignId: string) {
    try {
      const leads = await prisma.lead.findMany({
        where: { campaignId },
        select: { status: true, followUpRequired: true, interestLevel: true },
      });

      const totalLeads = leads.length;
      const responses = leads.filter((l) => ['RESPONDED', 'INTERESTED', 'NOT_INTERESTED', 'FOLLOW_UP'].includes(l.status)).length;
      const interestedLeads = leads.filter((l) => ['INTERESTED', 'FOLLOW_UP'].includes(l.status)).length;
      const followUpLeads = leads.filter((l) => l.followUpRequired).length;
      const notInterested = leads.filter((l) => l.status === 'NOT_INTERESTED').length;
      const noResponse = leads.filter((l) => l.status === 'NO_RESPONSE').length;

      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          totalLeads,
          responses,
          interestedLeads,
          followUpLeads,
          notInterested,
          noResponse,
        },
      });
    } catch (err) {
      logger.error({ err, campaignId }, 'Error updating campaign statistics');
    }
  }
}

export const conversationService = new ConversationService();
export default conversationService;
