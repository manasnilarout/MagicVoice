export interface SessionConfig {
  type: string;
  model: string;
  instructions: string;
  audio: {
    input: {
      noise_reduction?: {
        type: string;
      };
      format?: {
        type: string;
      };
      turn_detection?: {
        type: string;
      };
    };
    output: {
      voice: string;
      format?: {
        type: string;
      };
    };
  };
}

export interface CallMetadata {
  language: string;
  phoneNumber: string;
}

export interface TwilioMediaMessage {
  event: 'start' | 'media' | 'mark' | 'stop';
  sequenceNumber?: string;
  start?: {
    streamSid: string;
    callSid: string;
    accountSid: string;
    tracks: string[];
    customParameters: Record<string, string>;
  };
  media?: {
    track: string;
    chunk: string;
    timestamp: string;
    payload: string;
  };
  mark?: {
    name: string;
  };
  stop?: {
    accountSid: string;
    callSid: string;
  };
}

export interface OpenAIRealtimeMessage {
  type: string;
  session?: any;
  delta?: string;
  item_id?: string;
  item?: {
    role: string;
  };
  error?: {
    message: string;
  };
}

export interface TwilioCallRequest {
  phoneNumber: string;
  language?: string;
}

export interface TwilioWebhookRequest {
  CallSid: string;
  CallStatus: string;
  CallDuration?: string;
  From?: string;
  To?: string;
}