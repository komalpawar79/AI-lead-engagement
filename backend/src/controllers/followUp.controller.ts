import { Request, Response } from 'express';
import prisma from '../prisma/client';
import followUpService from '../services/followUp.service';
import excelService from '../excel/excel.service';
import { sendSuccess, sendError } from '../utils/response';

export const getAllFollowUps = async (req: Request, res: Response) => {
  try {
    const { status, priority } = req.query;
    const whereClause: any = {};
    if (status && status !== 'ALL') whereClause.status = status;
    if (priority && priority !== 'ALL') whereClause.priority = priority;

    const followUps = await prisma.followUp.findMany({
      where: whereClause,
      include: {
        lead: {
          include: {
            project: { select: { id: true, name: true, location: true } },
            analyses: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
        conversation: {
          select: { id: true, channel: true, lastMessageAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = followUps.map((f) => {
      const analysis = f.lead.analyses[0];
      return {
        id: f.id,
        leadId: f.lead.id,
        conversationId: f.conversationId,
        leadName: f.lead.name,
        phone: f.lead.phone,
        email: f.lead.email,
        projectName: f.lead.project.name,
        projectId: f.lead.project.id,
        requirement: f.lead.requirement,
        configuration: f.lead.configuration || analysis?.configuration || null,
        budget: f.lead.budget || analysis?.budget || null,
        interestLevel: f.lead.interestLevel,
        reason: f.reason,
        priority: f.priority,
        status: f.status,
        callbackRequested: analysis?.callbackRequested || false,
        siteVisitRequested: analysis?.siteVisitRequested || false,
        summary: analysis?.summary || null,
        identifiedAt: f.createdAt,
      };
    });

    return sendSuccess(res, formatted);
  } catch (err: any) {
    return sendError(res, 'FOLLOWUPS_FETCH_ERROR', err.message, 500);
  }
};

export const exportFollowUpsExcel = async (_req: Request, res: Response) => {
  try {
    const exportData = await followUpService.getFollowUpsForExport();

    if (exportData.length === 0) {
      return sendError(res, 'NO_DATA', 'No follow-up leads available to export.', 404);
    }

    const excelBuffer = await excelService.generateFollowUpsExcel(exportData);

    const filename = `follow_up_leads_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', excelBuffer.length);

    // Update status to EXPORTED
    const ids = exportData.map((d) => d.id);
    await prisma.followUp.updateMany({
      where: { id: { in: ids } },
      data: { status: 'EXPORTED' },
    });

    return res.send(excelBuffer);
  } catch (err: any) {
    return sendError(res, 'EXPORT_FAILED', err.message, 500);
  }
};

export const updateFollowUpStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, priority } = req.body;

    const updated = await prisma.followUp.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
        updatedAt: new Date(),
      },
    });

    return sendSuccess(res, updated, 'Follow-up status updated');
  } catch (err: any) {
    return sendError(res, 'UPDATE_ERROR', err.message, 500);
  }
};

