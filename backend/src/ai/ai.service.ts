import groqService, { StructuredAIOutput } from './groqService';
import conversationEngine, {
  ConversationEngine,
  ConversationIntent,
  EngineDecision,
  ConversationState,
} from './conversationEngine';

export {
  StructuredAIOutput,
  conversationEngine,
  ConversationEngine,
  ConversationIntent,
  EngineDecision,
  ConversationState,
  groqService,
};

export const aiService = groqService;
export default conversationEngine;
