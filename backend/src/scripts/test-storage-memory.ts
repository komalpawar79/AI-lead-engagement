import prisma from '../prisma/client';
import conversationMemoryService from '../services/conversationMemory.service';
import conversationService from '../services/conversation.service';
import retentionService from '../services/retention.service';
import whatsappService from '../whatsapp/whatsapp.service';
import { formatConversationHistory } from '../ai/prompts';

async function runTestSuite() {
  console.log('====================================================');
  console.log('  RUNNING AI STORAGE, MEMORY & RETENTION TEST SUITE');
  console.log('====================================================\n');

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failedTests++;
    }
  }

  // Find or create a test project
  let project = await prisma.project.findFirst({
    include: { inventory: true },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        name: 'TEST RESIDENCY',
        developer: 'Test Builders',
        location: 'Bandra West, Mumbai',
        propertyType: 'RESIDENTIAL',
        configurations: '2 BHK, 3 BHK',
        priceMin: 15000000,
        priceMax: 30000000,
      },
      include: { inventory: true },
    });
  }

  const testSuffix = Date.now().toString().slice(-6);

  try {
    // =========================================================================
    // TEST 1: RECENT MESSAGE SLIDING WINDOWING (Window Size = 15)
    // =========================================================================
    console.log('\n[TEST 1] Verifying Sliding Window Retrieval (15 latest messages from 25)...');
    
    // Create test lead & conversation
    const lead1 = await prisma.lead.create({
      data: {
        name: `Test User ${testSuffix}`,
        phone: `+919999${testSuffix}`,
        projectId: project.id,
        status: 'RESPONDED',
        configuration: '2 BHK',
        budget: 15000000,
      },
    });

    const conv1 = await prisma.conversation.create({
      data: {
        leadId: lead1.id,
        projectId: project.id,
        channel: 'TEST',
        status: 'ACTIVE',
      },
    });

    // Insert 25 sequential messages (simulating a long chat)
    const baseTime = Date.now() - 25 * 60 * 1000;
    const insertedMessages: any[] = [];
    for (let i = 1; i <= 25; i++) {
      const msg = await prisma.message.create({
        data: {
          conversationId: conv1.id,
          senderType: i % 2 === 1 ? 'CUSTOMER' : 'AI',
          messageText: `Message turn #${i}: ${i % 2 === 1 ? 'Customer inquiry details' : 'AI response details'}`,
          sentAt: new Date(baseTime + i * 60 * 1000),
        },
      });
      insertedMessages.push(msg);
    }

    const window1 = await conversationMemoryService.getConversationWindow(conv1.id);
    assert(window1.totalCount === 25, `Total messages counted correctly: 25`);
    assert(window1.messages.length === 15, `Sliding window returned exactly 15 messages (got ${window1.messages.length})`);
    assert(window1.history.length === 15, `History array contains exactly 15 messages`);
    assert(
      window1.messages[0].messageText.includes('turn #11'),
      `Oldest message in window is turn #11 (start of latest 15): ${window1.messages[0].messageText}`
    );
    assert(
      window1.messages[14].messageText.includes('turn #25'),
      `Newest message in window is turn #25: ${window1.messages[14].messageText}`
    );

    // =========================================================================
    // TEST 2: ROLLING CONVERSATION SUMMARY GENERATION & IDEMPOTENCY
    // =========================================================================
    console.log('\n[TEST 2] Verifying Rolling Summary Generation & Idempotency...');
    
    // The threshold is 20, and we have 25 messages, so updateRollingSummary should condense older messages
    assert(window1.summary !== null, 'Rolling summary was generated and attached');
    assert(
      Boolean(window1.summary?.includes('Test User') && window1.summary?.includes('earlier messages condensed')),
      `Summary contains lead name and condensation marker: "${window1.summary}"`
    );

    // Verify conversation record in DB now has the summary and lastSummarizedMessageId
    const conv1FromDb = await prisma.conversation.findUnique({
      where: { id: conv1.id },
    });
    assert(conv1FromDb?.summary === window1.summary, 'Summary persisted in database on Conversation record');
    assert(conv1FromDb?.lastSummarizedMessageId !== null, `lastSummarizedMessageId recorded: ${conv1FromDb?.lastSummarizedMessageId}`);

    // Verify formatting with summary
    const formattedHistory = formatConversationHistory(window1.history, window1.summary);
    assert(
      formattedHistory.includes('PREVIOUS CONVERSATION CONTEXT & SUMMARY') &&
        formattedHistory.includes('RECENT CONVERSATION HISTORY'),
      'formatConversationHistory combines rolling summary + recent history properly'
    );

    // =========================================================================
    // TEST 3: DATABASE-LEVEL IDEMPOTENCY & DUPLICATE WEBHOOK MESSAGE REJECTION
    // =========================================================================
    console.log('\n[TEST 3] Verifying Duplicate Webhook Rejection & Idempotency...');

    const uniqueWaId = `wamid.HBgL${testSuffix}_idempotency_test`;

    // Process incoming message 1
    const res1 = await conversationService.handleIncomingMessage({
      leadId: lead1.id,
      messageText: 'Hello, what are the amenities?',
      senderType: 'CUSTOMER',
      channel: 'TEST',
      externalMessageId: uniqueWaId,
    });

    assert(res1.isDuplicate !== true, 'First message processed successfully (isDuplicate = false)');
    assert(res1.customerMessage.externalMessageId === uniqueWaId, 'externalMessageId stored on customer message');

    // Attempt to process EXACT SAME message ID again (simulating Meta webhook retry)
    const res2 = await conversationService.handleIncomingMessage({
      leadId: lead1.id,
      messageText: 'Hello, what are the amenities?',
      senderType: 'CUSTOMER',
      channel: 'TEST',
      externalMessageId: uniqueWaId,
    });

    assert(res2.isDuplicate === true, 'Duplicate webhook message correctly detected and dropped (isDuplicate = true)');
    assert(res2.aiMessage === null, 'No duplicate AI reply was sent for duplicate webhook');

    // Verify database row count for this externalMessageId is strictly 1
    const countWithExternalId = await prisma.message.count({
      where: { externalMessageId: uniqueWaId },
    });
    assert(countWithExternalId === 1, `Database constraint prevented duplicate record (count = ${countWithExternalId})`);

    // =========================================================================
    // TEST 4: WHATSAPP DELIVERY STATUS PARSING & UPDATES
    // =========================================================================
    console.log('\n[TEST 4] Verifying WhatsApp Delivery Status Updates...');

    const mockMetaPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: '123456789',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                statuses: [
                  {
                    id: uniqueWaId,
                    status: 'delivered',
                    timestamp: '1727337600',
                    recipient_id: lead1.phone,
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    const parsedStatuses = whatsappService.parseInboundStatuses(mockMetaPayload);
    assert(parsedStatuses.length === 1, 'whatsappService parsed status event from payload');
    assert(parsedStatuses[0].status === 'DELIVERED', `Parsed status is DELIVERED (got ${parsedStatuses[0].status})`);

    await prisma.message.updateMany({
      where: { externalMessageId: parsedStatuses[0].messageId },
      data: { deliveryStatus: parsedStatuses[0].status },
    });

    const updatedMsg = await prisma.message.findUnique({
      where: { externalMessageId: uniqueWaId },
    });
    assert(updatedMsg?.deliveryStatus === 'DELIVERED', `Message deliveryStatus updated to DELIVERED in database`);

    // =========================================================================
    // TEST 5: RETENTION CLEANUP SAFETY RULES & EXCLUSIONS
    // =========================================================================
    console.log('\n[TEST 5] Verifying Data Retention Safety Rules & Exclusions...');

    // Scenario A: ACTIVE conversation with messages older than 200 days -> MUST NOT be deleted
    const oldDate = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000);
    const activeLead = await prisma.lead.create({
      data: {
        name: `Active Lead ${testSuffix}`,
        phone: `+918888${testSuffix}`,
        projectId: project.id,
        status: 'RESPONDED',
      },
    });

    const activeConv = await prisma.conversation.create({
      data: {
        leadId: activeLead.id,
        projectId: project.id,
        channel: 'TEST',
        status: 'ACTIVE', // ACTIVE status protects it
      },
    });

    const activeOldMsg = await prisma.message.create({
      data: {
        conversationId: activeConv.id,
        senderType: 'CUSTOMER',
        messageText: 'Old message in active conversation',
        sentAt: oldDate,
      },
    });

    // Scenario B: IDLE conversation WITH PENDING FollowUp -> MUST NOT be deleted
    const pendingConv = await prisma.conversation.create({
      data: {
        leadId: activeLead.id,
        projectId: project.id,
        channel: 'TEST',
        status: 'IDLE',
        actionStatus: 'CONFIRMED',
      },
    });

    await prisma.followUp.create({
      data: {
        leadId: activeLead.id,
        conversationId: pendingConv.id,
        reason: 'Callback scheduled',
        priority: 'HIGH',
        status: 'PENDING', // PENDING status protects it
      },
    });

    const pendingOldMsg = await prisma.message.create({
      data: {
        conversationId: pendingConv.id,
        senderType: 'CUSTOMER',
        messageText: 'Old message in pending callback conversation',
        sentAt: oldDate,
      },
    });

    // Scenario C: Truly CLOSED conversation with no pending followups -> ELIGIBLE
    const closedConv = await prisma.conversation.create({
      data: {
        leadId: activeLead.id,
        projectId: project.id,
        channel: 'TEST',
        status: 'CLOSED',
        actionStatus: 'COMPLETED',
      },
    });

    const eligibleOldMsg = await prisma.message.create({
      data: {
        conversationId: closedConv.id,
        senderType: 'CUSTOMER',
        messageText: 'Old message in fully closed conversation',
        sentAt: oldDate,
      },
    });

    // Execute retention cleanup in live mode (retentionDays = 180)
    const cleanupResult = await retentionService.executeRetentionCleanup({
      retentionDays: 180,
      batchSize: 100,
      dryRun: false,
    });

    // Verify Active Conversation message still exists!
    const activeMsgCheck = await prisma.message.findUnique({
      where: { id: activeOldMsg.id },
    });
    assert(activeMsgCheck !== null, 'ACTIVE conversation message was PROTECTED and NOT deleted');

    // Verify Pending FollowUp conversation message still exists!
    const pendingMsgCheck = await prisma.message.findUnique({
      where: { id: pendingOldMsg.id },
    });
    assert(pendingMsgCheck !== null, 'Conversation with PENDING follow-up was PROTECTED and NOT deleted');

    // Verify Eligible closed conversation message WAS deleted!
    const eligibleMsgCheck = await prisma.message.findUnique({
      where: { id: eligibleOldMsg.id },
    });
    assert(eligibleMsgCheck === null, 'Eligible closed conversation message older than 180 days was safely DELETED');

    // Verify closed conversation now has a summary generated
    const closedConvAfter = await prisma.conversation.findUnique({
      where: { id: closedConv.id },
    });
    assert(closedConvAfter?.summary !== null, 'Summary was preserved for closed conversation before deletion');

    // =========================================================================
    // CLEANUP TEST FIXTURES
    // =========================================================================
    console.log('\n[CLEANUP] Cleaning up test fixtures...');
    await prisma.followUp.deleteMany({ where: { leadId: { in: [lead1.id, activeLead.id] } } });
    await prisma.aIAnalysis.deleteMany({ where: { leadId: { in: [lead1.id, activeLead.id] } } });
    await prisma.message.deleteMany({
      where: {
        conversationId: { in: [conv1.id, activeConv.id, pendingConv.id, closedConv.id] },
      },
    });
    await prisma.conversation.deleteMany({
      where: { id: { in: [conv1.id, activeConv.id, pendingConv.id, closedConv.id] } },
    });
    await prisma.lead.deleteMany({ where: { id: { in: [lead1.id, activeLead.id] } } });
    console.log('  Cleaned up all temporary test fixtures.');

    console.log('\n====================================================');
    console.log(`TEST SUITE RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('====================================================\n');

    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test suite failed with unexpected error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTestSuite();
