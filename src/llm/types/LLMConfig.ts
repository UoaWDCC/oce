export interface LLMConfig {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  stopSequences?: string[];
  systemInstruction?: string;
  // Provider-specific params can be passed through without breaking the shared interface
  [key: string]: unknown;
}
