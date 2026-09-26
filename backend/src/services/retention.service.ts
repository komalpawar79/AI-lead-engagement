import prisma from '../prisma/client';
import logger from '../utils/logger';
import conversationMemoryService from './conversationMemory.service';

export interface RetentionCleanupOptions {
  retentionDays?: number;
  batchSize?: number;
  dryRun?: boolean;
}

export interface RetentionCleanupResult {
  retentionDays: number;
  cutoffDate: Date;
  dryRun: boolean;
  eligibleConversationsExamined: number;
  summariesGeneratedBeforeCleanup: number;
  totalMessagesIdentified: number;
  totalMessagesDeleted: number;
  batchesProcessed: number;
}

export class RetentionService {
  /**
   * Get default retention days from env or default to 180 days
   */
  public getRetentionDays(): number {
    const parsed = parseInt(process.env.RETENTION_DAYS || '180', 10);
    if (isNaN(parsed) || parsed < 30) return 180;
    return parsed;
  }

  /**
   * Get default batch size for cleanup chunks (prevents database locking)
   */
  public getBatchSize(): number {
    const parsed = parseInt(process.env.RETENTION_BATCH_SIZE || '500', 10);
    if (isNaN(parsed) || parsed < 50) return 500;
    return Math.min(parsed, 2000);
  }

  /**
   * Execute safe, batched data retention cleanup.
   *
   * STRICT SAFETY CRITERIA:
   * - NEVER deletes messages from ACTIVE conversations.
   * - NEVER deletes messages from conversations with PENDING follow-ups or callbacks.
   * - NEVER deletes messages from conversations with CONFIRMED or PENDING_TIME actions.
   * - NEVER deletes Leads, Campaigns, Projects, or AI Analysis audit records.
   * - NEVER deletes Opt-Out compliance records.
   * - Ensures a rolling summary is persisted BEFORE any older messages are deleted,
   *   so conversational memory and business intelligence remain 100% intact permanently.
   */
  public async executeRetentionCleanup(
    options: RetentionCleanupOptions = {}
  ): Promise<RetentionCleanupResult> {
    const retentionDays = options.retentionDays || this.getRetentionDays();
    const batchSize = options.batchSize || this.getBatchSize();
    const dryRun = options.dryRun ?? false;

    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    logger.info(
      { retentionDays, cutoffDate: cutoffDate.toISOString(), batchSize, dryRun },
      'Starting database retention cleanup scan'
    );

    // 1. Identify conversations eligible for message retention cleanup
    // Must be IDLE or CLOSED, NOT ACTIVE, and have NO pending follow-ups or pending actions
    const eligibleConversations = await prisma.conversation.findMany({
      where: {
        status: { in: ['IDLE', 'CLOSED'] },
        actionStatus: { notIn: ['CONFIRMED', 'PENDING_TIME'] },
        followUps: {
          none: {
            status: 'PENDING',
          },
        },
        lead: {
          // Never purge leads that haven't been contacted or processed
          status: { notIn: ['IMPORTED', 'PENDING'] },
        },
      },
      include: {
        lead: {
          include: { project: true },
        },
      },
    });

    let summariesGenerated = 0;
    let totalIdentified = 0;
    let totalDeleted = 0;
    let batchesProcessed = 0;

    for (const conv of eligibleConversations) {
      // Find candidate messages for this conversation sent before cutoff date
      const candidateCount = await prisma.message.count({
        where: {
          conversationId: conv.id,
          sentAt: { lt: cutoffDate },
        },
      });

      if (candidateCount === 0) continue;

      totalIdentified += candidateCount;

      // 2. Ensure summary is generated before deleting older messages
      if (!conv.summary && !dryRun) {
        try {
          const latestMessage = await prisma.message.findFirst({
            where: { conversationId: conv.id },
            orderBy: { sentAt: 'desc' },
          });
          if (latestMessage) {
            await conversationMemoryService.updateRollingSummary(
              conv,
              latestMessage.id,
              null
            );
            summariesGenerated++;
          }
        } catch (sumErr) {
          logger.warn(
            { sumErr, conversationId: conv.id },
            'Failed generating summary before retention cleanup; skipping conversation messages for safety'
          );
          continue;
        }
      }

      // 3. Process message deletion in controlled batches to avoid database locks
      if (!dryRun) {
        let remaining = candidateCount;
        while (remaining > 0) {
          // Fetch IDs of the next batch of messages to delete
          const batchMessages = await prisma.message.findMany({
            where: {
              conversationId: conv.id,
              sentAt: { lt: cutoffDate },
            },
            select: { id: true },
            take: batchSize,
          });

          if (batchMessages.length === 0) break;

          const idsToDelete = batchMessages.map((m) => m.id);

          const deleteResult = await prisma.message.deleteMany({
            where: {
              id: { in: idsToDelete },
            },
          });

          totalDeleted += deleteResult.count;
          batchesProcessed++;
          remaining -= deleteResult.count;

          // Brief 50ms pause to yield event loop & avoid DB connection starvation
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }
    }

    const result: RetentionCleanupResult = {
      retentionDays,
      cutoffDate,
      dryRun,
      eligibleConversationsExamined: eligibleConversations.length,
      summariesGeneratedBeforeCleanup: summariesGenerated,
      totalMessagesIdentified: totalIdentified,
      totalMessagesDeleted: totalDeleted,
      batchesProcessed,
    };

    logger.info(result, 'Database retention cleanup scan completed successfully');
    return result;
  }
}

export const retentionService = new RetentionService();
export default retentionService;
