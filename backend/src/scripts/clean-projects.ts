import prisma from '../prisma/client';

async function main() {
  console.log('Cleaning up old dummy projects from database...');
  try {
    await prisma.followUp.deleteMany();
    await prisma.aIAnalysis.deleteMany();
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.campaign.deleteMany();
    await prisma.projectKnowledge.deleteMany();
    await prisma.configuration.deleteMany();
    const result = await prisma.project.deleteMany();
    console.log(`Successfully deleted ${result.count} old projects and all related records.`);
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

