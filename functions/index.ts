export interface FunctionCallArgs {
  [key: string]: any;
}

export interface FunctionResult {
  success: boolean;
  message: string;
  data?: any;
}

export interface FunctionDefinition {
  type: "function";
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required: string[];
  };
}

export function remindMeLater(args: { date: string; message: string }): FunctionResult {
  console.log('🔔 Function Call: remindMeLater');
  console.log('📅 Date:', args.date);
  console.log('💬 Message:', args.message);

  return {
    success: true,
    message: `Reminder set for ${args.date}: ${args.message}`,
    data: {
      reminderDate: args.date,
      reminderMessage: args.message,
      timestamp: new Date().toISOString()
    }
  };
}

export function sendSms(args: { message: string; phoneNumber?: string }): FunctionResult {
  console.log('📱 Function Call: sendSms');
  console.log('💬 Message:', args.message);
  console.log('📞 Phone Number:', args.phoneNumber || 'Not provided');

  return {
    success: true,
    message: `SMS sent: ${args.message}`,
    data: {
      smsMessage: args.message,
      phoneNumber: args.phoneNumber,
      timestamp: new Date().toISOString()
    }
  };
}

export function escalateItHigher(args: { message: string; severity: string; department?: string }): FunctionResult {
  console.log('🚨 Function Call: escalateItHigher');
  console.log('💬 Message:', args.message);
  console.log('⚠️ Severity:', args.severity);
  console.log('🏢 Department:', args.department || 'Not specified');

  return {
    success: true,
    message: `Issue escalated with ${args.severity} severity: ${args.message}`,
    data: {
      escalationMessage: args.message,
      severity: args.severity,
      department: args.department,
      escalationId: `ESC-${Date.now()}`,
      timestamp: new Date().toISOString()
    }
  };
}

export const FUNCTION_DEFINITIONS: FunctionDefinition[] = [
  {
    type: "function",
    name: "remindMeLater",
    description: "Set a reminder for a specific date and time. Use this when the user wants to be reminded about something later.",
    parameters: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "The date and time for the reminder in ISO format or natural language (e.g., '2024-01-15 10:00 AM', 'tomorrow at 3pm', 'next Monday')"
        },
        message: {
          type: "string",
          description: "The reminder message content"
        }
      },
      required: ["date", "message"]
    }
  },
  {
    type: "function",
    name: "sendSms",
    description: "Send an SMS message. Use this when the user wants to send a text message.",
    parameters: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "The SMS message content to send"
        },
        phoneNumber: {
          type: "string",
          description: "Optional phone number to send to. If not provided, will use caller's number or ask user."
        }
      },
      required: ["message"]
    }
  },
  {
    type: "function",
    name: "escalateItHigher",
    description: "Escalate an issue to higher management or another department. Use this when the user requests escalation or when an issue requires higher-level attention.",
    parameters: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "Description of the issue or concern that needs escalation"
        },
        severity: {
          type: "string",
          enum: ["low", "medium", "high", "critical"],
          description: "The severity level of the issue"
        },
        department: {
          type: "string",
          description: "Optional target department for escalation (e.g., 'management', 'technical', 'billing')"
        }
      },
      required: ["message", "severity"]
    }
  }
];

export function executeFunctionCall(functionName: string, args: FunctionCallArgs): FunctionResult {
  console.log(`🔧 Executing function: ${functionName} with args:`, args);

  switch (functionName) {
    case 'remindMeLater':
      return remindMeLater(args as { date: string; message: string });
    case 'sendSms':
      return sendSms(args as { message: string; phoneNumber?: string });
    case 'escalateItHigher':
      return escalateItHigher(args as { message: string; severity: string; department?: string });
    default:
      console.error(`❌ Unknown function: ${functionName}`);
      return {
        success: false,
        message: `Unknown function: ${functionName}`
      };
  }
}