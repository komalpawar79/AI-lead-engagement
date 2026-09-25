import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { sendSuccess, sendError } from '../utils/response';

export const getDashboardSummary = async (_req: Request, res: Response) => {
  try {
    const totalLeads = await prisma.lead.count();

    // Messages sent count
    const messagesSent = await prisma.message.count({
      where: { senderType: 'AI' },
    });

    // Customer responses
    const responses = await prisma.message.count({
      where: { senderType: 'CUSTOMER' },
    });

    // Lead classifications
    const followUpLeads = await prisma.lead.count({
      where: { followUpRequired: true },
    });

    const interestedLeads = await prisma.lead.count({
      where: {
        interestLevel: { in: ['HIGH', 'MEDIUM'] },
      },
    });

    const notInterested = await prisma.lead.count({
      where: {
        OR: [{ status: 'NOT_INTERESTED' }, { interestLevel: 'NOT_INTERESTED' }],
      },
    });

    const noResponse = await prisma.lead.count({
      where: {
        status: { in: ['IMPORTED', 'PENDING', 'CONTACTED', 'NO_RESPONSE'] },
        followUpRequired: false,
      },
    });

    // Intent distribution, configurations, and budgets
    const analyses = await prisma.aIAnalysis.findMany({
      select: { intent: true, interestLevel: true, followUpReason: true, configuration: true, budget: true },
    });

    const intentCounts: Record<string, number> = {};
    const reasonCounts: Record<string, number> = {};
    const configCounts: Record<string, number> = {};
    const budgets: number[] = [];

    analyses.forEach((a) => {
      if (a.intent) {
        intentCounts[a.intent] = (intentCounts[a.intent] || 0) + 1;
      }
      if (a.followUpReason) {
        reasonCounts[a.followUpReason] = (reasonCounts[a.followUpReason] || 0) + 1;
      }
      if (a.configuration) {
        configCounts[a.configuration] = (configCounts[a.configuration] || 0) + 1;
      }
      if (a.budget && a.budget > 0) {
        budgets.push(a.budget);
      }
    });

    // Top 6 recent follow-up leads for dashboard preview
    const recentFollowUps = await prisma.followUp.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        lead: {
          include: {
            project: { select: { name: true } },
            analyses: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { configuration: true, budget: true, summary: true, callbackRequested: true },
            },
          },
        },
      },
    });

    // Format preview items (provide both leadName and name)
    const followUpPreview = recentFollowUps.map((f) => ({
      id: f.id,
      leadId: f.lead.id,
      name: f.lead.name,
      leadName: f.lead.name,
      phone: f.lead.phone,
      projectName: f.lead.project?.name || 'Project',
      requirement: f.lead.configuration || f.lead.analyses[0]?.configuration || 'Standard Unit',
      budget: f.lead.budget || f.lead.analyses[0]?.budget || null,
      interestLevel: f.lead.interestLevel,
      reason: f.reason,
      priority: f.priority,
      status: f.status,
      callbackRequested: f.lead.analyses[0]?.callbackRequested || false,
      createdAt: f.createdAt,
    }));

    const conversionRate = totalLeads > 0 ? ((followUpLeads / totalLeads) * 100).toFixed(1) : '0';
    const responseRate = messagesSent > 0 ? ((responses / messagesSent) * 100).toFixed(1) : '0';

    // Truly dynamic AI insights computed from database records
    const topReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const topConfig = Object.entries(configCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const avgBudget = budgets.length > 0 ? budgets.reduce((a, b) => a + b, 0) / budgets.length : null;

    const insights = [
      {
        id: '1',
        title: 'Follow-Up Extraction & Conversion',
        description:
          followUpLeads > 0
            ? `${followUpLeads} high-intent lead(s) extracted for human presales handoff (${conversionRate}% extraction rate). ${
                topReason ? `Top customer driver: ${topReason}.` : ''
              }`
            : totalLeads > 0
            ? `0 follow-up leads extracted so far across ${totalLeads} lead(s). AI awaits customer responses to qualify intent.`
            : 'No leads currently in system. Upload an Excel lead list to begin AI engagement.',
        type: 'POSITIVE',
      },
      {
        id: '2',
        title: 'Inventory & Configuration Demand',
        description:
          topConfig
            ? `${topConfig} is currently the most inquired configuration among leads.${
                avgBudget ? ` Average customer budget detected is ₹${(avgBudget / 100000).toFixed(1)} Lakhs.` : ''
              }`
            : 'As leads converse with the AI, preferred configurations (e.g. 2 BHK, 3 BHK) and budgets will synthesize here.',
        type: 'INSIGHT',
      },
      {
        id: '3',
        title: 'Automated Presales Efficiency',
        description:
          messagesSent + responses > 0
            ? `AI has handled ${messagesSent + responses} real-time conversation messages, automatically separating serious buyers from cold non-responses.`
            : 'Automated WhatsApp AI outreach eliminates manual cold-calling by filtering uninterested contacts before sales handoff.',
        type: 'EFFICIENCY',
      },
    ];

    return sendSuccess(res, {
      metrics: {
        totalLeads,
        messagesSent,
        responses,
        interestedLeads,
        followUpLeads, // Hero metric
        notInterested,
        noResponse,
        conversionRate,
        responseRate,
      },
      intentDistribution: Object.entries(intentCounts).map(([intent, count]) => ({
        intent: intent.replace(/_/g, ' '),
        count,
      })),
      followUpPreview,
      insights,
    });
  } catch (err: any) {
    return sendError(res, 'DASHBOARD_ERROR', err.message, 500);
  }
};

export const getDashboardActivity = async (_req: Request, res: Response) => {
  try {
    const recentMessages = await prisma.message.findMany({
      take: 10,
      orderBy: { sentAt: 'desc' },
      include: {
        conversation: {
          include: {
            lead: { select: { name: true, phone: true, project: { select: { name: true } } } },
          },
        },
      },
    });

    const activities = recentMessages.map((m) => ({
      id: m.id,
      leadName: m.conversation.lead.name,
      projectName: m.conversation.lead.project.name,
      senderType: m.senderType,
      messageText: m.messageText,
      timestamp: m.sentAt,
      deliveryStatus: m.deliveryStatus,
    }));

    return sendSuccess(res, activities);
  } catch (err: any) {
    return sendError(res, 'ACTIVITY_ERROR', err.message, 500);
  }
};

