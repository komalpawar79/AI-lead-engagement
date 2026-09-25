import { Request, Response } from 'express';
import prisma from '../prisma/client';
import excelService from '../excel/excel.service';
import { sendSuccess, sendError } from '../utils/response';

export const getAllLeads = async (req: Request, res: Response) => {
  try {
    const {
      search,
      status,
      projectId,
      interestLevel,
      followUpRequired,
      page = '1',
      limit = '25',
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const whereClause: any = {};

    if (search) {
      const searchStr = (search as string).trim();
      whereClause.OR = [
        { name: { contains: searchStr } },
        { phone: { contains: searchStr } },
        { email: { contains: searchStr } },
      ];
    }

    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    if (projectId && projectId !== 'ALL') {
      whereClause.projectId = projectId;
    }

    if (interestLevel && interestLevel !== 'ALL') {
      whereClause.interestLevel = interestLevel;
    }

    if (followUpRequired !== undefined) {
      whereClause.followUpRequired = followUpRequired === 'true';
    }

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where: whereClause }),
      prisma.lead.findMany({
        where: whereClause,
        include: {
          project: { select: { id: true, name: true, location: true } },
          campaign: { select: { id: true, name: true } },
          conversations: {
            take: 1,
            orderBy: { lastMessageAt: 'desc' },
            include: {
              messages: {
                take: 1,
                orderBy: { sentAt: 'desc' },
              },
            },
          },
          analyses: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    const formattedLeads = leads.map((lead) => {
      const lastConv = lead.conversations[0];
      const lastMsg = lastConv?.messages[0];
      const latestAnalysis = lead.analyses[0];

      return {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        projectName: lead.project.name,
        projectId: lead.projectId,
        campaignName: lead.campaign?.name || null,
        status: lead.status,
        interestLevel: lead.interestLevel,
        followUpRequired: lead.followUpRequired,
        followUpReason: lead.followUpReason,
        configuration: lead.configuration || latestAnalysis?.configuration || null,
        budget: lead.budget || latestAnalysis?.budget || null,
        lastReply: lastMsg ? lastMsg.messageText : null,
        lastMessageSender: lastMsg ? lastMsg.senderType : null,
        lastInteractionAt: lastConv ? lastConv.lastMessageAt : lead.createdAt,
        createdAt: lead.createdAt,
      };
    });

    return sendSuccess(res, {
      leads: formattedLeads,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err: any) {
    return sendError(res, 'LEADS_FETCH_ERROR', err.message, 500);
  }
};

export const getLeadById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            knowledge: { where: { isActive: true } },
          },
        },
        campaign: true,
        conversations: {
          orderBy: { createdAt: 'desc' },
          include: {
            messages: { orderBy: { sentAt: 'asc' } },
            analyses: { orderBy: { createdAt: 'desc' } },
          },
        },
        analyses: { orderBy: { createdAt: 'desc' } },
        followUps: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!lead) {
      return sendError(res, 'NOT_FOUND', 'Lead not found', 404);
    }

    return sendSuccess(res, lead);
  } catch (err: any) {
    return sendError(res, 'LEAD_FETCH_ERROR', err.message, 500);
  }
};

export const importLeads = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const { projectId, campaignId, confirm = 'false' } = req.body;

    if (!file) {
      return sendError(res, 'FILE_MISSING', 'Please upload an Excel (.xlsx) or CSV file', 400);
    }

    if (!projectId) {
      return sendError(res, 'PROJECT_MISSING', 'Target Project ID is required', 400);
    }

    // Verify project exists
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return sendError(res, 'PROJECT_NOT_FOUND', 'Selected project does not exist', 404);
    }

    // Parse & Validate Excel
    const parseResult = await excelService.parseLeadsExcel(file.buffer);

    // If confirm is false, return validation summary & preview
    if (confirm !== 'true') {
      return sendSuccess(
        res,
        {
          isDryRun: true,
          totalRows: parseResult.totalRows,
          validRows: parseResult.validRows,
          duplicatesCount: parseResult.duplicatesCount,
          errorsCount: parseResult.errorsCount,
          errors: parseResult.errors.slice(0, 10), // Return first 10 validation errors
          preview: parseResult.validRecords.slice(0, 5), // Preview first 5 rows
        },
        'Excel validated successfully'
      );
    }

    // Insert valid leads
    const insertedLeads = await prisma.$transaction(
      parseResult.validRecords.map((record) =>
        prisma.lead.create({
          data: {
            name: record.name,
            phone: record.phone,
            email: record.email,
            projectId,
            campaignId: campaignId || null,
            requirement: record.requirement,
            budget: record.budget,
            status: 'IMPORTED',
            source: 'EXCEL_IMPORT',
          },
        })
      )
    );

    // Update campaign lead count if campaignId is supplied
    if (campaignId) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          totalLeads: { increment: insertedLeads.length },
        },
      });
    }

    return sendSuccess(
      res,
      {
        isDryRun: false,
        importedCount: insertedLeads.length,
        duplicatesCount: parseResult.duplicatesCount,
        errorsCount: parseResult.errorsCount,
      },
      `Successfully imported ${insertedLeads.length} leads!`
    );
  } catch (err: any) {
    return sendError(res, 'IMPORT_FAILED', err.message, 500);
  }
};

export const updateLead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const lead = await prisma.lead.update({
      where: { id },
      data: req.body,
    });
    return sendSuccess(res, lead, 'Lead updated successfully');
  } catch (err: any) {
    return sendError(res, 'LEAD_UPDATE_ERROR', err.message, 500);
  }
};

export const deleteLead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.lead.delete({ where: { id } });
    return sendSuccess(res, { id }, 'Lead deleted successfully');
  } catch (err: any) {
    return sendError(res, 'LEAD_DELETE_ERROR', err.message, 500);
  }
};

