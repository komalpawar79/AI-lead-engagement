import logger from '../utils/logger';
import { ProjectContext, ConversationMessageHistory } from './prompts';
import groqService from './groqService';

export type ConversationIntent =
  | 'NEW_QUESTION'
  | 'PROPERTY_INTEREST'
  | 'CALLBACK_REQUEST'
  | 'CALLBACK_CONFIRMATION'
  | 'SITE_VISIT'
  | 'BUDGET_UPDATE'
  | 'ACKNOWLEDGMENT'
  | 'CONVERSATION_CLOSING'
  | 'OPT_OUT'
  | 'AMBIGUOUS';

export type AssistantActionType =
  | 'ASKED_PROPERTY_INTEREST'
  | 'ASKED_CONFIGURATION'
  | 'ASKED_BUDGET'
  | 'ASKED_CALLBACK_INTEREST'
  | 'ASKED_CALLBACK_TIME'
  | 'ASKED_SITE_VISIT_TIME'
  | 'CONFIRMED_CALLBACK'
  | 'CONFIRMED_SITE_VISIT'
  | 'UPDATED_CALLBACK_TIME'
  | 'ANSWERED_QUESTION'
  | 'ACKNOWLEDGED_CLOSING'
  | 'OPT_OUT_CLOSED'
  | 'NONE';

export type PendingQuestionType =
  | 'CONFIGURATION'
  | 'BUDGET'
  | 'CALLBACK_OFFER'
  | 'CALLBACK_TIME'
  | 'SITE_VISIT_TIME'
  | 'NONE';

export interface ConversationState {
  conversationId: string;
  leadId: string;
  leadName: string;
  leadPhone?: string;
  status: 'ACTIVE' | 'IDLE' | 'CLOSED' | 'PAUSED';
  lastCustomerIntent?: string | null;
  lastAssistantAction?: string | null;
  pendingQuestion?: string | null;
  actionType?: 'CALLBACK' | 'SITE_VISIT' | 'NONE' | null;
  actionStatus?: 'NONE' | 'PENDING_TIME' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | null;
  actionTime?: string | null;
  actionConfirmed?: boolean;
  knownConfiguration?: string | null;
  knownBudget?: number | null;
}

export interface EngineDecision {
  intent: ConversationIntent;
  proposedAction: {
    type:
      | 'SCHEDULE_CALLBACK'
      | 'UPDATE_CALLBACK_TIME'
      | 'SCHEDULE_SITE_VISIT'
      | 'OPT_OUT'
      | 'ANSWER_QUESTION'
      | 'POLITE_CLOSING'
      | 'NO_REPLY'
      | 'ASK_QUALIFYING';
    time?: string | null;
    reason?: string;
    details?: any;
  };
  shouldSendReply: boolean;
  replyMessage: string | null;
  updatedState: {
    status: 'ACTIVE' | 'IDLE' | 'CLOSED';
    lastCustomerIntent: ConversationIntent;
    lastAssistantAction: AssistantActionType;
    pendingQuestion: PendingQuestionType;
    actionType: 'CALLBACK' | 'SITE_VISIT' | 'NONE';
    actionStatus: 'NONE' | 'PENDING_TIME' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
    actionTime: string | null;
    actionConfirmed: boolean;
  };
  extractedData: {
    configuration?: string | null;
    budget?: number | null;
    preferredLocation?: string | null;
    actionTime?: string | null;
  };
  interestLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'NOT_INTERESTED';
  followUpRequired: boolean;
  followUpReason: string;
  summary: string;
}

export class ConversationEngine {
  /**
   * Main entry point to process an incoming customer message in context
   */
  public async evaluateMessage(
    state: ConversationState,
    incomingMessage: string,
    history: ConversationMessageHistory[],
    project: ProjectContext
  ): Promise<EngineDecision> {
    const rawText = incomingMessage.trim();
    const textLower = rawText.toLowerCase();

    // 1. Context-Aware Pending Question & Prior State Inference
    const pendingQuestion = this.inferPendingQuestion(state, history);
    const wasConfirmed = Boolean(
      state.actionConfirmed ||
        state.actionStatus === 'CONFIRMED' ||
        state.lastAssistantAction === 'CONFIRMED_CALLBACK' ||
        state.lastAssistantAction === 'CONFIRMED_SITE_VISIT'
    );
    const existingTime = state.actionTime || this.findPreviouslyConfirmedTime(history);

    // 2. Classify Intent in Full Context
    const intent = this.classifyIntent(textLower, rawText, pendingQuestion, wasConfirmed, history);
    logger.info(
      {
        leadName: state.leadName,
        intent,
        pendingQuestion,
        wasConfirmed,
        existingTime,
      },
      'Context-aware intent classified'
    );

    // 3. Process Intent According to State Machine Rules

    // ------------------------------------------------------------------------
    // SCENARIO F: OPT-OUT OR NOT INTERESTED
    // ------------------------------------------------------------------------
    if (intent === 'OPT_OUT') {
      const replyMessage = `Understood, ${state.leadName}. We will not contact you again. Have a great day ahead! 😊`;
      return {
        intent: 'OPT_OUT',
        proposedAction: { type: 'OPT_OUT' },
        shouldSendReply: true,
        replyMessage,
        updatedState: {
          status: 'CLOSED',
          lastCustomerIntent: 'OPT_OUT',
          lastAssistantAction: 'OPT_OUT_CLOSED',
          pendingQuestion: 'NONE',
          actionType: 'NONE',
          actionStatus: 'CANCELLED',
          actionTime: null,
          actionConfirmed: false,
        },
        extractedData: {},
        interestLevel: 'NOT_INTERESTED',
        followUpRequired: false,
        followUpReason: 'Customer requested opt-out or no further contact',
        summary: `${state.leadName} explicitly requested to opt-out of communications.`,
      };
    }

    // ------------------------------------------------------------------------
    // SCENARIO D: CUSTOMER CHANGES CALLBACK TIME AFTER CONFIRMATION
    // ------------------------------------------------------------------------
    const detectedTime = this.extractTimePhrase(rawText);
    const isTimeChangeRequest =
      wasConfirmed &&
      detectedTime &&
      (detectedTime.toLowerCase() !== (existingTime || '').toLowerCase() ||
        /\b(actually|change|make it|instead|reschedule|shift|kal|today|tomorrow|half|mins?|hours?|ghante?)\b/i.test(textLower));

    if (isTimeChangeRequest && detectedTime) {
      const normalizedTime = this.formatTimeDisplay(detectedTime);
      const replyMessage = `Sure, I have updated the time. Our team will call you ${normalizedTime} instead.`;
      return {
        intent: 'CALLBACK_CONFIRMATION',
        proposedAction: {
          type: 'UPDATE_CALLBACK_TIME',
          time: normalizedTime,
          reason: `Customer rescheduled callback to ${normalizedTime}`,
        },
        shouldSendReply: true,
        replyMessage,
        updatedState: {
          status: 'ACTIVE',
          lastCustomerIntent: 'CALLBACK_CONFIRMATION',
          lastAssistantAction: 'UPDATED_CALLBACK_TIME',
          pendingQuestion: 'NONE',
          actionType: 'CALLBACK',
          actionStatus: 'CONFIRMED',
          actionTime: normalizedTime,
          actionConfirmed: true,
        },
        extractedData: { actionTime: normalizedTime },
        interestLevel: 'HIGH',
        followUpRequired: true,
        followUpReason: `Updated callback scheduled for ${normalizedTime}`,
        summary: `${state.leadName} updated their callback time to ${normalizedTime}.`,
      };
    }

    // ------------------------------------------------------------------------
    // SCENARIO A: COMPLETED CONFIRMATION -> ACKNOWLEDGMENT / CLOSING / IDLE
    // Rule 1: Never repeat completed callback on "Thank you" or "Ok".
    // Rule 2: Respond briefly to thanks ("You're welcome, Rahul! 😊").
    // Rule 3 & 4: Allow conversation to become idle; no-reply if already closed.
    // ------------------------------------------------------------------------
    if (wasConfirmed && (intent === 'ACKNOWLEDGMENT' || intent === 'CONVERSATION_CLOSING')) {
      const isThanks = /\b(thank|thanks|thx|dhanyawad|shukriya)\b/i.test(textLower);
      const alreadyPolitelyClosed =
        state.lastAssistantAction === 'ACKNOWLEDGED_CLOSING' ||
        state.status === 'IDLE' ||
        state.status === 'CLOSED';

      if (isThanks && !alreadyPolitelyClosed) {
        // Customer says "Thank you" after confirmation -> Aria says "You're welcome, Rahul! 😊"
        const replyMessage = `You're welcome, ${state.leadName}! 😊`;
        return {
          intent: 'ACKNOWLEDGMENT',
          proposedAction: { type: 'POLITE_CLOSING' },
          shouldSendReply: true,
          replyMessage,
          updatedState: {
            status: 'IDLE',
            lastCustomerIntent: 'ACKNOWLEDGMENT',
            lastAssistantAction: 'ACKNOWLEDGED_CLOSING',
            pendingQuestion: 'NONE',
            actionType: 'CALLBACK',
            actionStatus: 'CONFIRMED',
            actionTime: existingTime,
            actionConfirmed: true,
          },
          extractedData: { actionTime: existingTime },
          interestLevel: 'HIGH',
          followUpRequired: true,
          followUpReason: `Callback confirmed for ${existingTime || 'requested time'}`,
          summary: `${state.leadName} acknowledged callback for ${existingTime || 'scheduled time'}. Conversation idle.`,
        };
      }

      // Customer sends "Ok", "Great", or another acknowledgment after conversation is already acknowledged or closed
      // Support NO_REPLY: do not spam customer with repeated confirmations!
      return {
        intent: 'ACKNOWLEDGMENT',
        proposedAction: { type: 'NO_REPLY' },
        shouldSendReply: false,
        replyMessage: null,
        updatedState: {
          status: 'IDLE',
          lastCustomerIntent: 'ACKNOWLEDGMENT',
          lastAssistantAction: state.lastAssistantAction as AssistantActionType || 'ACKNOWLEDGED_CLOSING',
          pendingQuestion: 'NONE',
          actionType: 'CALLBACK',
          actionStatus: 'CONFIRMED',
          actionTime: existingTime,
          actionConfirmed: true,
        },
        extractedData: { actionTime: existingTime },
        interestLevel: 'HIGH',
        followUpRequired: true,
        followUpReason: `Callback confirmed for ${existingTime || 'requested time'}`,
        summary: `${state.leadName} sent closing acknowledgment. Conversation marked idle with no unnecessary reply.`,
      };
    }

    // ------------------------------------------------------------------------
    // SCENARIO B & G: NEW QUESTION OR INFORMATION REQUEST
    // Rule 6: Do not suppress genuine questions even if conversation was idle.
    // Answers price, location, amenities, etc. without repeating callback!
    // ------------------------------------------------------------------------
    if (intent === 'NEW_QUESTION') {
      const answer = await this.generateAnswerForQuestion(
        rawText,
        state,
        project,
        history
      );

      return {
        intent: 'NEW_QUESTION',
        proposedAction: { type: 'ANSWER_QUESTION' },
        shouldSendReply: true,
        replyMessage: answer,
        updatedState: {
          status: 'ACTIVE',
          lastCustomerIntent: 'NEW_QUESTION',
          lastAssistantAction: 'ANSWERED_QUESTION',
          pendingQuestion: 'NONE',
          actionType: state.actionType || 'NONE',
          actionStatus: state.actionStatus || 'NONE',
          actionTime: state.actionTime || null,
          actionConfirmed: state.actionConfirmed || false,
        },
        extractedData: {
          configuration: this.extractConfiguration(rawText) || state.knownConfiguration,
        },
        interestLevel: 'HIGH',
        followUpRequired: wasConfirmed || true,
        followUpReason: wasConfirmed
          ? `Lead asked additional question after callback scheduled: "${rawText}"`
          : `Lead inquired with question: "${rawText}"`,
        summary: `${state.leadName} asked: "${rawText}". Aria answered with project details.`,
      };
    }

    // ------------------------------------------------------------------------
    // SCENARIO C: CUSTOMER SAYS "OK" / "YES" TO CALLBACK OFFER
    // Aria: "Would you like our sales team to call you?"
    // Customer: "Ok" / "Yes" -> Request callback and ask for convenient time
    // ------------------------------------------------------------------------
    if (
      pendingQuestion === 'CALLBACK_OFFER' &&
      (intent === 'CALLBACK_REQUEST' ||
        /\b(ok|okay|yes|sure|haan|ha|definitely|fine|please|karna|kar lo|connect)\b/i.test(textLower))
    ) {
      const replyMessage = `Our team will call you. What is a convenient time?`;
      return {
        intent: 'CALLBACK_REQUEST',
        proposedAction: {
          type: 'ASK_QUALIFYING',
          details: { askingFor: 'CALLBACK_TIME' },
        },
        shouldSendReply: true,
        replyMessage,
        updatedState: {
          status: 'ACTIVE',
          lastCustomerIntent: 'CALLBACK_REQUEST',
          lastAssistantAction: 'ASKED_CALLBACK_TIME',
          pendingQuestion: 'CALLBACK_TIME',
          actionType: 'CALLBACK',
          actionStatus: 'PENDING_TIME',
          actionTime: null,
          actionConfirmed: false,
        },
        extractedData: {},
        interestLevel: 'HIGH',
        followUpRequired: true,
        followUpReason: 'Customer requested a callback; awaiting convenient time',
        summary: `${state.leadName} agreed to a phone call from the sales team. Awaiting preferred time.`,
      };
    }

    // ------------------------------------------------------------------------
    // CUSTOMER PROVIDES CALLBACK TIME (e.g. "Today around 6:30 PM")
    // Aria: "Our team will call you. What is a convenient time?"
    // Customer: "Today around 6:30 PM."
    // Aria: "Sure, our team will call you today at 6:30 PM."
    // ------------------------------------------------------------------------
    if (pendingQuestion === 'CALLBACK_TIME' || (intent === 'CALLBACK_CONFIRMATION' && detectedTime)) {
      const timeToSchedule = detectedTime ? this.formatTimeDisplay(detectedTime) : 'at your preferred time';
      const replyMessage = `Sure, our team will call you ${timeToSchedule}.`;
      return {
        intent: 'CALLBACK_CONFIRMATION',
        proposedAction: {
          type: 'SCHEDULE_CALLBACK',
          time: timeToSchedule,
          reason: `Customer scheduled callback for ${timeToSchedule}`,
        },
        shouldSendReply: true,
        replyMessage,
        updatedState: {
          status: 'ACTIVE',
          lastCustomerIntent: 'CALLBACK_CONFIRMATION',
          lastAssistantAction: 'CONFIRMED_CALLBACK',
          pendingQuestion: 'NONE',
          actionType: 'CALLBACK',
          actionStatus: 'CONFIRMED',
          actionTime: timeToSchedule,
          actionConfirmed: true,
        },
        extractedData: { actionTime: timeToSchedule },
        interestLevel: 'HIGH',
        followUpRequired: true,
        followUpReason: `Callback confirmed for ${timeToSchedule}`,
        summary: `${state.leadName} confirmed callback time: ${timeToSchedule}.`,
      };
    }

    // ------------------------------------------------------------------------
    // BUDGET OR PREFERENCE UPDATE (e.g. "My budget is ₹1.50 Cr")
    // ------------------------------------------------------------------------
    const budgetVal = this.extractBudget(rawText);
    if (intent === 'BUDGET_UPDATE' || budgetVal !== null) {
      const budgetDisplay = budgetVal ? `₹${(budgetVal / 10000000).toFixed(2)} Cr` : '';
      const replyMessage = `Thank you! Would you like our sales team to call you?`;
      return {
        intent: 'BUDGET_UPDATE',
        proposedAction: {
          type: 'ASK_QUALIFYING',
          details: { askingFor: 'CALLBACK_OFFER' },
        },
        shouldSendReply: true,
        replyMessage,
        updatedState: {
          status: 'ACTIVE',
          lastCustomerIntent: 'BUDGET_UPDATE',
          lastAssistantAction: 'ASKED_CALLBACK_INTEREST',
          pendingQuestion: 'CALLBACK_OFFER',
          actionType: state.actionType || 'NONE',
          actionStatus: state.actionStatus || 'NONE',
          actionTime: state.actionTime || null,
          actionConfirmed: state.actionConfirmed || false,
        },
        extractedData: {
          budget: budgetVal,
        },
        interestLevel: 'HIGH',
        followUpRequired: true,
        followUpReason: `Customer specified budget of ${budgetDisplay}`,
        summary: `${state.leadName} updated their budget to ${budgetDisplay}.`,
      };
    }

    // ------------------------------------------------------------------------
    // NEW PROPERTY / CONFIGURATION INTEREST (e.g. "I am looking for a 2 BHK")
    // ------------------------------------------------------------------------
    const configVal = this.extractConfiguration(rawText);
    if (intent === 'PROPERTY_INTEREST' || configVal) {
      const configItem = this.findMatchingConfig(configVal || '2 BHK', project);
      const startingPriceStr = configItem ? configItem.priceDisplay : 'competitive rates';
      const replyMessage = configVal
        ? `The ${configVal} starts at ${startingPriceStr}. Could you share your budget?`
        : `Are you looking for a 2 BHK or a 3 BHK in ${project.name}?`;

      return {
        intent: 'PROPERTY_INTEREST',
        proposedAction: {
          type: 'ASK_QUALIFYING',
          details: { askingFor: configVal ? 'BUDGET' : 'CONFIGURATION' },
        },
        shouldSendReply: true,
        replyMessage,
        updatedState: {
          status: 'ACTIVE',
          lastCustomerIntent: 'PROPERTY_INTEREST',
          lastAssistantAction: configVal ? 'ASKED_BUDGET' : 'ASKED_CONFIGURATION',
          pendingQuestion: configVal ? 'BUDGET' : 'CONFIGURATION',
          actionType: state.actionType || 'NONE',
          actionStatus: state.actionStatus || 'NONE',
          actionTime: state.actionTime || null,
          actionConfirmed: state.actionConfirmed || false,
        },
        extractedData: {
          configuration: configVal,
        },
        interestLevel: 'HIGH',
        followUpRequired: true,
        followUpReason: `Inquired about ${configVal || 'properties'} in ${project.name}`,
        summary: `${state.leadName} expressed interest in ${configVal || 'properties'} in ${project.name}.`,
      };
    }

    // ------------------------------------------------------------------------
    // DEFAULT / AMBIGUOUS / GENERAL INQUIRY
    // ------------------------------------------------------------------------
    return {
      intent: 'AMBIGUOUS',
      proposedAction: { type: 'ANSWER_QUESTION' },
      shouldSendReply: true,
      replyMessage: `Thank you, ${state.leadName}! How can I assist you with ${project.name} today?`,
      updatedState: {
        status: 'ACTIVE',
        lastCustomerIntent: 'AMBIGUOUS',
        lastAssistantAction: 'ANSWERED_QUESTION',
        pendingQuestion: 'NONE',
        actionType: state.actionType || 'NONE',
        actionStatus: state.actionStatus || 'NONE',
        actionTime: state.actionTime || null,
        actionConfirmed: state.actionConfirmed || false,
      },
      extractedData: {},
      interestLevel: 'MEDIUM',
      followUpRequired: false,
      followUpReason: 'Lead sent general or ambiguous query',
      summary: `${state.leadName} sent an inquiry regarding ${project.name}.`,
    };
  }

  /**
   * Infer the active pending question based on conversation history and state
   */
  private inferPendingQuestion(
    state: ConversationState,
    history: ConversationMessageHistory[]
  ): PendingQuestionType {
    if (state.pendingQuestion && state.pendingQuestion !== 'NONE') {
      return state.pendingQuestion as PendingQuestionType;
    }

    // Scan the most recent AI message
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].senderType === 'AI') {
        const text = history[i].messageText.toLowerCase();
        if (
          text.includes('would you like our sales team to call you') ||
          text.includes('can our team call you') ||
          text.includes('call you to share')
        ) {
          return 'CALLBACK_OFFER';
        }
        if (
          text.includes('convenient time') ||
          text.includes('good time to reach you') ||
          text.includes('what time') ||
          text.includes('what is a good time')
        ) {
          return 'CALLBACK_TIME';
        }
        if (text.includes('share your budget') || text.includes('approximate budget')) {
          return 'BUDGET';
        }
        if (text.includes('looking for a 2 bhk or a 3 bhk') || text.includes('which configuration')) {
          return 'CONFIGURATION';
        }
        break;
      }
    }

    return 'NONE';
  }

  /**
   * Classify intent with full conversational context
   */
  private classifyIntent(
    textLower: string,
    rawText: string,
    pendingQuestion: PendingQuestionType,
    wasConfirmed: boolean,
    history: ConversationMessageHistory[]
  ): ConversationIntent {
    // 1. Opt-out checks
    if (
      /\b(not interested|don'?t contact|dont contact|stop|unsubscribe|wrong number|already bought|already purchased|please don'?t call|do not message|leave me alone|please don'?t contact)\b/i.test(
        textLower
      )
    ) {
      return 'OPT_OUT';
    }

    // 2. Pending Question Context Overrides
    if (pendingQuestion === 'CALLBACK_OFFER') {
      if (/\b(ok|okay|yes|sure|haan|ha|definitely|fine|please|karna|connect|yep|yeah)\b/i.test(textLower)) {
        return 'CALLBACK_REQUEST';
      }
    }

    if (pendingQuestion === 'CALLBACK_TIME') {
      const timeFound = this.extractTimePhrase(rawText);
      if (timeFound) {
        return 'CALLBACK_CONFIRMATION';
      }
    }

    // 3. Action Already Confirmed Checks
    if (wasConfirmed) {
      // Check for time modification first (e.g. "Actually call at 7 PM", "Make it 7:00 PM", "7:00 PM")
      const timeFound = this.extractTimePhrase(rawText);
      if (
        timeFound &&
        (/\b(actually|change|make it|instead|reschedule|shift|kal|today|tomorrow)\b/i.test(textLower) ||
          /^\s*\d{1,2}(:\d{2})?\s*(?:am|pm)?\s*$/i.test(rawText.trim()))
      ) {
        return 'CALLBACK_CONFIRMATION';
      }

      // Check for Acknowledgment
      if (/\b(thank|thanks|thx|dhanyawad|shukriya)\b/i.test(textLower)) {
        return 'ACKNOWLEDGMENT';
      }

      if (/\b(ok|okay|k|great|good|fine|cool|understood|got it|theek hai|thik hai|sahi hai|perfect|done|super|awesome|👍|👌)\b/i.test(textLower)) {
        return 'ACKNOWLEDGMENT';
      }

      if (/\b(bye|goodbye|alvida|tata|have a good day|have a nice day|good night)\b/i.test(textLower)) {
        return 'CONVERSATION_CLOSING';
      }
    }

    // 4. Genuine Questions (Price, Location, Amenities, etc.)
    const isQuestion =
      textLower.includes('?') ||
      /\b(what|where|when|which|who|how|is there|can you|could you|tell me|details|brochure|link)\b/i.test(textLower);

    const isPrice = /\b(price|pricing|cost|rate|starting|starts at|quotation|cost sheet|budget)\b/i.test(textLower);
    const isLocation = /\b(location|address|kahan|kidhar|where|map|google map|directions|reach|rasta)\b/i.test(textLower);
    const isAmenities = /\b(amenities|amenity|gym|pool|swimming|clubhouse|park|garden|parking)\b/i.test(textLower);
    const isPossession = /\b(possession|completion|ready|handover|ready to move|under construction|kab tak)\b/i.test(textLower);

    if (isQuestion || isPrice || isLocation || isAmenities || isPossession) {
      // If it's pure budget update like "My budget is 1.5 Cr", treat as BUDGET_UPDATE
      if (
        /\b(my budget is|budget around|approx budget|under)\b/i.test(textLower) &&
        this.extractBudget(rawText) !== null
      ) {
        return 'BUDGET_UPDATE';
      }
      return 'NEW_QUESTION';
    }

    // 5. Budget update
    if (this.extractBudget(rawText) !== null) {
      return 'BUDGET_UPDATE';
    }

    // 6. Property / BHK interest
    if (this.extractConfiguration(rawText)) {
      return 'PROPERTY_INTEREST';
    }

    // 7. Site visit
    if (/\b(site visit|visit|sample flat|kab dekh sakte|site dekhna)\b/i.test(textLower)) {
      return 'SITE_VISIT';
    }

    // 8. Callback & Call with Time
    if (
      /\b(call me|callback|call karna|call krna|call karo|call kijiye|phone karna|please call|connect on call|call)\b/i.test(
        textLower
      )
    ) {
      const timeFound = this.extractTimePhrase(rawText);
      if (timeFound) {
        return 'CALLBACK_CONFIRMATION';
      }
      return 'CALLBACK_REQUEST';
    }

    // 8b. Standalone Time Phrase (e.g. "half hour mai", "in 30 mins", "after 1 hour")
    if (this.extractTimePhrase(rawText)) {
      return 'CALLBACK_CONFIRMATION';
    }

    // 9. Standard Acknowledgment
    if (/\b(thank|thanks|ok|okay|great|understood|got it|sure|theek hai)\b/i.test(textLower)) {
      return 'ACKNOWLEDGMENT';
    }

    return 'AMBIGUOUS';
  }

  /**
   * Generate an accurate answer to a new question using Project Knowledge
   */
  private async generateAnswerForQuestion(
    question: string,
    state: ConversationState,
    project: ProjectContext,
    history: ConversationMessageHistory[]
  ): Promise<string> {
    const qLower = question.toLowerCase();

    // 1. Location / Google Maps Link Query
    if (/\b(location|address|kahan|kidhar|where|map|google map|directions|reach|rasta)\b/i.test(qLower)) {
      const locText = project.fullAddress ? `${project.location} (${project.fullAddress})` : project.location;
      if (project.googleMapsUrl) {
        return `${project.name} is located at ${locText}. 📍 Here is the Google Maps link: ${project.googleMapsUrl} Would you like to schedule a visit?`;
      }
      return `${project.name} is conveniently located at ${locText}. 📍 Would you like me to share more details or arrange a site visit?`;
    }

    // 2. Pricing Query for specific configuration (e.g. 2 BHK, 3 BHK)
    const bhk = this.extractConfiguration(question);
    if (/\b(price|cost|rate|pricing|bhav|daam|cost sheet)\b/i.test(qLower) || bhk) {
      if (bhk) {
        const item = this.findMatchingConfig(bhk, project);
        if (item) {
          return `The ${item.type} in ${project.name} has a carpet area of ${item.carpetAreaSqft} sq.ft. and starts at ${item.priceDisplay}. Would you like our sales team to share the complete floor plan and cost breakdown?`;
        }
      }
      // General pricing
      const minPriceStr = project.priceMin ? `₹${(project.priceMin / 100000).toFixed(1)} Lakhs` : null;
      const maxPriceStr = project.priceMax ? `₹${(project.priceMax / 100000).toFixed(1)} Lakhs` : null;
      if (minPriceStr && maxPriceStr) {
        return `Homes at ${project.name} range from ${minPriceStr} to ${maxPriceStr} depending on the configuration. Which configuration are you interested in?`;
      }
    }

    // 3. Amenities Query
    if (/\b(amenities|amenity|gym|pool|swimming|clubhouse|park|garden|parking)\b/i.test(qLower)) {
      const amenities = project.amenities || 'Clubhouse, Swimming Pool, Gym, 24/7 Security, and Landscaped Gardens';
      return `${project.name} features premium lifestyle amenities including: ${amenities}. Would you like to schedule a visit to experience them in person?`;
    }

    // 4. Possession Query
    if (/\b(possession|completion|ready|handover|ready to move|under construction|kab tak)\b/i.test(qLower)) {
      const timeline = project.possession || 'as per the approved RERA schedule';
      return `The expected possession timeline for ${project.name} is ${timeline}. Would you like more details?`;
    }

    // 5. Developer / RERA Query
    if (/\b(developer|builder|rera|group)\b/i.test(qLower)) {
      const reraText = project.reraNumber ? ` (RERA No: ${project.reraNumber})` : '';
      return `${project.name} is developed by the reputed ${project.developer}${reraText}.`;
    }

    // 6. Check Project Knowledge FAQs
    if (project.knowledgeItems && project.knowledgeItems.length > 0) {
      for (const item of project.knowledgeItems) {
        const words = item.question.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
        const matchCount = words.filter((w) => qLower.includes(w)).length;
        if (matchCount >= 2 || (words.length > 0 && matchCount / words.length >= 0.5)) {
          return item.answer;
        }
      }
    }

    // 7. Fallback to Groq if client exists
    try {
      const groqResult = await groqService.processConversation(
        state.leadName,
        question,
        history,
        project
      );
      if (groqResult && groqResult.nextSuggestedMessage) {
        return groqResult.nextSuggestedMessage;
      }
    } catch (_) {}

    return `Thank you for asking! For ${project.name}, our property specialists have all the verified information. Would you like our sales team to give you a quick call?`;
  }

  /**
   * Helper: extract time phrases (e.g. "Today around 6:30 PM", "7:00 PM", "tomorrow 4pm")
   */
  public extractTimePhrase(text: string): string | null {
    const t = text.trim();

    // 1. Half an hour / aadha ghanta / 30 mins
    if (
      /\b(half(?:\s+an)?\s*(?:hour|hr)|halfhour|1\/2\s*hour|aadhe?\s*ghante?|adha\s*ghanta)\b/i.test(t)
    ) {
      return 'in half an hour';
    }

    // 2. X minutes (e.g. 15 mins, 20 minutes, 30 min, 45 mins)
    const minsMatch = t.match(/\b(?:in|after)?\s*(\d{1,2})\s*(?:mins?|minutes?|min)\b/i);
    if (minsMatch) {
      return `in ${minsMatch[1]} minutes`;
    }

    // 3. X hours (e.g. 1 hour, 2 hours, 1 ghanta)
    const hoursMatch = t.match(/\b(?:in|after)?\s*(\d{1,2})\s*(?:hours?|hrs?|ghante?)\b/i);
    if (hoursMatch) {
      const h = parseInt(hoursMatch[1], 10);
      return `in ${h} ${h === 1 ? 'hour' : 'hours'}`;
    }

    // 4. Time of day: evening, morning, afternoon
    if (/\b(?:this\s+|today\s+|aaj\s+)?(evening|shaam|sham)\b/i.test(t) && !/\b(tomorrow|kal)\b/i.test(t)) {
      return 'this evening';
    }
    if (/\b(?:tomorrow|kal)\s*(?:morning|subah)\b/i.test(t)) {
      return 'tomorrow morning';
    }
    if (/\b(?:tomorrow|kal)\s*(?:evening|shaam|sham)\b/i.test(t)) {
      return 'tomorrow evening';
    }
    if (/\b(?:tomorrow|kal)\s*(?:afternoon|dopahar)\b/i.test(t)) {
      return 'tomorrow afternoon';
    }
    if (/\b(?:tomorrow|kal)\b/i.test(t) && !/\d/.test(t)) {
      return 'tomorrow';
    }

    // 5. Clock time with day/period: "today around 6:30 PM", "tomorrow 5:00 pm", "today at 7 PM"
    const fullMatch = t.match(
      /(today|tomorrow|kal|aaj)?\s*(around|at|by|approx)?\s*([0-1]?[0-9]|2[0-3])(?::([0-5][0-9]))?\s*(am|pm|baje)\b(?:\s*(today|tomorrow|evening|morning|afternoon|kal|aaj))?/i
    );
    if (fullMatch && fullMatch[0].trim().length > 2) {
      return fullMatch[0].trim();
    }

    // 6. Simple clock time: "6:30 PM", "7:00 PM", "4pm", "6 PM"
    const simpleTimeMatch = t.match(/\b([0-1]?[0-9]|2[0-3])(?::([0-5][0-9]))?\s*(am|pm)\b/i);
    if (simpleTimeMatch) {
      return simpleTimeMatch[0].trim();
    }

    // 7. Matches "6:30" or "7:00"
    const digitMatch = t.match(/\b([0-1]?[0-9]|2[0-3]):([0-5][0-9])\b/);
    if (digitMatch) {
      return digitMatch[0].trim();
    }

    return null;
  }

  /**
   * Format time nicely for natural response
   */
  private formatTimeDisplay(timeStr: string): string {
    let clean = timeStr.trim();
    if (/^(in|this|tomorrow|today|after)\b/i.test(clean)) {
      return clean;
    }
    if (!/today|tomorrow|kal|aaj/i.test(clean)) {
      return `today at ${clean}`;
    }
    return clean;
  }

  /**
   * Helper: extract BHK configuration
   */
  public extractConfiguration(text: string): string | null {
    const match = text.match(/\b([1-5])\s*(?:bhk|bedroom|rk)\b/i);
    return match ? `${match[1]} BHK` : null;
  }

  /**
   * Helper: extract budget numeric value
   */
  public extractBudget(text: string): number | null {
    const crMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:cr|crore|crores)/i);
    if (crMatch) return Math.round(parseFloat(crMatch[1]) * 10000000);

    const lakhMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lacs|lac|l)\b/i);
    if (lakhMatch) return Math.round(parseFloat(lakhMatch[1]) * 100000);

    const budgetPhraseMatch = text.match(/budget\s*(?:is|around|of)?\s*(?:₹|rs\.?)?\s*(\d+(?:\.\d+)?)/i);
    if (budgetPhraseMatch) {
      const val = parseFloat(budgetPhraseMatch[1]);
      if (val > 100000) return Math.round(val);
      if (val > 0 && val <= 100) return Math.round(val * 10000000);
    }

    return null;
  }

  /**
   * Match configuration item from project inventory
   */
  private findMatchingConfig(bhk: string, project: ProjectContext) {
    if (!project.inventory || project.inventory.length === 0) return null;
    const cleanBhk = bhk.toUpperCase().replace(/\s+/g, '');
    return project.inventory.find(
      (cfg) => cfg.type.toUpperCase().replace(/\s+/g, '') === cleanBhk
    );
  }

  /**
   * Find previously confirmed time in history
   */
  private findPreviouslyConfirmedTime(history: ConversationMessageHistory[]): string | null {
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].senderType === 'AI') {
        const text = history[i].messageText;
        if (text.includes('will call you')) {
          const match = text.match(/call you (?:today at|tomorrow at|at)?\s*([^.!?]+)/i);
          if (match) return match[1].trim();
        }
      }
    }
    return null;
  }
}

export const conversationEngine = new ConversationEngine();
export default conversationEngine;
