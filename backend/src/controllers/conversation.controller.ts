import { Request, Response } from 'express';
import prisma from '../prisma/client';
import conversationService from '../services/conversation.service';
import { sendSuccess, sendError } from '../utils/response';

export const getConversationByLeadId = async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const conversation = await prisma.conversation.findFirst({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      include: {
        lead: {
          include: {
            project: { select: { id: true, name: true, configurations: true, priceMin: true, priceMax: true } },
          },
        },
        messages: { orderBy: { sentAt: 'asc' } },
        analyses: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!conversation) {
      return sendError(res, 'NOT_FOUND', 'No conversation found for this lead', 404);
    }

    return sendSuccess(res, conversation);
  } catch (err: any) {
    return sendError(res, 'CONVERSATION_FETCH_ERROR', err.message, 500);
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { leadId, messageText, channel = 'TEST' } = req.body;
    if (!leadId || !messageText) {
      return sendError(res, 'VALIDATION_ERROR', 'leadId and messageText are required', 400);
    }

    const result = await conversationService.handleIncomingMessage({
      leadId,
      messageText,
      senderType: 'CUSTOMER',
      channel,
    });

    return sendSuccess(res, result, 'Message processed and AI response generated');
  } catch (err: any) {
    return sendError(res, 'MESSAGE_SEND_ERROR', err.message, 500);
  }
};

export const createOrGetTestConversation = async (req: Request, res: Response) => {
  try {
    const { name = 'Test Lead', phone = '9876543210', projectId } = req.body;

    let targetProjectId = projectId;
    if (!targetProjectId) {
      const defaultProject = await prisma.project.findFirst();
      if (!defaultProject) {
        return sendError(res, 'NO_PROJECT', 'Please create at least one project first', 400);
      }
      targetProjectId = defaultProject.id;
    }

    // Find or create test lead
    let testLead = await prisma.lead.findFirst({
      where: { phone, source: 'TEST_ENVIRONMENT' },
    });

    if (!testLead) {
      testLead = await prisma.lead.create({
        data: {
          name,
          phone,
          projectId: targetProjectId,
          status: 'CONTACTED',
          source: 'TEST_ENVIRONMENT',
        },
      });
    }

    // Check for conversation
    let conv = await prisma.conversation.findFirst({
      where: { leadId: testLead.id },
      include: {
        messages: { orderBy: { sentAt: 'asc' } },
        analyses: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!conv) {
      const started = await conversationService.initiateOutreach(testLead.id, 'TEST');
      conv = await prisma.conversation.findUnique({
        where: { id: started.conversation.id },
        include: {
          messages: { orderBy: { sentAt: 'asc' } },
          analyses: { orderBy: { createdAt: 'desc' } },
        },
      });
    }

    return sendSuccess(res, {
      lead: testLead,
      conversation: conv,
    });
  } catch (err: any) {
    return sendError(res, 'TEST_CONVERSATION_ERROR', err.message, 500);
  }
};

export const resetTestConversation = async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    // Delete messages and analyses for this test lead
    await prisma.message.deleteMany({
      where: { conversation: { leadId } },
    });
    await prisma.aIAnalysis.deleteMany({
      where: { leadId },
    });
    await prisma.followUp.deleteMany({
      where: { leadId },
    });
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: 'IMPORTED',
        interestLevel: 'UNKNOWN',
        followUpRequired: false,
        followUpReason: null,
      },
    });

    // Re-initiate conversation
    const result = await conversationService.initiateOutreach(leadId, 'TEST');

    return sendSuccess(res, result, 'Test conversation reset successfully');
  } catch (err: any) {
    return sendError(res, 'RESET_ERROR', err.message, 500);
  }
};

