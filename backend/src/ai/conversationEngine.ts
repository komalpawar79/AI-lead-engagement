/**
 * ConversationEngine — Pure lead qualification and entity extraction utility.
 *
 * Designed to extract real estate qualification data strictly from CUSTOMER
 * messages, avoiding false positive matches from AI outreach or system prompts.
 */

import { ConversationMessageHistory } from './prompts';

export type ConversationStep =
  | 'INITIAL'
  | 'ASK_BHK'
  | 'ASK_BUDGET'
  | 'ASK_CALLBACK'
  | 'CALLBACK_PENDING'
  | 'SITE_VISIT'
  | 'NOT_INTERESTED'
  | 'COMPLETE';

export interface ExtractionResult {
  configuration: string | null;
  budget: number | null;
  callbackRequested: boolean;
  siteVisitRequested: boolean;
  isNegative: boolean;
  currentStep: ConversationStep;
}

/**
 * Extract entities and conversation step strictly from CUSTOMER messages.
 */
export function extractFromCustomerMessages(
  history: ConversationMessageHistory[],
  currentCustomerMessage: string
): ExtractionResult {
  const current = currentCustomerMessage.toLowerCase().trim();

  // Combine only customer messages (never AI or system)
  const customerMessages = [
    ...history.filter((m) => m.senderType === 'CUSTOMER').map((m) => m.messageText.toLowerCase()),
    current,
  ];
  const combined = customerMessages.join(' ');

  // Negative intent detection
  const isNegative =
    /\b(not interested|na|nahi|nai|don't contact|dont contact|wrong number|already bought|already purchased|stop|unsubscribe|not looking|no thanks|no thank you)\b/i.test(
      current
    );

  // Callback detection
  const callbackRequested =
    /\b(call me|call karna|phone karna|callback|kal call|call tomorrow|call after|connect on call|call kar|call please)\b/i.test(
      combined
    );

  // Site visit detection
  const siteVisitRequested =
    /\b(site visit|visit|kab dekh sakte|when can i visit|location visit|sample flat|visit karna|site dekhna)\b/i.test(
      combined
    );

  // BHK extraction (from customer messages only)
  const bhkMatch = combined.match(/\b([1-5])\s*(?:bhk|bedroom|rk)\b/i);
  const configuration = bhkMatch ? `${bhkMatch[1]} BHK` : null;

  // Budget extraction — take the most recent customer budget mention
  let budget: number | null = null;
  for (let i = customerMessages.length - 1; i >= 0; i--) {
    const msg = customerMessages[i];
    const crMatch = msg.match(/(\d+(?:\.\d+)?)\s*(?:cr|crore|crores)/i);
    const lakhMatch = msg.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lacs|lac|l)\b/i);
    if (crMatch) {
      budget = Math.round(parseFloat(crMatch[1]) * 10_000_000);
      break;
    } else if (lakhMatch) {
      budget = Math.round(parseFloat(lakhMatch[1]) * 100_000);
      break;
    }
  }

  // Determine conversation step
  let currentStep: ConversationStep = 'INITIAL';

  if (isNegative) {
    currentStep = 'NOT_INTERESTED';
  } else if (callbackRequested) {
    currentStep = 'CALLBACK_PENDING';
  } else if (siteVisitRequested) {
    currentStep = 'SITE_VISIT';
  } else if (configuration && budget) {
    currentStep = 'COMPLETE';
  } else if (configuration && !budget) {
    currentStep = 'ASK_BUDGET';
  } else {
    const hasInterest =
      /\b(yes|haan|ha|han|interested|looking for|chahiye|need|yes please)\b/i.test(current);
    currentStep = hasInterest || history.length > 0 ? 'ASK_BHK' : 'INITIAL';
  }

  return {
    configuration,
    budget,
    callbackRequested,
    siteVisitRequested,
    isNegative,
    currentStep,
  };
}

export function formatBudget(budget: number): string {
  if (budget >= 10_000_000) {
    return `₹${(budget / 10_000_000).toFixed(1)} Cr`;
  }
  return `₹${(budget / 100_000).toFixed(0)} Lakhs`;
}
