import prisma from '../prisma/client';

async function audit() {
  console.log('--- AUDITING DATABASE ---');
  try {
    const leadCount = await prisma.lead.count();
    const conversationCount = await prisma.conversation.count();
    const messageCount = await prisma.message.count();
    const followUpCount = await prisma.followUp.count();
    const analysisCount = await prisma.aIAnalysis.count();
    const projectCount = await prisma.project.count();

    console.log(`Projects: ${projectCount}`);
    console.log(`Leads: ${leadCount}`);
    console.log(`Conversations: ${conversationCount}`);
    console.log(`Messages: ${messageCount}`);
    console.log(`FollowUps: ${followUpCount}`);
    console.log(`AIAnalyses: ${analysisCount}`);

    // Check duplicate externalMessageIds
    const duplicates = await prisma.message.groupBy({
      by: ['externalMessageId'],
      where: {
        externalMessageId: { not: null },
      },
      _count: {
        id: true,
      },
      having: {
        externalMessageId: {
          _count: { gt: 1 },
        },
      },
    });

    console.log(`Duplicate externalMessageId count: ${duplicates.length}`);
    if (duplicates.length > 0) {
      console.log('Sample duplicates:', duplicates.slice(0, 5));
    }
  } catch (error) {
    console.error('Audit error:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

audit();
