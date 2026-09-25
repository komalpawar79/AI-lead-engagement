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

const VALID_INTENTS = new Set([
  'PROPERTY_INTEREST', 'PRICE_INQUIRY', 'SITE_VISIT',
  'CALLBACK_REQUEST', 'NOT_INTERESTED', 'GENERAL_INQUIRY',
]);
const VALID_INTEREST_LEVELS = new Set(['HIGH', 'MEDIUM', 'LOW', 'NOT_INTERESTED']);

class GroqService {
  private groqClient: OpenAI | null = null;
  private readonly promptVersion = 'v2.0-groq';

  constructor() {
    const groqKey = process.env.GROQ_API_KEY;

    if (groqKey && groqKey.trim() !== '' && !groqKey.startsWith('your_')) {
      this.groqClient = new OpenAI({
        apiKey: groqKey,
        baseURL: 'https://api.groq.com/openai/v1',
      });
      const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
      logger.info({ model }, 'Groq client initialized successfully. AI mode: LIVE.');
    } else {
      logger.warn(
        'GROQ_API_KEY is missing or empty. Operating in intelligent real-estate heuristic fallback mode.'
      );
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
    if (this.groqClient) {
      try {
        const result = await this.callGroq(customerName, customerMessage, history, project);
        logger.info({ model: result.model, intent: result.intent }, 'Groq responded successfully.');
        return result;
      } catch (err: any) {
        logger.error(
          {
            err: {
              message: err?.message,
              status: err?.status,
              code: err?.code,
              type: err?.type,
            },
          },
          'Groq API call failed — falling back to heuristic engine. Check GROQ_API_KEY and GROQ_MODEL.'
        );
        return this.fallbackAnalysis(customerName, customerMessage, history, project);
      }
    }

    logger.warn('Groq client not initialized — using heuristic fallback.');
    return this.fallbackAnalysis(customerName, customerMessage, history, project);
  }

  /**
   * Production Groq API integration via OpenAI-compatible SDK
   */
  private async callGroq(
    customerName: string,
    customerMessage: string,
    history: ConversationMessageHistory[],
    project: ProjectContext
  ): Promise<StructuredAIOutput> {
    const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

    const systemPrompt = `${SYSTEM_INSTRUCTIONS}

${REAL_ESTATE_BUSINESS_RULES}

${formatProjectKnowledge(project)}

CRITICAL OUTPUT INSTRUCTIONS:
You MUST return ONLY a single valid JSON object. No explanation, no markdown text outside the JSON.
The JSON must follow this exact structure:
{
  "intent": "PROPERTY_INTEREST" | "PRICE_INQUIRY" | "SITE_VISIT" | "CALLBACK_REQUEST" | "NOT_INTERESTED" | "GENERAL_INQUIRY",
  "interestLevel": "HIGH" | "MEDIUM" | "LOW" | "NOT_INTERESTED",
  "followUpRequired": boolean,
  "followUpReason": "Clear reason for sales team",
  "configuration": "2 BHK" | "3 BHK" | null,
  "budget": number_in_rupees | null (e.g. 15000000 for 1.5 Cr, 12000000 for 1.2 Cr, 8000000 for 80 Lakhs),
  "preferredLocation": string | null,
  "callbackRequested": boolean,
  "siteVisitRequested": boolean,
  "summary": "1-2 sentence executive summary",
  "nextSuggestedMessage": "Short, friendly WhatsApp message for ${customerName}"
}

CONVERSATION FLOW GUIDELINES:
1. If the customer just replied "yes" / confirmed interest without specifying a configuration, ask whether they are looking for a 2 BHK or a 3 BHK in ${project.name}.
2. If configuration (e.g. 2 BHK) is provided but budget is not yet stated, ask for their approximate budget.
3. If both configuration and budget are stated (or if the customer updates their budget, e.g. to 1.2 crore), acknowledge the budget and ask if our sales team can call them to share matching options.
4. If customer requests a callback (e.g. "call tomorrow afternoon"), set callbackRequested: true, followUpRequired: true, and confirm the timing.
5. If customer requests a site visit, set siteVisitRequested: true, followUpRequired: true, and ask what day/time suits them.
6. If customer is not interested or asks not to contact, set intent: "NOT_INTERESTED", interestLevel: "NOT_INTERESTED", followUpRequired: false, and politely close.
7. Only extract configuration and budget from CUSTOMER messages. Never treat AI outreach text as the customer's selection.`;

    const userPrompt = `LEAD NAME: ${customerName}
PROJECT: ${project.name}

CONVERSATION HISTORY (in chronological order):
${formatConversationHistory(history)}

LATEST MESSAGE FROM ${customerName}:
"${customerMessage}"

Analyze the conversation context and return the structured JSON object.`;

    const response = await this.groqClient!.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 1500,
    });

    const rawContent = response.choices[0]?.message?.content?.trim() ?? '';
    const parsed = this.parseGroqJson(rawContent);

    const normalizedBudget = this.normalizeBudget(parsed.budget);

    return {
      intent: VALID_INTENTS.has(parsed.intent) ? parsed.intent : 'GENERAL_INQUIRY',
      interestLevel: VALID_INTEREST_LEVELS.has(parsed.interestLevel)
        ? parsed.interestLevel
        : 'MEDIUM',
      followUpRequired: Boolean(parsed.followUpRequired),
      followUpReason: parsed.followUpReason || 'Lead engaged with AI assistant',
      configuration: parsed.configuration || null,
      budget: normalizedBudget,
      preferredLocation: parsed.preferredLocation || null,
      callbackRequested: Boolean(parsed.callbackRequested),
      siteVisitRequested: Boolean(parsed.siteVisitRequested),
      summary: parsed.summary || `Customer inquired about ${project.name}`,
      nextSuggestedMessage:
        parsed.nextSuggestedMessage ||
        `Thank you, ${customerName}! Our team for ${project.name} will be in touch shortly.`,
      model: response.model || model,
      promptVersion: this.promptVersion,
    };
  }

  private parseGroqJson(raw: string): any {
    if (!raw) {
      throw new Error('Groq returned an empty response.');
    }

    try {
      return JSON.parse(raw);
    } catch (_) {}

    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]+?)```/);
    if (fenceMatch) {
      try {
        return JSON.parse(fenceMatch[1].trim());
      } catch (_) {}
    }

    const braceMatch = raw.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      try {
        return JSON.parse(braceMatch[0]);
      } catch (_) {}
    }

    logger.error({ raw: raw.substring(0, 300) }, 'Groq returned non-parseable output.');
    throw new Error(`Failed to parse Groq output as JSON: ${raw.substring(0, 200)}`);
  }

  private normalizeBudget(val: any): number | null {
    if (typeof val === 'number') {
      if (val > 100000) return Math.round(val);
      if (val > 0 && val <= 100) return Math.round(val * 10000000);
    }
    if (typeof val === 'string') {
      const crMatch = val.match(/(\d+(?:\.\d+)?)\s*(?:cr|crore|crores)/i);
      if (crMatch) return Math.round(parseFloat(crMatch[1]) * 10000000);
      const lakhMatch = val.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lacs|lac|l)\b/i);
      if (lakhMatch) return Math.round(parseFloat(lakhMatch[1]) * 100000);
      const numMatch = val.replace(/[^0-9.]/g, '');
      const parsedNum = parseFloat(numMatch);
      if (!isNaN(parsedNum)) {
        if (parsedNum > 100000) return Math.round(parsedNum);
        if (parsedNum <= 100) return Math.round(parsedNum * 10000000);
      }
    }
    return null;
  }

  private fallbackAnalysis(
    customerName: string,
    customerMessage: string,
    history: ConversationMessageHistory[],
    project: ProjectContext
  ): StructuredAIOutput {
    const text = customerMessage.toLowerCase().trim();

    const customerMessages = [
      ...history.filter((m) => m.senderType === 'CUSTOMER').map((m) => m.messageText.toLowerCase()),
      text,
    ];
    const customerAllText = customerMessages.join(' ');

    const isNegative =
      /\b(not interested|na|nahi|nai|don't contact|dont contact|wrong number|already bought|already purchased|stop|unsubscribe|not looking|no thanks|no thank you)\b/i.test(
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
        nextSuggestedMessage: `Understood, ${customerName}. Thank you for letting us know! Have a wonderful day ahead. 😊`,
        model: 'heuristic-fallback-v2',
        promptVersion: this.promptVersion,
      };
    }

    const callbackRequested =
      /\b(call me|call karna|phone karna|callback|kal call|call tomorrow|call after|connect on call|call kar|call please)\b/i.test(
        customerAllText
      );

    const siteVisitRequested =
      /\b(site visit|visit|kab dekh sakte|when can i visit|location visit|sample flat|visit karna|site dekhna)\b/i.test(
        customerAllText
      );

    const bhkMatch = customerAllText.match(/\b([1-5])\s*(?:bhk|bedroom|rk)\b/i);
    const configuration = bhkMatch ? `${bhkMatch[1]} BHK` : null;

    let budget: number | null = null;
    for (let i = customerMessages.length - 1; i >= 0; i--) {
      const msg = customerMessages[i];
      const crMatch = msg.match(/(\d+(?:\.\d+)?)\s*(?:cr|crore|crores)/i);
      const lakhMatch = msg.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lacs|lac|l)\b/i);
      if (crMatch) {
        budget = Math.round(parseFloat(crMatch[1]) * 10000000);
        break;
      } else if (lakhMatch) {
        budget = Math.round(parseFloat(lakhMatch[1]) * 100000);
        break;
      }
    }

    let intent: StructuredAIOutput['intent'] = 'GENERAL_INQUIRY';
    let interestLevel: StructuredAIOutput['interestLevel'] = 'MEDIUM';
    let followUpRequired = false;
    let followUpReason = 'Customer showed initial engagement';

    if (callbackRequested) {
      intent = 'CALLBACK_REQUEST';
      interestLevel = 'HIGH';
      followUpRequired = true;
      followUpReason = 'Customer requested a direct callback from our sales team';
    } else if (siteVisitRequested) {
      intent = 'SITE_VISIT';
      interestLevel = 'HIGH';
      followUpRequired = true;
      followUpReason = 'Customer inquired about arranging a site visit';
    } else if (/\b(price|cost|pricing|rate|budget|bhav|daam|quotation|kitna)\b/i.test(customerAllText)) {
      intent = 'PRICE_INQUIRY';
      interestLevel = budget || configuration ? 'HIGH' : 'MEDIUM';
      followUpRequired = true;
      followUpReason = `Customer asked for price details (${configuration || 'configuration'} inquired)`;
    } else if (/\b(yes|haan|ha|han|interested|looking for|chahiye|need|yes please)\b/i.test(text)) {
      intent = 'PROPERTY_INTEREST';
      interestLevel = 'HIGH';
      followUpRequired = true;
      followUpReason = 'Customer confirmed active interest in the project';
    }

    let nextSuggestedMessage: string;

    if (callbackRequested) {
      nextSuggestedMessage = `Got it, ${customerName}! 📞 Our property consultant for ${project.name} will call you shortly. What is a good time to reach you?`;
    } else if (siteVisitRequested) {
      nextSuggestedMessage = `We would love to host you at ${project.name}! 🏠 Would tomorrow or this weekend suit you best for the site visit?`;
    } else if (!configuration) {
      nextSuggestedMessage = `Great! 😊 Are you looking for a 2 BHK or a 3 BHK in ${project.name}?`;
    } else if (!budget) {
      nextSuggestedMessage = `Sure! What is your approximate budget for the ${configuration}?`;
    } else {
      nextSuggestedMessage = `Thank you! Would you like our sales team to call you and share the available ${configuration} options within your budget?`;
      followUpRequired = true;
      followUpReason = `Customer shared ${configuration} preference with budget of ₹${(budget / 100000).toFixed(0)} Lakhs`;
    }

    const summaryParts: string[] = [];
    if (configuration) summaryParts.push(`seeking ${configuration}`);
    if (budget) summaryParts.push(`budget ₹${(budget / 100000).toFixed(1)}L`);
    if (callbackRequested) summaryParts.push('requested callback');
    if (siteVisitRequested) summaryParts.push('requested site visit');
    const summary =
      summaryParts.length > 0
        ? `${customerName} is ${summaryParts.join(', ')} for ${project.name}.`
        : `${customerName} engaged with initial inquiry regarding ${project.name}.`;

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
      model: 'heuristic-fallback-v2',
      promptVersion: this.promptVersion,
    };
  }
}

export const groqService = new GroqService();
export default groqService;
