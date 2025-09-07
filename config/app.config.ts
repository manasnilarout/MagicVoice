import { AppConfiguration } from '../types/config.js';

// Minimal fallback configuration - used only when external config fails
const fallbackConfig: AppConfiguration = {
  app: {
    name: 'Voice Assistant',
    description: 'AI-powered voice assistant',
    version: '1.0.0',
  },
  
  bot: {
    defaultLanguage: 'english',
    supportedLanguages: ['english'],
    voice: 'alloy',
    model: 'gpt-4o-realtime-preview',
    temperature: 0.8,
  },
  
  persona: {
    type: 'fallback_assistant',
    name: 'Assistant',
    role: 'Customer Service Representative',
    company: 'Support Team',
    tone: 'professional',
    contextTemplate: 'You are {{name}}, a {{role}} from {{company}}. Please assist the customer professionally.',
    instructionsTemplate: 'Be helpful, clear, and professional in all interactions.',
    variables: {}
  },
  
  features: {
    allowInterruption: true,
    enableLogging: true,
    recordCalls: false,
    maxCallDuration: 600,
  },
  
  twilio: {
    webhookBasePath: '/twilio-realtime',
    statusCallbackEvents: ['initiated', 'ringing', 'answered', 'completed'],
  },
  
  openai: {
    realtimeApiUrl: 'wss://api.openai.com/v1/realtime',
    audioFormat: 'pcmu',
    turnDetection: 'server_vad',
  }
};



// Helper function to substitute variables in templates
function substituteVariables(template: string, variables: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] || match;
  });
}

// Import external config loader
import { hasExternalConfiguration, getExternalConfiguration } from './external-config-loader.js';

// Export function to list available personas
export function getAvailablePersonas(): string[] {
  // If external config exists, return just the current persona type
  if (hasExternalConfiguration()) {
    try {
      const config = getExternalConfiguration();
      return [config.persona.type];
    } catch (error) {
      console.warn('📁 Failed to load external config, using fallback:', error);
      return ['fallback_assistant'];
    }
  }
  
  // Return fallback persona only
  return ['fallback_assistant'];
}

// Main configuration getter - prioritizes external config, minimal fallback
export function getConfiguration(_personaType?: string, language?: string): AppConfiguration {
  // Try external configuration first (primary path)
  if (hasExternalConfiguration()) {
    try {
      console.log('📁 Using external configuration');
      return getExternalConfiguration(language);
    } catch (error) {
      console.warn('❌ External config failed, using fallback configuration:', error);
    }
  } else {
    console.log('📁 No external configuration found, using fallback');
  }
  
  // Use minimal fallback configuration
  console.log('⚙️ Using fallback configuration');
  const config = { ...fallbackConfig };
  
  // Apply variable substitution to fallback persona
  config.persona.contextTemplate = substituteVariables(
    config.persona.contextTemplate,
    {
      name: config.persona.name,
      role: config.persona.role,
      company: config.persona.company,
      tone: config.persona.tone,
      ...config.persona.variables
    }
  );
  
  config.persona.instructionsTemplate = substituteVariables(
    config.persona.instructionsTemplate,
    {
      name: config.persona.name,
      role: config.persona.role,
      company: config.persona.company,
      tone: config.persona.tone,
      ...config.persona.variables
    }
  );
  
  return config;
}

// Export fallback configuration
export default fallbackConfig;