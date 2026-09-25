export interface ConfigurationItem {
  id: string;
  type: string;
  carpetAreaSqft: number;
  startingPrice: number;
  priceDisplay: string;
  bathrooms: number;
  balconies: number;
  parkingSpaces?: string | null;
  facing?: string | null;
  availabilityStatus: string;
}

export interface ProjectContext {
  id: string;
  name: string;
  developer: string;
  location: string;
  fullAddress?: string | null;
  googleMapsUrl?: string | null;
  reraNumber?: string | null;
  description?: string | null;
  propertyType: string;
  configurations?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  amenities?: string | null;
  possession?: string | null;
  inventory?: ConfigurationItem[];
  knowledgeItems?: Array<{
    category: string;
    question: string;
    answer: string;
  }>;
}

export interface ConversationMessageHistory {
  senderType: 'AI' | 'CUSTOMER' | 'SYSTEM';
  messageText: string;
  sentAt?: string | Date;
}

/**
 * 1. Base System Instructions
 */
export const SYSTEM_INSTRUCTIONS = `You are "Aria", an elite, polite, and helpful Real Estate AI Assistant for AI LeadEngage.
Your job is to engage real estate leads who showed interest in a specific property, answer their questions accurately using ONLY the provided project knowledge, ask qualifying questions naturally, and extract their intent.
Tone: Warm, highly professional, conversational, and direct.
Languages supported: English, Hindi, and colloquial Hinglish (e.g. "2 BHK chahiye around 80 lakh", "price kya hai", "kal call kar sakte ho?").
Formatting: You are communicating over WhatsApp. Keep responses concise (1 to 3 short sentences). Avoid overwhelming walls of text. Use subtle emojis sparingly.`;

/**
 * 2. Strict Real Estate Business Rules
 */
export const REAL_ESTATE_BUSINESS_RULES = `STRICT BUSINESS RULES:
1. STRICT ISOLATION: Answer questions using ONLY the active project's details and configurations. Never mix information across different projects or assume a 3 BHK in Project A has the same price or size as in Project B.
2. NEVER hallucinate, guess, or invent prices, carpet areas, discounts, possession dates, or amenities not explicitly present in the PROJECT KNOWLEDGE or INVENTORY.
3. If the customer asks for a configuration not present in this project (e.g. asks for 2 BHK when only 3 BHK & 4 BHK exist), state clearly that this project exclusively offers the listed configurations.
4. If the customer asks a question not covered in the project knowledge (e.g. unlisted maintenance charges or customized payment schedules), reply politely that you will have a senior property specialist share verified details, and ask if they prefer a callback.
5. NEVER infer or assume a budget that the customer did not state. If not stated, budget is null.
6. Extract configuration (e.g. 1 BHK, 2 BHK, 3 BHK, 4 BHK, Penthouse) only if mentioned or implied.
7. Identify follow-up signals:
   - Positive signals requiring human follow-up:
     * Requesting a callback ("kal call karna", "call me tomorrow", "please call me")
     * Requesting a site visit ("site visit kab kar sakte hai", "can I visit this weekend?")
     * Asking for exact brochure / floor plans / pricing breakdown
     * Confirming active interest and providing requirements
   - Negative signals:
     * "Not interested", "Wrong number", "Already bought a flat", "Stop messaging" -> followUpRequired = false, interestLevel = NOT_INTERESTED.
8. Handoff: The moment a lead requests a callback or site visit, confirm warmly that the presales team will reach out at their requested time.`;

/**
 * 3. Project Knowledge Formatter
 */
export const formatProjectKnowledge = (project: ProjectContext): string => {
  const minPriceStr = project.priceMin ? `₹${(project.priceMin / 100000).toFixed(1)} Lakhs` : 'Upon Request';
  const maxPriceStr = project.priceMax ? `₹${(project.priceMax / 100000).toFixed(1)} Lakhs` : 'Upon Request';

  let kbSection = `
ACTIVE PROJECT KNOWLEDGE:
- Project Name: ${project.name}
- Developer: ${project.developer}
- Location: ${project.location}
${project.fullAddress ? `- Full Address: ${project.fullAddress}` : ''}
${project.reraNumber ? `- RERA Number: ${project.reraNumber}` : ''}
- Property Type: ${project.propertyType}
- Overall Price Range: ${minPriceStr} - ${maxPriceStr}
- Possession Timeline: ${project.possession || 'Under Construction / Available Soon'}
- Amenities: ${project.amenities || 'Clubhouse, Swimming Pool, 24/7 Security, Landscaped Gardens'}
`;

  if (project.description) {
    kbSection += `- Overview: ${project.description}\n`;
  }

  // Inventory / Configuration-Specific Section
  if (project.inventory && project.inventory.length > 0) {
    kbSection += `\nAPPROVED INVENTORY & CONFIGURATIONS (Strict Prices & Specs):\n`;
    project.inventory.forEach((cfg) => {
      kbSection += `• ${cfg.type}: Carpet Area: ${cfg.carpetAreaSqft} sq.ft. | Price: ${cfg.priceDisplay} (Starting ₹${cfg.startingPrice.toLocaleString('en-IN')}) | Bathrooms: ${cfg.bathrooms} | Balconies: ${cfg.balconies} | Status: ${cfg.availabilityStatus}\n`;
    });
  } else if (project.configurations) {
    kbSection += `- Configurations: ${project.configurations}\n`;
  }

  if (project.knowledgeItems && project.knowledgeItems.length > 0) {
    kbSection += `\nAPPROVED FREQUENTLY ASKED QUESTIONS (FAQs):\n`;
    project.knowledgeItems.forEach((item, index) => {
      kbSection += `Q${index + 1} [${item.category}]: ${item.question}\nA: ${item.answer}\n`;
    });
  }

  return kbSection.trim();
};



/**
 * 4. Conversation History Formatter
 */
export const formatConversationHistory = (history: ConversationMessageHistory[]): string => {
  if (!history || history.length === 0) {
    return 'No previous conversation history.';
  }

  return history
    .map((msg) => {
      const role = msg.senderType === 'AI' ? 'Assistant' : msg.senderType === 'CUSTOMER' ? 'Customer' : 'System';
      return `${role}: ${msg.messageText}`;
    })
    .join('\n');
};

/**
 * 5. Structured AI Analysis Schema
 */
export const ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    intent: {
      type: 'string',
      enum: [
        'PROPERTY_INTEREST',
        'PRICE_INQUIRY',
        'SITE_VISIT',
        'CALLBACK_REQUEST',
        'NOT_INTERESTED',
        'GENERAL_INQUIRY',
      ],
      description: 'The primary underlying intent of the customer.',
    },
    interestLevel: {
      type: 'string',
      enum: ['HIGH', 'MEDIUM', 'LOW', 'NOT_INTERESTED'],
      description: 'The overall interest level of the lead based on conversational evidence.',
    },
    followUpRequired: {
      type: 'boolean',
      description: 'Whether human presales/sales follow-up is recommended.',
    },
    followUpReason: {
      type: 'string',
      description: 'Specific reason for human follow-up (e.g., Requested callback for tomorrow, Wants 2 BHK pricing breakdown).',
    },
    configuration: {
      type: ['string', 'null'],
      description: 'Specific BHK or configuration requested (e.g. 2 BHK, 3 BHK) or null if unmentioned.',
    },
    budget: {
      type: ['number', 'null'],
      description: 'Customer stated budget in Indian Rupees as a numeric value (e.g. 8000000 for 80 Lakhs) or null.',
    },
    preferredLocation: {
      type: ['string', 'null'],
      description: 'Specific location preferences stated by the customer.',
    },
    callbackRequested: {
      type: 'boolean',
      description: 'True if customer explicitly asked for a phone call.',
    },
    siteVisitRequested: {
      type: 'boolean',
      description: 'True if customer asked for a physical site visit.',
    },
    summary: {
      type: 'string',
      description: 'A 1-2 sentence executive briefing summary of the customer requirements for the sales team.',
    },
    nextSuggestedMessage: {
      type: 'string',
      description: 'The contextual, natural conversational reply to send back to the customer on WhatsApp.',
    },
  },
  required: [
    'intent',
    'interestLevel',
    'followUpRequired',
    'followUpReason',
    'summary',
    'nextSuggestedMessage',
  ],
};

