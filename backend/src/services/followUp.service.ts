import prisma from '../prisma/client';
import logger from '../utils/logger';
import { FollowUpExportData } from '../excel/excel.service';

class FollowUpService {
  /**
   * Record or update a follow-up action for a qualified lead
   */
  public async createOrUpdateFollowUp(
    leadId: string,
    conversationId: string,
    reason: string,
    priority: 'LOW' | 'MEDIUM' | 'HIGH' = 'HIGH'
  ) {
    // Check if an existing pending follow up exists
    const existing = await prisma.followUp.findFirst({
      where: { leadId, status: 'PENDING' },
    });

    if (existing) {
      return await prisma.followUp.update({
        where: { id: existing.id },
        data: {
          reason,
          priority,
          conversationId,
          updatedAt: new Date(),
        },
      });
    }

    const followUp = await prisma.followUp.create({
      data: {
        leadId,
        conversationId,
        reason,
        priority,
        status: 'PENDING',
      },
      include: {
        lead: true,
      },
    });

    // Create system notification
    await prisma.notification.create({
      data: {
        type: 'FOLLOW_UP_IDENTIFIED',
        title: 'New Follow-up Lead Identified',
        message: `${followUp.lead.name} requires follow-up: ${reason}`,
      },
    });

    logger.info({ leadId, reason }, 'Follow-up lead record successfully created');
    return followUp;
  }

  /**
   * Get all follow up records with related lead, project, and analysis data
   */
  public async getFollowUps(filterStatus?: string) {
    return await prisma.followUp.findMany({
      where: filterStatus ? { status: filterStatus } : undefined,
      include: {
        lead: {
          include: {
            project: true,
            analyses: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
        conversation: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get formatted follow up data for Excel export
   */
  public async getFollowUpsForExport(): Promise<FollowUpExportData[]> {
    const list = await prisma.followUp.findMany({
      where: {
        lead: {
          followUpRequired: true,
        },
      },
      include: {
        lead: {
          include: {
            project: true,
            analyses: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return list.map((f) => {
      const analysis = f.lead.analyses[0];
      return {
        id: f.id,
        leadName: f.lead.name,
        phone: f.lead.phone,
        email: f.lead.email,
        projectName: f.lead.project.name,
        requirement: f.lead.requirement,
        configuration: f.lead.configuration || analysis?.configuration || null,
        budget: f.lead.budget || analysis?.budget || null,
        interestLevel: f.lead.interestLevel || analysis?.interestLevel || 'HIGH',
        followUpReason: f.reason,
        summary: analysis?.summary || null,
        callbackRequested: analysis?.callbackRequested || false,
        siteVisitRequested: analysis?.siteVisitRequested || false,
        priority: f.priority,
        status: f.status,
        createdAt: f.createdAt,
      };
    });
  }
}

export const followUpService = new FollowUpService();
export default followUpService;

