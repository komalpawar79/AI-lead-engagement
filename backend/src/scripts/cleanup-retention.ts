import prisma from '../prisma/client';
import retentionService from '../services/retention.service';

/**
 * CLI runner for database retention cleanup.
 *
 * Usage:
 *   npx ts-node-dev --transpile-only src/scripts/cleanup-retention.ts [--dry-run] [--days=180] [--batch-size=500]
 */
async function run() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  let days = retentionService.getRetentionDays();
  const daysArg = args.find((a) => a.startsWith('--days='));
  if (daysArg) {
    days = parseInt(daysArg.split('=')[1], 10);
  }

  let batchSize = retentionService.getBatchSize();
  const batchArg = args.find((a) => a.startsWith('--batch-size='));
  if (batchArg) {
    batchSize = parseInt(batchArg.split('=')[1], 10);
  }

  console.log('====================================================');
  console.log('  AI LEADENGAGE - RETENTION CLEANUP RUNNER');
  console.log('====================================================');
  console.log(`Retention Days : ${days}`);
  console.log(`Batch Size     : ${batchSize}`);
  console.log(`Dry Run Mode   : ${dryRun ? 'YES (Simulated)' : 'NO (Live Execution)'}`);
  console.log('====================================================\n');

  try {
    const result = await retentionService.executeRetentionCleanup({
      retentionDays: days,
      batchSize,
      dryRun,
    });

    console.log('\n--- CLEANUP SUMMARY ---');
    console.log(`Cutoff Date                : ${result.cutoffDate.toISOString()}`);
    console.log(`Eligible Conversations     : ${result.eligibleConversationsExamined}`);
    console.log(`Summaries Auto-Generated   : ${result.summariesGeneratedBeforeCleanup}`);
    console.log(`Messages Identified        : ${result.totalMessagesIdentified}`);
    console.log(`Messages Deleted           : ${result.totalMessagesDeleted}`);
    console.log(`Batches Processed          : ${result.batchesProcessed}`);
    console.log(`Dry Run                    : ${result.dryRun}`);
    console.log('-----------------------\n');
    console.log('Retention cleanup completed successfully.');
  } catch (err) {
    console.error('Retention cleanup failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

run();
