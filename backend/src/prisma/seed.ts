import prisma from './client';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger';

async function main() {
  logger.info('Seeding database with realistic Real Estate data for AI LeadEngage...');

  // Clean existing records in reverse dependency order
  await prisma.followUp.deleteMany({});
  await prisma.aIAnalysis.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.conversation.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.projectKnowledge.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Admin User
  const passwordHash = await bcrypt.hash('password123', 10);
  const adminUser = await prisma.user.create({
    data: {
      name: 'Sales Director',
      email: 'admin@leadengage.ai',
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });
  logger.info(`Admin user created: ${adminUser.email} (Password: password123)`);

  // 2. Projects
  const godrejProject = await prisma.project.create({
    data: {
      name: 'Godrej Horizon',
      developer: 'Godrej Properties',
      location: 'Wadala, Mumbai',
      description: 'Luxury high-rise towers offering panoramic sea and city views, 5 mins from Monorail & Eastern Freeway.',
      propertyType: 'Luxury Residential Apartment',
      configurations: '2 BHK, 3 BHK',
      priceMin: 18500000,
      priceMax: 32000000,
      amenities: 'Sky Lounge, Infinity Pool, Olympic Size Gymnasium, 5-Tier Security, Landscaped Podium Gardens',
      possession: 'December 2026',
      status: 'ACTIVE',
    },
  });

  const prestigeProject = await prisma.project.create({
    data: {
      name: 'Prestige Cyber City',
      developer: 'Prestige Group',
      location: 'Whitefield, Bangalore',
      description: 'Integrated tech township adjacent to ITPL with smart-home automation and clubhouse.',
      propertyType: 'Smart Residential High-Rise',
      configurations: '2 BHK, 3 BHK, 4 BHK',
      priceMin: 9500000,
      priceMax: 21000000,
      amenities: 'Tech-enabled Clubhouse, Squash Court, Co-working Hub, Amphitheater, Electric Vehicle Charging',
      possession: 'March 2027',
      status: 'ACTIVE',
    },
  });

  const lodhaProject = await prisma.project.create({
    data: {
      name: 'Lodha Bellissimo',
      developer: 'Lodha Group',
      location: 'Lower Parel, Mumbai',
      description: 'Ultra-exclusive residential address with private decks overlooking Arabian Sea.',
      propertyType: 'Super Luxury Apartment',
      configurations: '3 BHK, 4 BHK, Penthouse',
      priceMin: 42000000,
      priceMax: 85000000,
      amenities: 'Private Elevator Access, Heated Pool, Spa & Wellness Sanctuary, Helipad, Concierge 24/7',
      possession: 'Ready to Move',
      status: 'ACTIVE',
    },
  });

  // 3. Project Knowledge Base (FAQs)
  await prisma.projectKnowledge.createMany({
    data: [
      {
        projectId: godrejProject.id,
        category: 'PRICING',
        question: 'What is the starting price for 2 BHK in Godrej Horizon?',
        answer: 'The starting price for 2 BHK is ₹1.85 Cr all-inclusive, subject to floor rise and unit view.',
      },
      {
        projectId: godrejProject.id,
        category: 'PRICING',
        question: 'What is the price for 3 BHK?',
        answer: '3 BHK units start from ₹2.75 Cr onwards up to ₹3.20 Cr for higher floors.',
      },
      {
        projectId: godrejProject.id,
        category: 'POSSESSION',
        question: 'When is the possession date for Godrej Horizon?',
        answer: 'Possession is scheduled for December 2026 with RERA registration number P51900034640.',
      },
      {
        projectId: godrejProject.id,
        category: 'LOCATION',
        question: 'How far is Godrej Horizon from the Eastern Freeway?',
        answer: 'Godrej Horizon is located just 4 minutes from the Eastern Freeway and 3 minutes from the Wadala Monorail station.',
      },
      {
        projectId: prestigeProject.id,
        category: 'PRICING',
        question: 'What is the price range for Prestige Cyber City?',
        answer: 'Units start at ₹95 Lakhs for 2 BHK (approx 1,150 sq.ft) and ₹1.45 Cr for 3 BHK.',
      },
      {
        projectId: prestigeProject.id,
        category: 'AMENITIES',
        question: 'What amenities are included in Prestige Cyber City?',
        answer: 'Over 40 amenities including sports pavilion, smart automated locks, high-speed fiber internet, and indoor heated pool.',
      },
    ],
  });

  // 4. Campaign
  const campaign = await prisma.campaign.create({
    data: {
      name: 'Mumbai & Bangalore Q3 Prime Outreach',
      projectId: godrejProject.id,
      status: 'RUNNING',
      totalLeads: 8,
      messagesSent: 7,
      responses: 5,
      interestedLeads: 4,
      followUpLeads: 4,
      notInterested: 1,
      noResponse: 2,
      startedAt: new Date(Date.now() - 3 * 86400000),
    },
  });

  // 5. Seed Leads & Full Conversations

  // --- Lead 1: Rahul Sharma (HIGH INTEREST, CALLBACK REQUESTED) ---
  const lead1 = await prisma.lead.create({
    data: {
      name: 'Rahul Sharma',
      phone: '+919820112233',
      email: 'rahul.sharma88@gmail.com',
      projectId: godrejProject.id,
      campaignId: campaign.id,
      status: 'FOLLOW_UP',
      interestLevel: 'HIGH',
      followUpRequired: true,
      followUpReason: 'Customer requested a callback for tomorrow afternoon',
      requirement: '2 BHK with parking',
      configuration: '2 BHK',
      budget: 8500000,
    },
  });

  const conv1 = await prisma.conversation.create({
    data: {
      leadId: lead1.id,
      campaignId: campaign.id,
      channel: 'WHATSAPP',
      status: 'ACTIVE',
      lastMessageAt: new Date(Date.now() - 3600000),
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conv1.id,
        senderType: 'AI',
        messageText: 'Hi Rahul 👋 You recently showed interest in Godrej Horizon Wadala. Are you still looking for a property?',
        deliveryStatus: 'READ',
        sentAt: new Date(Date.now() - 86400000),
      },
      {
        conversationId: conv1.id,
        senderType: 'CUSTOMER',
        messageText: 'Haan interested hu. 2 BHK chahiye around 85 lakh.',
        deliveryStatus: 'READ',
        sentAt: new Date(Date.now() - 85000000),
      },
      {
        conversationId: conv1.id,
        senderType: 'AI',
        messageText: 'Great Rahul! In Godrej Horizon, 2 BHK units start at ₹1.85 Cr with sea view decks. We also have special pre-launch festive payment plans. Would you like our property specialist to call you?',
        deliveryStatus: 'READ',
        sentAt: new Date(Date.now() - 84000000),
      },
      {
        conversationId: conv1.id,
        senderType: 'CUSTOMER',
        messageText: 'Yes please. Kal dopahar 2 baje call karna.',
        deliveryStatus: 'READ',
        sentAt: new Date(Date.now() - 3600000),
      },
      {
        conversationId: conv1.id,
        senderType: 'AI',
        messageText: 'Duly noted, Rahul! Our senior consultant will call you tomorrow precisely at 2:00 PM. Have a great day!',
        deliveryStatus: 'SENT',
        sentAt: new Date(Date.now() - 3550000),
      },
    ],
  });

  await prisma.aIAnalysis.create({
    data: {
      conversationId: conv1.id,
      leadId: lead1.id,
      intent: 'CALLBACK_REQUEST',
      interestLevel: 'HIGH',
      followUpRequired: true,
      followUpReason: 'Customer requested callback for tomorrow at 2 PM',
      configuration: '2 BHK',
      budget: 8500000,
      callbackRequested: true,
      siteVisitRequested: false,
      summary: 'Rahul confirmed interest in 2 BHK. Specifically requested callback tomorrow at 2:00 PM.',
      confidenceScore: 0.98,
      model: 'gpt-4o-mini',
      promptVersion: 'v1.0',
    },
  });

  await prisma.followUp.create({
    data: {
      leadId: lead1.id,
      conversationId: conv1.id,
      reason: 'Requested callback for tomorrow at 2:00 PM',
      priority: 'HIGH',
      status: 'PENDING',
    },
  });

  // --- Lead 2: Priya Deshmukh (SITE VISIT REQUESTED) ---
  const lead2 = await prisma.lead.create({
    data: {
      name: 'Priya Deshmukh',
      phone: '+919730223344',
      email: 'priya.deshmukh@tcs.com',
      projectId: godrejProject.id,
      campaignId: campaign.id,
      status: 'FOLLOW_UP',
      interestLevel: 'HIGH',
      followUpRequired: true,
      followUpReason: 'Customer inquired about scheduling a site visit this Saturday',
      requirement: '3 BHK higher floor',
      configuration: '3 BHK',
      budget: 27500000,
    },
  });

  const conv2 = await prisma.conversation.create({
    data: {
      leadId: lead2.id,
      campaignId: campaign.id,
      channel: 'WHATSAPP',
      status: 'ACTIVE',
      lastMessageAt: new Date(Date.now() - 7200000),
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conv2.id,
        senderType: 'AI',
        messageText: 'Hi Priya 👋 Hope you are having a wonderful day! You recently checked Godrej Horizon Wadala. Are you exploring 2 or 3 BHK?',
        deliveryStatus: 'READ',
        sentAt: new Date(Date.now() - 40000000),
      },
      {
        conversationId: conv2.id,
        senderType: 'CUSTOMER',
        messageText: 'We are looking for a 3 BHK on a higher floor. Can we visit the sample flat this Saturday?',
        deliveryStatus: 'READ',
        sentAt: new Date(Date.now() - 7200000),
      },
      {
        conversationId: conv2.id,
        senderType: 'AI',
        messageText: 'Certainly, Priya! Our show apartment at Godrej Horizon is open this Saturday. Our relationship manager will connect with you to book an exclusive VIP slot.',
        deliveryStatus: 'SENT',
        sentAt: new Date(Date.now() - 7100000),
      },
    ],
  });

  await prisma.aIAnalysis.create({
    data: {
      conversationId: conv2.id,
      leadId: lead2.id,
      intent: 'SITE_VISIT',
      interestLevel: 'HIGH',
      followUpRequired: true,
      followUpReason: 'Customer wants to visit sample flat this Saturday',
      configuration: '3 BHK',
      budget: 27500000,
      callbackRequested: false,
      siteVisitRequested: true,
      summary: 'Priya is actively looking for a 3 BHK higher floor and wants to attend a site visit this Saturday.',
      confidenceScore: 0.96,
      model: 'gpt-4o-mini',
      promptVersion: 'v1.0',
    },
  });

  await prisma.followUp.create({
    data: {
      leadId: lead2.id,
      conversationId: conv2.id,
      reason: 'Arrange site visit for 3 BHK sample flat this Saturday',
      priority: 'HIGH',
      status: 'PENDING',
    },
  });

  // --- Lead 3: Amit Verma (PRICE & BROCHURE INQUIRY) ---
  const lead3 = await prisma.lead.create({
    data: {
      name: 'Amit Verma',
      phone: '+919940334455',
      email: 'amit.verma@wipro.com',
      projectId: prestigeProject.id,
      campaignId: campaign.id,
      status: 'FOLLOW_UP',
      interestLevel: 'HIGH',
      followUpRequired: true,
      followUpReason: 'Inquired about starting price and requested floor plan PDF',
      requirement: '2 BHK in Whitefield',
      configuration: '2 BHK',
      budget: 9500000,
    },
  });

  const conv3 = await prisma.conversation.create({
    data: {
      leadId: lead3.id,
      campaignId: campaign.id,
      channel: 'WHATSAPP',
      status: 'ACTIVE',
      lastMessageAt: new Date(Date.now() - 14000000),
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conv3.id,
        senderType: 'AI',
        messageText: 'Hello Amit! You showed interest in Prestige Cyber City Whitefield. Are you still seeking a home nearby ITPL?',
        deliveryStatus: 'READ',
        sentAt: new Date(Date.now() - 30000000),
      },
      {
        conversationId: conv3.id,
        senderType: 'CUSTOMER',
        messageText: 'Price kya hai 2 BHK ka? Can you share brochure and floor plans on WhatsApp?',
        deliveryStatus: 'READ',
        sentAt: new Date(Date.now() - 14000000),
      },
      {
        conversationId: conv3.id,
        senderType: 'AI',
        messageText: 'The 2 BHK at Prestige Cyber City starts at ₹95 Lakhs. I am alerting our project advisor to send the complete digital brochure and floor plans right to your WhatsApp.',
        deliveryStatus: 'SENT',
        sentAt: new Date(Date.now() - 13900000),
      },
    ],
  });

  await prisma.aIAnalysis.create({
    data: {
      conversationId: conv3.id,
      leadId: lead3.id,
      intent: 'PRICE_INQUIRY',
      interestLevel: 'HIGH',
      followUpRequired: true,
      followUpReason: 'Asked for 2 BHK pricing and brochure dispatch',
      configuration: '2 BHK',
      budget: 9500000,
      callbackRequested: true,
      siteVisitRequested: false,
      summary: 'Amit inquired about 2 BHK pricing (starting ₹95L) and requested floor plans and brochure.',
      confidenceScore: 0.94,
      model: 'gpt-4o-mini',
      promptVersion: 'v1.0',
    },
  });

  await prisma.followUp.create({
    data: {
      leadId: lead3.id,
      conversationId: conv3.id,
      reason: 'Send brochure & floor plans on WhatsApp and discuss 2 BHK unit',
      priority: 'MEDIUM',
      status: 'PENDING',
    },
  });

  // --- Lead 4: Vikram Malhotra (NOT INTERESTED / ALREADY BOUGHT) ---
  const lead4 = await prisma.lead.create({
    data: {
      name: 'Vikram Malhotra',
      phone: '+919811445566',
      email: 'vikram.m@rediffmail.com',
      projectId: godrejProject.id,
      campaignId: campaign.id,
      status: 'NOT_INTERESTED',
      interestLevel: 'NOT_INTERESTED',
      followUpRequired: false,
      followUpReason: 'Customer already purchased property elsewhere',
    },
  });

  const conv4 = await prisma.conversation.create({
    data: {
      leadId: lead4.id,
      campaignId: campaign.id,
      channel: 'WHATSAPP',
      status: 'COMPLETED',
      lastMessageAt: new Date(Date.now() - 20000000),
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conv4.id,
        senderType: 'AI',
        messageText: 'Hi Vikram 👋 Are you still looking for a premium property in Wadala?',
        deliveryStatus: 'READ',
        sentAt: new Date(Date.now() - 25000000),
      },
      {
        conversationId: conv4.id,
        senderType: 'CUSTOMER',
        messageText: 'Not interested. Already purchased a flat last month.',
        deliveryStatus: 'READ',
        sentAt: new Date(Date.now() - 20000000),
      },
      {
        conversationId: conv4.id,
        senderType: 'AI',
        messageText: 'Congratulations on your new home, Vikram! We will update our records. Wishing you all the very best.',
        deliveryStatus: 'READ',
        sentAt: new Date(Date.now() - 19900000),
      },
    ],
  });

  await prisma.aIAnalysis.create({
    data: {
      conversationId: conv4.id,
      leadId: lead4.id,
      intent: 'NOT_INTERESTED',
      interestLevel: 'NOT_INTERESTED',
      followUpRequired: false,
      followUpReason: 'Customer already purchased property elsewhere',
      configuration: null,
      budget: null,
      callbackRequested: false,
      siteVisitRequested: false,
      summary: 'Customer clearly stated they already purchased a flat and are not interested in further communication.',
      confidenceScore: 0.99,
      model: 'gpt-4o-mini',
      promptVersion: 'v1.0',
    },
  });

  // --- Lead 5: Sneha Roy (HIGH INTEREST, 3 BHK) ---
  const lead5 = await prisma.lead.create({
    data: {
      name: 'Sneha Roy',
      phone: '+919711778899',
      email: 'sneha.roy@deloitte.com',
      projectId: lodhaProject.id,
      campaignId: campaign.id,
      status: 'FOLLOW_UP',
      interestLevel: 'HIGH',
      followUpRequired: true,
      followUpReason: 'Asked for private deck 3 BHK pricing and possession timeline',
      requirement: '3 BHK Luxury Apartment',
      configuration: '3 BHK',
      budget: 45000000,
    },
  });

  const conv5 = await prisma.conversation.create({
    data: {
      leadId: lead5.id,
      campaignId: campaign.id,
      channel: 'WHATSAPP',
      status: 'ACTIVE',
      lastMessageAt: new Date(Date.now() - 5000000),
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conv5.id,
        senderType: 'AI',
        messageText: 'Hello Sneha 👋 Exploring luxury residences in Lower Parel? Lodha Bellissimo has ready-to-move 3 & 4 BHK residences with private decks.',
        deliveryStatus: 'READ',
        sentAt: new Date(Date.now() - 15000000),
      },
      {
        conversationId: conv5.id,
        senderType: 'CUSTOMER',
        messageText: 'Yes, looking for ready 3 BHK. Budget is around 4.5 Cr. Please arrange a call with your sales team.',
        deliveryStatus: 'READ',
        sentAt: new Date(Date.now() - 5000000),
      },
      {
        conversationId: conv5.id,
        senderType: 'AI',
        messageText: 'Wonderful Sneha! Lodha Bellissimo 3 BHK fits your preference perfectly. I have assigned our Senior Vice President to call you promptly.',
        deliveryStatus: 'SENT',
        sentAt: new Date(Date.now() - 4900000),
      },
    ],
  });

  await prisma.aIAnalysis.create({
    data: {
      conversationId: conv5.id,
      leadId: lead5.id,
      intent: 'CALLBACK_REQUEST',
      interestLevel: 'HIGH',
      followUpRequired: true,
      followUpReason: 'Requested sales team call for 3 BHK ready flat (budget ₹4.5 Cr)',
      configuration: '3 BHK',
      budget: 45000000,
      callbackRequested: true,
      siteVisitRequested: false,
      summary: 'Sneha has a ₹4.5 Cr budget for a ready 3 BHK in Lodha Bellissimo and explicitly requested a sales team callback.',
      confidenceScore: 0.97,
      model: 'gpt-4o-mini',
      promptVersion: 'v1.0',
    },
  });

  await prisma.followUp.create({
    data: {
      leadId: lead5.id,
      conversationId: conv5.id,
      reason: 'High-value prospect: Call to discuss ready 3 BHK (Budget ₹4.5 Cr)',
      priority: 'HIGH',
      status: 'PENDING',
    },
  });

  // --- Lead 6: Rajesh Patel (NO RESPONSE) ---
  await prisma.lead.create({
    data: {
      name: 'Rajesh Patel',
      phone: '+919988667788',
      email: 'rajesh.patel@yahoo.com',
      projectId: godrejProject.id,
      campaignId: campaign.id,
      status: 'CONTACTED',
      interestLevel: 'UNKNOWN',
      followUpRequired: false,
    },
  });

  // --- Lead 7: Ananya Sen (IMPORTED) ---
  await prisma.lead.create({
    data: {
      name: 'Ananya Sen',
      phone: '+919833889911',
      email: 'ananya.sen@infosys.com',
      projectId: prestigeProject.id,
      campaignId: campaign.id,
      status: 'IMPORTED',
      interestLevel: 'UNKNOWN',
      followUpRequired: false,
    },
  });

  // --- Lead 8: Rohit Joshi (NOT INTERESTED) ---
  await prisma.lead.create({
    data: {
      name: 'Rohit Joshi',
      phone: '+919655889900',
      email: 'rohit.joshi@gmail.com',
      projectId: godrejProject.id,
      campaignId: campaign.id,
      status: 'NOT_INTERESTED',
      interestLevel: 'NOT_INTERESTED',
      followUpRequired: false,
      followUpReason: 'Not interested at this time',
    },
  });

  // 6. Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: adminUser.id,
        type: 'FOLLOW_UP_IDENTIFIED',
        title: 'High Intent Lead: Rahul Sharma',
        message: 'Rahul Sharma requested callback for tomorrow at 2:00 PM regarding 2 BHK in Godrej Horizon.',
        isRead: false,
      },
      {
        userId: adminUser.id,
        type: 'FOLLOW_UP_IDENTIFIED',
        title: 'Site Visit Requested: Priya Deshmukh',
        message: 'Priya Deshmukh asked to visit sample flat for 3 BHK this Saturday.',
        isRead: false,
      },
      {
        userId: adminUser.id,
        type: 'CAMPAIGN_COMPLETED',
        title: 'Campaign Outreach Progress',
        message: 'Mumbai & Bangalore Q3 Prime Outreach has engaged 5 out of 7 contacted leads.',
        isRead: true,
      },
    ],
  });

  logger.info('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    logger.error({ e }, 'Error during seeding');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

