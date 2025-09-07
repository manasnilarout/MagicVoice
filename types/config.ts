export interface AppConfiguration {
  app: {
    name: string;
    description: string;
    version: string;
  };
  
  bot: {
    defaultLanguage: string;
    supportedLanguages: string[];
    voice: string;
    model: string;
    temperature: number;
  };
  
  persona: BotPersona;
  
  features: {
    allowInterruption: boolean;
    enableLogging: boolean;
    recordCalls: boolean;
    maxCallDuration: number; // in seconds
  };
  
  twilio: {
    webhookBasePath: string;
    statusCallbackEvents: string[];
  };
  
  openai: {
    realtimeApiUrl: string;
    audioFormat: string;
    turnDetection: string;
  };
}

export interface BotPersona {
  type: string;
  name: string;
  role: string;
  company: string;
  tone: string;
  contextTemplate: string;
  instructionsTemplate: string;
  variables: Record<string, any>;
}

export interface LanguagePrompt {
  language: string;
  greeting: string;
  defaultResponse: string;
  errorMessage: string;
  endMessage: string;
  customPhrases?: Record<string, string>;
}