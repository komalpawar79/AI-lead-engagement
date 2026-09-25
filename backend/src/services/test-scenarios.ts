import prisma from '../prisma/client';
import conversationService from './conversation.service';
import conversationEngine from '../ai/conversationEngine';
import projectKnowledgeService from './projectKnowledge.service';

async function runScenarioTests() {
  console.log('===============================================================');
  console.log('STARTING CONVERSATION ENGINE AUTOMATED TEST SUITE (SCENARIOS A - G)');
  console.log('===============================================================\n');

  // Find or create a test project
  let project = await prisma.project.findFirst({
    include: { inventory: true, knowledge: true },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        name: 'The Crown Residences',
        developer: 'Lodha Group',
        location: 'Thane West, Mumbai',
        fullAddress: 'Pokhran Road No. 2, Thane West, Maharashtra 400601',
        googleMapsUrl: 'https://maps.google.com/?q=The+Crown+Residences+Thane',
        configurations: '2 BHK, 3 BHK',
        priceMin: 18000000,
        priceMax: 35000000,
        inventory: {
          create: [
            {
              type: '2 BHK',
              carpetAreaSqft: 750,
              startingPrice: 18000000,
              priceDisplay: '₹1.80 Cr',
              bathrooms: 2,
              balconies: 1,
              availabilityStatus: 'AVAILABLE',
            },
            {
              type: '3 BHK',
              carpetAreaSqft: 1100,
              startingPrice: 26000000,
              priceDisplay: '₹2.60 Cr',
              bathrooms: 3,
              balconies: 2,
              availabilityStatus: 'AVAILABLE',
            },
          ],
        },
      },
      include: { inventory: true, knowledge: true },
    });
  }

  const projectContext = await projectKnowledgeService.getProjectContext(project.id);
  if (!projectContext) throw new Error('Failed to load project context');

  let passedTests = 0;
  let totalTests = 8;

  // --------------------------------------------------------------------------
  // SCENARIO A: Callback confirmation -> Thank you -> You're welcome -> Ok -> no unnecessary repeated callback confirmation
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO A: Repetitive Response Prevention (Thank you -> You\'re welcome -> Ok -> NO_REPLY) ---');
  {
    const leadA = await prisma.lead.create({
      data: {
        name: 'Rahul Sharma',
        phone: '919876500001',
        projectId: project.id,
        source: 'TEST',
        status: 'INTERESTED',
      },
    });

    const convA = await prisma.conversation.create({
      data: {
        leadId: leadA.id,
        channel: 'TEST',
        status: 'ACTIVE',
      },
    });

    // Step 1: Customer: "I am looking for a 2 BHK."
    const res1 = await conversationService.handleIncomingMessage({
      leadId: leadA.id,
      messageText: 'I am looking for a 2 BHK.',
      senderType: 'CUSTOMER',
    });
    console.log('Customer: I am looking for a 2 BHK.');
    console.log('Aria:', res1.aiMessage?.messageText);

    // Step 2: Customer: "My budget is ₹1.50 Cr."
    const res2 = await conversationService.handleIncomingMessage({
      leadId: leadA.id,
      messageText: 'My budget is ₹1.50 Cr.',
      senderType: 'CUSTOMER',
    });
    console.log('Customer: My budget is ₹1.50 Cr.');
    console.log('Aria:', res2.aiMessage?.messageText);

    // Step 3: Customer: "Yes."
    const res3 = await conversationService.handleIncomingMessage({
      leadId: leadA.id,
      messageText: 'Yes.',
      senderType: 'CUSTOMER',
    });
    console.log('Customer: Yes.');
    console.log('Aria:', res3.aiMessage?.messageText);

    // Step 4: Customer: "Today around 6:30 PM."
    const res4 = await conversationService.handleIncomingMessage({
      leadId: leadA.id,
      messageText: 'Today around 6:30 PM.',
      senderType: 'CUSTOMER',
    });
    console.log('Customer: Today around 6:30 PM.');
    console.log('Aria:', res4.aiMessage?.messageText);

    // Step 5: Customer: "Thank you."
    const res5 = await conversationService.handleIncomingMessage({
      leadId: leadA.id,
      messageText: 'Thank you.',
      senderType: 'CUSTOMER',
    });
    console.log('Customer: Thank you.');
    console.log('Aria:', res5.aiMessage?.messageText);

    // Step 6: Customer: "Ok."
    const res6 = await conversationService.handleIncomingMessage({
      leadId: leadA.id,
      messageText: 'Ok.',
      senderType: 'CUSTOMER',
    });
    console.log('Customer: Ok.');
    console.log('Aria:', res6.aiMessage ? res6.aiMessage.messageText : '[NO_REPLY / Message Suppressed]');

    // Assertions
    const step4Confirmed = res4.aiMessage?.messageText.toLowerCase().includes('6:30 pm');
    const step5Welcome = res5.aiMessage?.messageText.toLowerCase().includes("welcome");
    const step5NotRepeat = !res5.aiMessage?.messageText.toLowerCase().includes('will call you');
    const step6NoReply = res6.aiMessage === null;

    if (step4Confirmed && step5Welcome && step5NotRepeat && step6NoReply) {
      console.log('✅ SCENARIO A PASSED: Callback confirmed -> Welcome sent -> Ok suppressed cleanly without repeat.');
      passedTests++;
    } else {
      console.error('❌ SCENARIO A FAILED:', { step4Confirmed, step5Welcome, step5NotRepeat, step6NoReply });
    }
  }

  // --------------------------------------------------------------------------
  // SCENARIO B: Callback confirmation -> customer asks a new pricing question -> AI answers new question
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO B: Callback Confirmed -> New Pricing Question Answered ---');
  {
    const leadB = await prisma.lead.create({
      data: {
        name: 'Pooja Verma',
        phone: '919876500002',
        projectId: project.id,
        source: 'TEST',
        status: 'FOLLOW_UP',
      },
    });

    const convB = await prisma.conversation.create({
      data: {
        leadId: leadB.id,
        channel: 'TEST',
        status: 'ACTIVE',
        actionType: 'CALLBACK',
        actionStatus: 'CONFIRMED',
        actionTime: 'today at 6:30 PM',
        actionConfirmed: true,
        lastAssistantAction: 'CONFIRMED_CALLBACK',
      },
    });

    // Customer asks new pricing question
    const resB = await conversationService.handleIncomingMessage({
      leadId: leadB.id,
      messageText: 'What is the price of 3 BHK?',
      senderType: 'CUSTOMER',
    });
    console.log('Customer: What is the price of 3 BHK?');
    console.log('Aria:', resB.aiMessage?.messageText);

    const config3Bhk = project.inventory?.find((c) => c.type.toLowerCase().includes('3 bhk')) || { priceDisplay: 'Cr' };
    const answeredPrice =
      resB.aiMessage?.messageText.toLowerCase().includes('3 bhk') &&
      (resB.aiMessage?.messageText.includes(config3Bhk.priceDisplay) ||
        resB.aiMessage?.messageText.includes('Cr'));
    const didNotRepeatCallback = !resB.aiMessage?.messageText.toLowerCase().includes('will call you today at 6:30 pm');

    if (answeredPrice && didNotRepeatCallback) {
      console.log('✅ SCENARIO B PASSED: Aria accurately answered 3 BHK price and did NOT repeat callback confirmation.');
      passedTests++;
    } else {
      console.error('❌ SCENARIO B FAILED:', { answeredPrice, didNotRepeatCallback });
    }
  }

  // --------------------------------------------------------------------------
  // SCENARIO C: Customer says "Ok" when asked whether they want a callback -> callback correctly requested
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO C: Contextual "Ok" to Callback Offer -> Callback Requested & Time Asked ---');
  {
    const leadC = await prisma.lead.create({
      data: {
        name: 'Amit Patel',
        phone: '919876500003',
        projectId: project.id,
        source: 'TEST',
        status: 'INTERESTED',
      },
    });

    const convC = await prisma.conversation.create({
      data: {
        leadId: leadC.id,
        channel: 'TEST',
        status: 'ACTIVE',
        lastAssistantAction: 'ASKED_CALLBACK_INTEREST',
        pendingQuestion: 'CALLBACK_OFFER',
      },
    });

    // Add assistant's previous message
    await prisma.message.create({
      data: {
        conversationId: convC.id,
        senderType: 'AI',
        messageText: 'Would you like our sales team to call you?',
      },
    });

    // Customer says "Ok"
    const resC = await conversationService.handleIncomingMessage({
      leadId: leadC.id,
      messageText: 'Ok',
      senderType: 'CUSTOMER',
    });
    console.log('Aria previously asked: Would you like our sales team to call you?');
    console.log('Customer: Ok');
    console.log('Aria:', resC.aiMessage?.messageText);

    const isCallbackReq = resC.decision?.intent === 'CALLBACK_REQUEST';
    const askedTime = resC.aiMessage?.messageText.toLowerCase().includes('convenient time');

    if (isCallbackReq && askedTime) {
      console.log('✅ SCENARIO C PASSED: "Ok" correctly classified as CALLBACK_REQUEST and Aria asked for convenient time.');
      passedTests++;
    } else {
      console.error('❌ SCENARIO C FAILED:', { isCallbackReq, askedTime });
    }
  }

  // --------------------------------------------------------------------------
  // SCENARIO D: Customer changes callback time from 6:30 PM to 7:00 PM -> stored & confirmed once
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO D: Time Modification (6:30 PM -> 7:00 PM) ---');
  {
    const leadD = await prisma.lead.create({
      data: {
        name: 'Suresh Menon',
        phone: '919876500004',
        projectId: project.id,
        source: 'TEST',
        status: 'FOLLOW_UP',
      },
    });

    const convD = await prisma.conversation.create({
      data: {
        leadId: leadD.id,
        channel: 'TEST',
        status: 'ACTIVE',
        actionType: 'CALLBACK',
        actionStatus: 'CONFIRMED',
        actionTime: 'today at 6:30 PM',
        actionConfirmed: true,
        lastAssistantAction: 'CONFIRMED_CALLBACK',
      },
    });

    await prisma.followUp.create({
      data: {
        leadId: leadD.id,
        conversationId: convD.id,
        reason: 'Callback requested for today at 6:30 PM',
        priority: 'HIGH',
      },
    });

    // Customer changes time: "Actually change time to 7:00 PM"
    const resD = await conversationService.handleIncomingMessage({
      leadId: leadD.id,
      messageText: 'Actually change time to 7:00 PM',
      senderType: 'CUSTOMER',
    });
    console.log('Customer: Actually change time to 7:00 PM');
    console.log('Aria:', resD.aiMessage?.messageText);

    // Verify DB update
    const updatedFollowUp = await prisma.followUp.findFirst({
      where: { leadId: leadD.id },
    });
    const updatedConv = await prisma.conversation.findUnique({
      where: { id: convD.id },
    });

    const timeInMsg = resD.aiMessage?.messageText.toLowerCase().includes('7:00 pm');
    const timeInDB = updatedConv?.actionTime?.toLowerCase().includes('7:00 pm');
    const followUpUpdated = updatedFollowUp?.reason.toLowerCase().includes('7:00 pm');

    if (timeInMsg && timeInDB && followUpUpdated) {
      console.log('✅ SCENARIO D PASSED: Callback rescheduled to 7:00 PM, DB updated, confirmation sent once.');
      passedTests++;
    } else {
      console.error('❌ SCENARIO D FAILED:', { timeInMsg, timeInDB, followUpUpdated });
    }
  }

  // --------------------------------------------------------------------------
  // SCENARIO E: Duplicate Webhook Delivery -> Deduplicated, Only 1 Outbound Response
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO E: Webhook Deduplication / Exactly-Once Processing ---');
  {
    const leadE = await prisma.lead.create({
      data: {
        name: 'Vikas Gupta',
        phone: '919876500005',
        projectId: project.id,
        source: 'WHATSAPP_INBOUND',
        status: 'RESPONDED',
      },
    });

    const msgId = 'meta-msg-unique-token-999';

    // First delivery
    const resE1 = await conversationService.handleIncomingMessage({
      leadId: leadE.id,
      messageText: 'I am looking for a 2 BHK.',
      senderType: 'CUSTOMER',
      channel: 'WHATSAPP',
      externalMessageId: msgId,
    });
    console.log('First Webhook Delivery: Processed, AI message created.');

    // Duplicate delivery with same externalMessageId
    const resE2 = await conversationService.handleIncomingMessage({
      leadId: leadE.id,
      messageText: 'I am looking for a 2 BHK.',
      senderType: 'CUSTOMER',
      channel: 'WHATSAPP',
      externalMessageId: msgId,
    });
    console.log('Second Webhook Delivery (Duplicate):', resE2.isDuplicate ? 'Deduplicated (Ignored)' : 'Failed to deduplicate');

    // Count messages in conversation
    const messageCount = await prisma.message.count({
      where: { conversationId: resE1.conversationId, externalMessageId: msgId },
    });
    const aiMessageCount = await prisma.message.count({
      where: { conversationId: resE1.conversationId, senderType: 'AI' },
    });

    if (resE2.isDuplicate && messageCount === 1 && aiMessageCount === 1) {
      console.log('✅ SCENARIO E PASSED: Duplicate webhook delivery detected; exactly-once processing guaranteed.');
      passedTests++;
    } else {
      console.error('❌ SCENARIO E FAILED:', { isDuplicate: resE2.isDuplicate, messageCount, aiMessageCount });
    }
  }

  // --------------------------------------------------------------------------
  // SCENARIO F: Customer says "Please don't contact me again" -> Opt-Out recorded, follow-ups cancelled
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO F: Customer Opt-Out / Do Not Contact ---');
  {
    const leadF = await prisma.lead.create({
      data: {
        name: 'Karan Mehra',
        phone: '919876500006',
        projectId: project.id,
        source: 'TEST',
        status: 'INTERESTED',
        interestLevel: 'HIGH',
        followUpRequired: true,
      },
    });

    const convF = await prisma.conversation.create({
      data: {
        leadId: leadF.id,
        channel: 'TEST',
        status: 'ACTIVE',
      },
    });

    await prisma.followUp.create({
      data: {
        leadId: leadF.id,
        conversationId: convF.id,
        reason: 'General follow up',
        status: 'PENDING',
      },
    });

    const resF = await conversationService.handleIncomingMessage({
      leadId: leadF.id,
      messageText: "Please don't contact me again",
      senderType: 'CUSTOMER',
    });
    console.log('Customer: Please don\'t contact me again');
    console.log('Aria:', resF.aiMessage?.messageText);

    const updatedLeadF = await prisma.lead.findUnique({ where: { id: leadF.id } });
    const pendingFollowUps = await prisma.followUp.count({
      where: { leadId: leadF.id, status: 'PENDING' },
    });
    const updatedConvF = await prisma.conversation.findUnique({ where: { id: convF.id } });

    const isNotInterested = updatedLeadF?.status === 'NOT_INTERESTED' && updatedLeadF?.interestLevel === 'NOT_INTERESTED';
    const noFollowUps = pendingFollowUps === 0;
    const convClosed = updatedConvF?.status === 'CLOSED';

    if (isNotInterested && noFollowUps && convClosed) {
      console.log('✅ SCENARIO F PASSED: Lead marked NOT_INTERESTED, pending follow-ups cleared, conversation CLOSED.');
      passedTests++;
    } else {
      console.error('❌ SCENARIO F FAILED:', { isNotInterested, noFollowUps, convClosed });
    }
  }

  // --------------------------------------------------------------------------
  // SCENARIO G: Idle conversation, customer returns later with new question -> AI resumes normally
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO G: Idle Conversation Reactivation on New Question ---');
  {
    const leadG = await prisma.lead.create({
      data: {
        name: 'Neha Kapoor',
        phone: '919876500007',
        projectId: project.id,
        source: 'TEST',
        status: 'RESPONDED',
      },
    });

    const convG = await prisma.conversation.create({
      data: {
        leadId: leadG.id,
        channel: 'TEST',
        status: 'IDLE', // Previously marked idle
        lastAssistantAction: 'ACKNOWLEDGED_CLOSING',
      },
    });

    // Customer returns later: "Can you tell me the location?"
    const resG = await conversationService.handleIncomingMessage({
      leadId: leadG.id,
      messageText: 'Can you tell me the location?',
      senderType: 'CUSTOMER',
    });
    console.log('Customer (after idle): Can you tell me the location?');
    console.log('Aria:', resG.aiMessage?.messageText);

    const updatedConvG = await prisma.conversation.findUnique({ where: { id: convG.id } });
    const hasLocation =
      resG.aiMessage?.messageText.toLowerCase().includes(project.location.toLowerCase()) ||
      resG.aiMessage?.messageText.toLowerCase().includes('kharghar') ||
      resG.aiMessage?.messageText.toLowerCase().includes('thane');
    const hasMapLink =
      resG.aiMessage?.messageText.toLowerCase().includes('google') ||
      resG.aiMessage?.messageText.toLowerCase().includes('maps');
    const reactivated = updatedConvG?.status === 'ACTIVE';

    if (hasLocation && hasMapLink && reactivated) {
      console.log('✅ SCENARIO G PASSED: Idle conversation reactivated to ACTIVE, location & map link provided accurately.');
      passedTests++;
    } else {
      console.error('❌ SCENARIO G FAILED:', { hasLocation, hasMapLink, reactivated });
    }
  }

  // --------------------------------------------------------------------------
  // SCENARIO H: Relative Time Callback ("half hour mai call krna")
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO H: Relative Time Callback ("half hour mai call krna") ---');
  {
    const leadH = await prisma.lead.create({
      data: {
        name: 'Deepak Sharma',
        phone: '919876500008',
        projectId: project.id,
        source: 'TEST',
        status: 'INTERESTED',
      },
    });

    const convH = await prisma.conversation.create({
      data: {
        leadId: leadH.id,
        channel: 'TEST',
        status: 'ACTIVE',
        lastAssistantAction: 'ASKED_CALLBACK_INTEREST',
        pendingQuestion: 'CALLBACK_OFFER',
      },
    });

    // Customer says: "half hour mai call krna"
    const resH = await conversationService.handleIncomingMessage({
      leadId: leadH.id,
      messageText: 'half hour mai call krna',
      senderType: 'CUSTOMER',
    });
    console.log('Customer: half hour mai call krna');
    console.log('Aria:', resH.aiMessage?.messageText);

    const updatedConvH = await prisma.conversation.findUnique({ where: { id: convH.id } });
    const updatedFollowUpH = await prisma.followUp.findFirst({ where: { leadId: leadH.id } });

    const confirmedHalfHour = resH.aiMessage?.messageText.toLowerCase().includes('in half an hour') || resH.aiMessage?.messageText.toLowerCase().includes('half');
    const dbHasHalfHour = updatedConvH?.actionTime?.toLowerCase().includes('half');
    const followUpHasHalfHour = updatedFollowUpH?.reason.toLowerCase().includes('half');

    if (confirmedHalfHour && dbHasHalfHour && followUpHasHalfHour) {
      console.log('✅ SCENARIO H PASSED: Relative time "half hour mai call krna" correctly scheduled for half an hour.');
      passedTests++;
    } else {
      console.error('❌ SCENARIO H FAILED:', { confirmedHalfHour, dbHasHalfHour, followUpHasHalfHour });
    }
  }

  console.log('\n===============================================================');
  console.log(`TEST EXECUTION SUMMARY: ${passedTests}/${totalTests} SCENARIOS PASSED`);
  console.log('===============================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 ALL SCENARIOS (INCLUDING RELATIVE TIME HALF-HOUR) PASSED WITH 100% ACCURACY!');
  } else {
    throw new Error(`Only ${passedTests}/${totalTests} tests passed.`);
  }
}

runScenarioTests()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal test error:', err);
    prisma.$disconnect();
    process.exit(1);
  });
