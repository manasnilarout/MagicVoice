export interface ExternalConfig {
  app: {
    name: string;
    description: string;
    version?: string;
  };
  
  bot: {
    defaultLanguage: string;
    supportedLanguages: string[];
    voice?: string;
    model?: string;
    temperature?: number;
  };
  
  persona: {
    type: string;
    name: string;
    role: string;
    company: string;
    tone: string;
    variables?: Record<string, any>;
  };
  
  features?: {
    allowInterruption?: boolean;
    enableLogging?: boolean;
    recordCalls?: boolean;
    maxCallDuration?: number;
  };
}