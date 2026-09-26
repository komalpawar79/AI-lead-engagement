import prisma from '../prisma/client';
import conversationService from '../services/conversation.service';
import conversationEngine from '../ai/conversationEngine';

async function testUserScenario() {
  console.log('====================================================');
  console.log('  TESTING EXACT USER SCENARIO (5 o clock & "ohk")');
  console.log('====================================================\n');

  let project = await prisma.project.findFirst({
    include: { inventory: true },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        name: 'THE DOMUS 360',
        developer: 'Test Builders',
        location: 'Kharghar railway station',
        propertyType: 'RESIDENTIAL',
        configurations: '2 BHK, 3 BHK',
        priceMin: 18000000,
        priceMax: 30000000,
      },
      include: { inventory: true },
    });
  }

  const testSuffix = Date.now().toString().slice(-5);
  const lead = await prisma.lead.create({
    data: {
      name: `Rahul Sharma (Test Lead)`,
      phone: `+919876${testSuffix}`,
      projectId: project.id,
      status: 'RESPONDED',
    },
  });

  const conversation = await prisma.conversation.create({
    data: {
      leadId: lead.id,
      projectId: project.id,
      channel: 'TEST',
      status: 'ACTIVE',
    },
  });

  const steps = [
    { input: 'looking for 2bhk', label: 'BHK Inquiry' },
    { input: '1.50 cr', label: 'Budget Update' },
    { input: 'yes', label: 'Agree to Callback Offer' },
    { input: '5 o clock', label: 'Provide Callback Time ("5 o clock")' },
    { input: 'what is carpet area?', label: 'Ask Carpet Area' },
    { input: 'send me location', label: 'Ask Location' },
    { input: 'where is your office located?', label: 'Ask Office Location' },
    { input: 'ohk', label: 'Customer Says "ohk"' },
  ];

  let lastReply = '';
  for (const step of steps) {
    console.log(`\n--- Step: ${step.label} ---`);
    console.log(`Customer: "${step.input}"`);

    const result = await conversationService.handleIncomingMessage({
      leadId: lead.id,
      messageText: step.input,
      senderType: 'CUSTOMER',
      channel: 'TEST',
    });

    lastReply = result.aiMessage?.messageText || '[NO REPLY]';
    console.log(`Aria: "${lastReply}"`);
    console.log(`Intent: ${result.decision?.intent}, Action: ${result.decision?.proposedAction?.type}`);

    if (step.input === '5 o clock') {
      const mentionsTime = lastReply.toLowerCase().includes('5:00') || lastReply.toLowerCase().includes('5 pm');
      if (mentionsTime) {
        console.log('  ✅ SUCCESS: "5 o clock" resolved to specific 5:00 PM time!');
      } else {
        console.error(`  ❌ FAILED: "5 o clock" was not resolved properly (got: "${lastReply}")`);
      }
    }

    if (step.input === 'ohk') {
      const isBadGreeting = lastReply.includes('How can I assist you with');
      const isGoodClosing =
        lastReply.toLowerCase().includes('welcome') ||
        lastReply.toLowerCase().includes('great') ||
        lastReply.toLowerCase().includes('connect with you') ||
        lastReply.toLowerCase().includes('glad to help') ||
        lastReply.toLowerCase().includes('feel free');

      if (!isBadGreeting && isGoodClosing) {
        console.log('  ✅ SUCCESS: "ohk" was properly acknowledged with polite closing!');
        console.log('  ✅ SUCCESS: Did NOT repeat opening greeting "How can I assist you today?"');
      } else {
        console.error(`  ❌ FAILED: Unexpected reply for "ohk": "${lastReply}"`);
      }
    }
  }

  // Cleanup test lead
  await prisma.followUp.deleteMany({ where: { leadId: lead.id } });
  await prisma.aIAnalysis.deleteMany({ where: { leadId: lead.id } });
  await prisma.message.deleteMany({ where: { conversationId: conversation.id } });
  await prisma.conversation.deleteMany({ where: { id: conversation.id } });
  await prisma.lead.deleteMany({ where: { id: lead.id } });

  console.log('\n====================================================');
  console.log('  SCENARIO TEST COMPLETED');
  console.log('====================================================\n');
}

testUserScenario().finally(() => prisma.$disconnect());
