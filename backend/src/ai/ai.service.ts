import OpenAI from 'openai';
import logger from '../utils/logger';
import {
  SYSTEM_INSTRUCTIONS,
  REAL_ESTATE_BUSINESS_RULES,
  formatProjectKnowledge,
  formatConversationHistory,
  ProjectContext,
  ConversationMessageHistory,
} from './prompts';

export interface StructuredAIOutput {
  intent: 'PROPERTY_INTEREST' | 'PRICE_INQUIRY' | 'SITE_VISIT' | 'CALLBACK_REQUEST' | 'NOT_INTERESTED' | 'GENERAL_INQUIRY';
  interestLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'NOT_INTERESTED';
  followUpRequired: boolean;
  followUpReason: string;
  configuration: string | null;
  budget: number | null;
  preferredLocation: string | null;
  callbackRequested: boolean;
  siteVisitRequested: boolean;
  summary: string;
  nextSuggestedMessage: string;
  model: string;
  promptVersion: string;
}

class AIService {
  private openai: OpenAI | null = null;
  private promptVersion = 'v1.0';

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && apiKey.trim() !== '' && !apiKey.startsWith('your_')) {
      this.openai = new OpenAI({ apiKey });
      logger.info('OpenAI client initialized successfully with real API key.');
    } else {
      logger.warn('No valid OPENAI_API_KEY found. Operating in intelligent Real-Estate Mock/Dev mode.');
    }
  }

  /**
   * Process a customer message in conversation context and return both
   * the conversational reply and the structured lead extraction.
   */
  public async processConversation(
    customerName: string,
    customerMessage: string,
    history: ConversationMessageHistory[],
    project: ProjectContext
  ): Promise<StructuredAIOutput> {
    if (this.openai) {
      try {
        return await this.callOpenAI(customerName, customerMessage, history, project);
      } catch (err: any) {
        logger.error({ err }, 'OpenAI API call failed, falling back to intelligent rule analyzer');
        return this.fallbackAnalysis(customerName, customerMessage, history, project);
      }
    } else {
      return this.fallbackAnalysis(customerName, customerMessage, history, project);
    }
  }

  /**
   * Production OpenAI API integration with structured JSON output
   */
  private async callOpenAI(
    customerName: string,
    customerMessage: string,
    history: ConversationMessageHistory[],
    project: ProjectContext
  ): Promise<StructuredAIOutput> {
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const systemPrompt = `
${SYSTEM_INSTRUCTIONS}

${REAL_ESTATE_BUSINESS_RULES}

${formatProjectKnowledge(project)}

OUTPUT REQUIREMENT:
You must return ONLY a valid JSON object strictly matching this schema:
{
  "intent": "PROPERTY_INTEREST" | "PRICE_INQUIRY" | "SITE_VISIT" | "CALLBACK_REQUEST" | "NOT_INTERESTED" | "GENERAL_INQUIRY",
  "interestLevel": "HIGH" | "MEDIUM" | "LOW" | "NOT_INTERESTED",
  "followUpRequired": boolean,
  "followUpReason": "Clear, specific reason for the presales team",
  "configuration": "e.g. 2 BHK, 3 BHK, or null",
  "budget": number | null (e.g. 8000000 for 80 Lakhs, never guess if unstated),
  "preferredLocation": string | null,
  "callbackRequested": boolean,
  "siteVisitRequested": boolean,
  "summary": "1-2 sentence executive summary for sales team",
  "nextSuggestedMessage": "Concise, friendly WhatsApp reply to send to ${customerName}"
}
`;

    const userPrompt = `
LEAD NAME: ${customerName}
PROJECT: ${project.name}

CONVERSATION HISTORY:
${formatConversationHistory(history)}

LATEST MESSAGE FROM ${customerName}:
"${customerMessage}"

Analyze the conversation context and return the structured JSON.
`;

    const response = await this.openai!.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const responseContent = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(responseContent);

    return {
      intent: parsed.intent || 'GENERAL_INQUIRY',
      interestLevel: parsed.interestLevel || 'MEDIUM',
      followUpRequired: Boolean(parsed.followUpRequired),
      followUpReason: parsed.followUpReason || 'Lead expressed interest in project',
      configuration: parsed.configuration || null,
      budget: typeof parsed.budget === 'number' ? parsed.budget : null,
      preferredLocation: parsed.preferredLocation || null,
      callbackRequested: Boolean(parsed.callbackRequested),
      siteVisitRequested: Boolean(parsed.siteVisitRequested),
      summary: parsed.summary || `Customer inquired about ${project.name}`,
      nextSuggestedMessage:
        parsed.nextSuggestedMessage ||
        `Thank you for your response, ${customerName}! Our team for ${project.name} will share the details shortly.`,
      model,
      promptVersion: this.promptVersion,
    };
  }

  /**
   * Intelligent Real-Estate Rule-Based Engine
   * Handles English, Hindi, and colloquial Hinglish for zero-cost offline development & testing
   */
  private fallbackAnalysis(
    customerName: string,
    customerMessage: string,
    history: ConversationMessageHistory[],
    project: ProjectContext
  ): StructuredAIOutput {
    const text = customerMessage.toLowerCase().trim();
    const allHistoryText = history.map((m) => m.messageText.toLowerCase()).join(' ') + ' ' + text;

    // Detect negative intent
    const isNegative =
      /\b(not interested|na|nahi|don't contact|dont contact|wrong number|already bought|already purchased|stop|unsubscribe|not looking)\b/i.test(
        text
      );

    if (isNegative) {
      return {
        intent: 'NOT_INTERESTED',
        interestLevel: 'NOT_INTERESTED',
        followUpRequired: false,
        followUpReason: 'Customer explicitly stated they are not interested or already purchased.',
        configuration: null,
        budget: null,
        preferredLocation: null,
        callbackRequested: false,
        siteVisitRequested: false,
        summary: `${customerName} indicated they are not interested in ${project.name}.`,
        nextSuggestedMessage: `Understood, ${customerName}. Thank you for letting us know! Have a wonderful day ahead.`,
        model: 'heuristic-real-estate-v1',
        promptVersion: this.promptVersion,
      };
    }

    // Detect Callback request
    const callbackRequested = /\b(call me|call karna|phone karna|callback|kal call|call tomorrow|call after|connect on call)\b/i.test(
      allHistoryText
    );

    // Detect Site Visit
    const siteVisitRequested = /\b(site visit|visit|kab dekh sakte|when can i visit|location visit|sample flat)\b/i.test(
      allHistoryText
    );

    // Extract Configuration (e.g., 1 BHK, 2 BHK, 3 BHK, 4 BHK)
    const bhkMatch = allHistoryText.match(/\b([1-5])\s*(?:bhk|bedroom|rk)\b/i);
    const configuration = bhkMatch ? `${bhkMatch[1]} BHK` : null;

    // Extract Budget (e.g. 80 lakh, 1.2 cr, 75L, 1cr, 8000000)
    let budget: number | null = null;
    const crMatch = allHistoryText.match(/(\d+(?:\.\d+)?)\s*(?:cr|crore|crores)/i);
    const lakhMatch = allHistoryText.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lacs|lac|l)\b/i);

    if (crMatch) {
      budget = Math.round(parseFloat(crMatch[1]) * 10000000);
    } else if (lakhMatch) {
      budget = Math.round(parseFloat(lakhMatch[1]) * 100000);
    }

    // Determine Intent & Interest
    let intent: StructuredAIOutput['intent'] = 'GENERAL_INQUIRY';
    let interestLevel: StructuredAIOutput['interestLevel'] = 'MEDIUM';
    let followUpRequired = false;
    let followUpReason = 'Customer showed initial engagement';

    if (callbackRequested) {
      intent = 'CALLBACK_REQUEST';
      interestLevel = 'HIGH';
      followUpRequired = true;
      followUpReason = 'Customer requested a direct callback';
    } else if (siteVisitRequested) {
      intent = 'SITE_VISIT';
      interestLevel = 'HIGH';
      followUpRequired = true;
      followUpReason = 'Customer inquired about arranging a site visit';
    } else if (/\b(price|cost|pricing|rate|budget|bhav|daam|quotation)\b/i.test(allHistoryText)) {
      intent = 'PRICE_INQUIRY';
      interestLevel = budget || configuration ? 'HIGH' : 'MEDIUM';
      followUpRequired = true;
      followUpReason = `Customer asked for price details (${configuration || 'configuration'} inquired)`;
    } else if (/\b(yes|haan|ha|interested|looking for|chahiye|need)\b/i.test(text)) {
      intent = 'PROPERTY_INTEREST';
      interestLevel = 'HIGH';
      followUpRequired = true;
      followUpReason = 'Customer confirmed active interest in the project';
    }

    // Formulate natural conversational reply
    let nextSuggestedMessage = `Thank you, ${customerName}! `;
    if (callbackRequested) {
      nextSuggestedMessage += `I have noted your callback request. Our property consultant for ${project.name} will call you shortly to assist.`;
    } else if (siteVisitRequested) {
      nextSuggestedMessage += `We would love to host you at ${project.name}! Would tomorrow or this weekend suit you best for the site visit?`;
    } else if (configuration && !budget) {
      nextSuggestedMessage += `The ${configuration} at ${project.name} starts at ₹${project.priceMin ? (project.priceMin / 100000).toFixed(0) + ' Lakhs' : 'attractive pricing'}. May I know your approximate budget range?`;
    } else if (budget && !configuration) {
      const budgetInLakhs = (budget / 100000).toFixed(0);
      nextSuggestedMessage += `Great! In your budget of around ₹${budgetInLakhs} Lakhs, we have attractive options at ${project.name}. Are you looking for a 2 BHK or 3 BHK?`;
    } else if (configuration && budget) {
      nextSuggestedMessage += `Perfect! We have matching ${configuration} units in your budget at ${project.name}. Would you like our specialist to share the floor plans and brochure on WhatsApp?`;
    } else {
      nextSuggestedMessage += `Could you share what configuration you are exploring (e.g. ${project.configurations})?`;
    }

    const summaryParts: string[] = [];
    if (configuration) summaryParts.push(`seeking ${configuration}`);
    if (budget) summaryParts.push(`budget ₹${(budget / 100000).toFixed(1)}L`);
    if (callbackRequested) summaryParts.push('requested callback');
    if (siteVisitRequested) summaryParts.push('requested site visit');
    const summary = summaryParts.length > 0
      ? `Customer ${summaryParts.join(', ')} for ${project.name}.`
      : `Customer engaged with queries regarding ${project.name}.`;

    return {
      intent,
      interestLevel,
      followUpRequired,
      followUpReason,
      configuration,
      budget,
      preferredLocation: project.location,
      callbackRequested,
      siteVisitRequested,
      summary,
      nextSuggestedMessage,
      model: 'heuristic-real-estate-v1',
      promptVersion: this.promptVersion,
    };
  }
}

export const aiService = new AIService();
export default aiService;

