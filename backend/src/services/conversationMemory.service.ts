import prisma from '../prisma/client';
import logger from '../utils/logger';
import { ConversationMessageHistory } from '../ai/prompts';

export interface ConversationWindowResult {
  messages: any[];
  history: ConversationMessageHistory[];
  summary: string | null;
  totalCount: number;
  windowSize: number;
}

export class ConversationMemoryService {
  /**
   * Configurable chat history window size (default: 15 messages, range: 5 to 30)
   */
  public getWindowSize(): number {
    const parsed = parseInt(process.env.CHAT_HISTORY_WINDOW_SIZE || '15', 10);
    if (isNaN(parsed) || parsed < 5) return 15;
    return Math.min(parsed, 30);
  }

  /**
   * Configurable threshold to trigger rolling summarization (default: 20 messages)
   */
  public getSummaryTriggerThreshold(): number {
    const parsed = parseInt(process.env.SUMMARY_TRIGGER_THRESHOLD || '20', 10);
    if (isNaN(parsed) || parsed < 10) return 20;
    return parsed;
  }

  /**
   * Fetch the sliding window of latest messages and active conversation summary.
   * If older messages exist and summary is missing or outdated, triggers rolling summarization.
   */
  public async getConversationWindow(conversationId: string): Promise<ConversationWindowResult> {
    const windowSize = this.getWindowSize();
    const summaryThreshold = this.getSummaryTriggerThreshold();

    // 1. Fetch conversation metadata
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        lead: {
          include: { project: true },
        },
      },
    });

    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    // 2. Count total messages in conversation
    const totalCount = await prisma.message.count({
      where: { conversationId },
    });

    // 3. If within window size, return all messages chronologically
    if (totalCount <= windowSize) {
      const allMessages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { sentAt: 'asc' },
      });

      const history: ConversationMessageHistory[] = allMessages.map((m) => ({
        senderType: m.senderType as any,
        messageText: m.messageText,
        sentAt: m.sentAt,
      }));

      return {
        messages: allMessages,
        history,
        summary: conversation.summary || null,
        totalCount,
        windowSize,
      };
    }

    // 4. If messages exceed window size, fetch only the most recent N messages
    const recentMessages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { sentAt: 'desc' },
      take: windowSize,
    });

    // Reverse to chronological order (oldest to newest among the window)
    recentMessages.reverse();

    const oldestInWindow = recentMessages[0];

    let currentSummary = conversation.summary;

    // 5. Trigger rolling summarization if message count reached threshold
    // and older messages are not yet covered by lastSummarizedMessageId
    if (
      totalCount >= summaryThreshold &&
      oldestInWindow &&
      conversation.lastSummarizedMessageId !== oldestInWindow.id
    ) {
      try {
        currentSummary = await this.updateRollingSummary(
          conversation,
          oldestInWindow.id,
          currentSummary
        );
      } catch (err) {
        logger.error({ err, conversationId }, 'Failed to update rolling conversation summary');
      }
    }

    const history: ConversationMessageHistory[] = recentMessages.map((m) => ({
      senderType: m.senderType as any,
      messageText: m.messageText,
      sentAt: m.sentAt,
    }));

    return {
      messages: recentMessages,
      history,
      summary: currentSummary || null,
      totalCount,
      windowSize,
    };
  }

  /**
   * Condense messages that precede the sliding window into a compact rolling summary.
   * Ensures idempotency: avoids re-summarizing previously digested messages.
   */
  public async updateRollingSummary(
    conversation: any,
    cutoffMessageId: string,
    existingSummary?: string | null
  ): Promise<string> {
    const conversationId = conversation.id;

    // Get cutoff message timestamp
    const cutoffMsg = await prisma.message.findUnique({
      where: { id: cutoffMessageId },
    });

    if (!cutoffMsg) {
      return existingSummary || '';
    }

    // Fetch older messages up to and including the cutoff point
    const olderMessages = await prisma.message.findMany({
      where: {
        conversationId,
        sentAt: { lte: cutoffMsg.sentAt },
      },
      orderBy: { sentAt: 'asc' },
    });

    if (olderMessages.length === 0) {
      return existingSummary || '';
    }

    // Extract key customer attributes and conversational milestones
    const leadName = conversation.lead?.name || 'Customer';
    const projectName = conversation.lead?.project?.name || 'the project';

    const customerMessages = olderMessages.filter((m) => m.senderType === 'CUSTOMER');
    const aiMessages = olderMessages.filter((m) => m.senderType === 'AI');

    // Extract mentioned configuration
    let extractedConfig = conversation.lead?.configuration || null;
    if (!extractedConfig) {
      for (const m of customerMessages) {
        const match = m.messageText.match(/\b([1-5])\s*(?:bhk|bedroom|rk)\b/i);
        if (match) {
          extractedConfig = `${match[1]} BHK`;
          break;
        }
      }
    }

    // Extract mentioned budget
    let extractedBudget = conversation.lead?.budget
      ? `₹${(conversation.lead.budget / 10000000).toFixed(2)} Cr`
      : null;
    if (!extractedBudget) {
      for (const m of customerMessages) {
        const crMatch = m.messageText.match(/(\d+(?:\.\d+)?)\s*(?:cr|crore|crores)/i);
        if (crMatch) {
          extractedBudget = `₹${crMatch[1]} Cr`;
          break;
        }
        const lakhMatch = m.messageText.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lacs|lac)\b/i);
        if (lakhMatch) {
          extractedBudget = `₹${lakhMatch[1]} Lakhs`;
          break;
        }
      }
    }

    // Extract confirmed action or callback
    const actionTime = conversation.actionTime || null;
    const actionType = conversation.actionType || null;
    const actionConfirmed = conversation.actionConfirmed;

    // Extract key topics discussed
    const topics: string[] = [];
    if (extractedConfig) topics.push(`interested in ${extractedConfig}`);
    if (extractedBudget) topics.push(`budget ${extractedBudget}`);
    if (actionType === 'CALLBACK' && actionTime) {
      topics.push(`callback scheduled for ${actionTime}`);
    } else if (actionConfirmed) {
      topics.push('callback confirmed with sales team');
    }

    // Check if location or brochure was shared
    const hasSharedLocation = aiMessages.some(
      (m) => m.messageText.includes('maps.google') || m.messageText.includes('located at')
    );
    if (hasSharedLocation) topics.push('location details provided');

    // Build concise, structured summary
    const summaryParts: string[] = [];
    summaryParts.push(
      `${leadName} engaged regarding ${projectName}. (${olderMessages.length} earlier messages condensed).`
    );

    if (topics.length > 0) {
      summaryParts.push(`Key requirements: ${topics.join(', ')}.`);
    }

    if (conversation.status === 'IDLE' || conversation.status === 'CLOSED') {
      summaryParts.push(`Conversation state: ${conversation.status}.`);
    }

    const newSummary = summaryParts.join(' ');

    // Persist summary and update pointer in database
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        summary: newSummary,
        lastSummarizedMessageId: cutoffMessageId,
        summaryUpdatedAt: new Date(),
      },
    });

    logger.info(
      { conversationId, messagesSummarized: olderMessages.length, cutoffMessageId },
      'Rolling conversation summary updated successfully'
    );

    return newSummary;
  }
}

export const conversationMemoryService = new ConversationMemoryService();
export default conversationMemoryService;
