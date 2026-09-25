import { Request, Response } from 'express';
import prisma from '../prisma/client';
import queueService from '../queues/queue.service';
import conversationService from '../services/conversation.service';
import { sendSuccess, sendError } from '../utils/response';
import logger from '../utils/logger';

export const getAllCampaigns = async (_req: Request, res: Response) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        project: { select: { id: true, name: true, location: true } },
        _count: { select: { leads: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, campaigns);
  } catch (err: any) {
    return sendError(res, 'CAMPAIGNS_FETCH_ERROR', err.message, 500);
  }
};

export const getCampaignById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        project: true,
        leads: {
          take: 50,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
            interestLevel: true,
            followUpRequired: true,
            followUpReason: true,
          },
        },
      },
    });

    if (!campaign) {
      return sendError(res, 'NOT_FOUND', 'Campaign not found', 404);
    }
    return sendSuccess(res, campaign);
  } catch (err: any) {
    return sendError(res, 'CAMPAIGN_FETCH_ERROR', err.message, 500);
  }
};

export const createCampaign = async (req: Request, res: Response) => {
  try {
    const { name, projectId } = req.body;
    if (!name || !projectId) {
      return sendError(res, 'VALIDATION_ERROR', 'Campaign name and Project ID are required', 400);
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        projectId,
        status: 'DRAFT',
      },
    });

    return sendSuccess(res, campaign, 'Campaign created successfully', 201);
  } catch (err: any) {
    return sendError(res, 'CAMPAIGN_CREATE_ERROR', err.message, 500);
  }
};

export const startCampaign = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { leads: { where: { status: 'IMPORTED' } } },
    });

    if (!campaign) {
      return sendError(res, 'NOT_FOUND', 'Campaign not found', 404);
    }

    // Update status to RUNNING
    const updated = await prisma.campaign.update({
      where: { id },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    // Queue outreach messages asynchronously via queueService
    const leadIds = campaign.leads.map((l) => l.id);
    await queueService.addJob(
      'message-send',
      { campaignId: campaign.id, leadIds },
      { delay: 500 },
      async (data) => {
        logger.info({ campaignId: data.campaignId, count: data.leadIds.length }, 'Processing campaign batch outreach');
        for (const leadId of data.leadIds) {
          try {
            await conversationService.initiateOutreach(leadId, 'TEST');
          } catch (e) {
            logger.error({ leadId, e }, 'Failed initial lead outreach in campaign');
          }
        }
        await conversationService.refreshCampaignStats(data.campaignId);
      }
    );

    return sendSuccess(
      res,
      updated,
      `Campaign started. Queued initial outreach to ${leadIds.length} leads.`
    );
  } catch (err: any) {
    return sendError(res, 'CAMPAIGN_START_ERROR', err.message, 500);
  }
};

export const pauseCampaign = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const campaign = await prisma.campaign.update({
      where: { id },
      data: { status: 'PAUSED' },
    });
    return sendSuccess(res, campaign, 'Campaign paused');
  } catch (err: any) {
    return sendError(res, 'CAMPAIGN_PAUSE_ERROR', err.message, 500);
  }
};

export const resumeCampaign = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const campaign = await prisma.campaign.update({
      where: { id },
      data: { status: 'RUNNING' },
    });
    return sendSuccess(res, campaign, 'Campaign resumed');
  } catch (err: any) {
    return sendError(res, 'CAMPAIGN_RESUME_ERROR', err.message, 500);
  }
};

