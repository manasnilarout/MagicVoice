import express, { Request, Response } from 'express';
import WebSocket from 'ws';
import { twilioClient, twilioPhoneNumber } from './twilio-utils.js';
import { makeSession, getAppConfiguration } from './utils.js';
import { audioRecorderManager } from '../utils/audioUtils.js';
import dotenv from 'dotenv';
import {
  CallMetadata,
  TwilioMediaMessage,
  OpenAIRealtimeMessage,
  TwilioCallRequest,
  TwilioWebhookRequest
} from '../types/index.js';
import { executeFunctionCall } from '../functions/index.js';

dotenv.config();

const router = express.Router();
const activeConnections = new Map<string, WebSocket>();

interface ExtendedCallMetadata extends CallMetadata {
  personaType?: string;
  enableRecording?: boolean;
}
const callMetadata = new Map<string, ExtendedCallMetadata>();

// Get configuration
const appConfig = getAppConfiguration();
const TEMPERATURE = appConfig.bot.temperature;
const SHOW_TIMING_MATH = false;

// Log event types for debugging
const LOG_EVENT_TYPES = [
    'error',
    'response.content.done',
    'response.done',
    'input_audio_buffer.committed',
    'input_audio_buffer.speech_stopped',
    'input_audio_buffer.speech_started',
    'session.created',
    'session.updated',
    'response.output_item.added',
    'response.output_item.done',
    'conversation.item.created'
];

// Enhanced request interface for calls
interface EnhancedTwilioCallRequest extends TwilioCallRequest {
  personaType?: string;
  enableRecording?: boolean;
}

// Initiate an outbound call
router.post('/call', express.json(), async (req: Request<{}, {}, EnhancedTwilioCallRequest>, res: Response): Promise<void> => {
  try {
    const { phoneNumber, language = appConfig.bot.defaultLanguage, personaType, enableRecording = false } = req.body;
    const config = getAppConfiguration(personaType);
    console.log(`🌐 Creating Twilio call with language: ${language}, persona: ${personaType || 'default'}`);
    console.log(`📋 Using bot persona: ${config.persona.name} (${config.persona.role})`);
    
    if (!twilioClient) {
      res.status(500).json({ error: 'Twilio not configured' });
      return;
    }
    
    if (!phoneNumber) {
      res.status(400).json({ error: 'Phone number is required' });
      return;
    }

    // Get the base URL for webhooks
    const forwardedHost = req.get('x-forwarded-host');
    const forwardedProto = req.get('x-forwarded-proto') || 'https';
    const host = forwardedHost || req.get('host');
    const baseUrl = `${forwardedProto}://${host}`;
    
    console.log(`📍 Using webhook base URL: ${baseUrl}`);
    
    // Create the call with media streams
    const call = await twilioClient.calls.create({
      to: phoneNumber,
      from: twilioPhoneNumber!,
      url: `${baseUrl}/twilio-realtime/answer`,
      statusCallback: `${baseUrl}/twilio-realtime/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      record: false
    });

    // Store call metadata including persona and recording preference
    callMetadata.set(call.sid, { language, phoneNumber, personaType, enableRecording });
    
    console.log(`✅ Call initiated to ${phoneNumber}, Call SID: ${call.sid}`);
    res.json({ 
      success: true, 
      callSid: call.sid,
      status: call.status 
    });

  } catch (error: any) {
    console.error('Error initiating call:', error);
    res.status(500).json({ error: error.message });
  }
});

// TwiML endpoint - handles call when answered
router.get('/answer', (_req: Request, res: Response) => {
  console.log('📞 Twilio webhook verification request received');
  res.type('text/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say>Webhook configured successfully.</Say>
    </Response>`);
});

// POST handler for actual call handling
router.post('/answer', express.urlencoded({ extended: false }), (req: Request, res: Response) => {
  const callSid = req.body.CallSid;
  console.log(`📞 Call answered: ${callSid}`);

  // Generate TwiML to connect to Media Streams
  const forwardedHost = req.get('x-forwarded-host');
  const forwardedProto = req.get('x-forwarded-proto') || 'https';
  const host = forwardedHost || req.get('host');
  const wsProto = (forwardedProto === 'https' || req.protocol === 'https') ? 'wss' : 'ws';
  const streamUrl = `${wsProto}://${host}/twilio-realtime/media-stream`;
  
  console.log(`🔌 WebSocket URL: ${streamUrl}`);
  
  res.type('text/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Connect>
        <Stream url="${streamUrl}">
          <Parameter name="callSid" value="${callSid}"/>
        </Stream>
      </Connect>
    </Response>`);
});

// WebSocket handler for Twilio Media Streams
export const mediaStreamWebSocketHandler = (ws: WebSocket, _req: Request) => {
  console.log('🎙️ Twilio Media Stream WebSocket connected');
  
  // Connection-specific state
  let streamSid: string | null = null;
  let callSid: string | null = null;
  let callLanguage = appConfig.bot.defaultLanguage;
  let callPersonaType: string | undefined = undefined;
  let enableRecording = false;
  let latestMediaTimestamp = 0;
  let lastAssistantItem: string | null = null;
  let markQueue: string[] = [];
  let responseStartTimestampTwilio: number | null = null;
  
  // Connect to OpenAI Realtime API
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const openAiWs = new WebSocket(`wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview&temperature=${TEMPERATURE}`, {
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    }
  });

  // Initialize session with OpenAI
  const initializeSession = () => {
    const baseSession = makeSession(callLanguage, callPersonaType);
    const sessionUpdate = {
      type: 'session.update',
      session: {
        type: 'realtime',
        model: "gpt-4o-realtime-preview",
        output_modalities: ["audio"],
        tools: baseSession.tools,
        tool_choice: "auto",
        audio: {
          input: {
            format: { type: 'audio/pcmu' },
            turn_detection: { type: "server_vad" }
          },
          output: {
            format: { type: 'audio/pcmu' },
            voice: getAppConfiguration(callPersonaType).bot.voice
          },
        },
        instructions: baseSession.instructions,
      },
    };

    const currentConfig = getAppConfiguration(callPersonaType);
    console.log(`📋 Sending session update with ${callLanguage} instructions for persona: ${currentConfig.persona.name}`);
    console.log(`🔧 Tools included in session:`, baseSession.tools?.map(t => t.name).join(', ') || 'None');
    console.log(`🎯 Tool choice: ${sessionUpdate.session.tool_choice}`);
    openAiWs.send(JSON.stringify(sessionUpdate));
    
    // Trigger initial response after session setup
    setTimeout(() => {
      console.log('🚀 Triggering initial bot response');
      openAiWs.send(JSON.stringify({ type: 'response.create' }));
    }, 500);
  };

  // Handle speech interruption
  const handleSpeechStartedEvent = () => {
    if (markQueue.length > 0 && responseStartTimestampTwilio != null) {
      const elapsedTime = latestMediaTimestamp - responseStartTimestampTwilio;
      if (SHOW_TIMING_MATH) console.log(`Calculating elapsed time for truncation: ${elapsedTime}ms`);

      if (lastAssistantItem) {
        const truncateEvent = {
          type: 'conversation.item.truncate',
          item_id: lastAssistantItem,
          content_index: 0,
          audio_end_ms: elapsedTime
        };
        if (SHOW_TIMING_MATH) console.log('Sending truncation event:', JSON.stringify(truncateEvent));
        openAiWs.send(JSON.stringify(truncateEvent));
      }

      // Clear Twilio's audio buffer
      ws.send(JSON.stringify({
        event: 'clear',
        streamSid: streamSid
      }));

      // Reset state
      markQueue = [];
      lastAssistantItem = null;
      responseStartTimestampTwilio = null;
    }
  };

  // Send mark messages to track playback
  const sendMark = () => {
    if (streamSid) {
      const markEvent = {
        event: 'mark',
        streamSid: streamSid,
        mark: { name: 'responsePart' }
      };
      ws.send(JSON.stringify(markEvent));
      markQueue.push('responsePart');
    }
  };

  // OpenAI WebSocket event handlers
  openAiWs.on('open', () => {
    console.log('✅ Connected to OpenAI Realtime API');
    setTimeout(initializeSession, 100);
  });

  openAiWs.on('message', (data: WebSocket.Data) => {
    try {
      const response: OpenAIRealtimeMessage = JSON.parse(data.toString());

      if (LOG_EVENT_TYPES.includes(response.type)) {
        console.log(`📌 OpenAI event: ${response.type}`, response.item ? `(item type: ${response.item.type})` : '');
      }

      // Log ALL events for debugging function calls
      if (response.type.includes('function') || response.type.includes('tool')) {
        console.log(`🔧 Function-related event: ${response.type}`, JSON.stringify(response, null, 2));
      }

      // Handle audio output from OpenAI
      if (response.type === 'response.output_audio.delta' && response.delta) {
        const audioDelta = {
          event: 'media',
          streamSid: streamSid,
          media: { payload: response.delta }
        };
        ws.send(JSON.stringify(audioDelta));

        // Record outgoing audio if enabled
        if (callSid && response.delta && enableRecording) {
          const recorder = audioRecorderManager.getRecorder(callSid);
          if (recorder.recording) {
            recorder.addOutgoingAudio(response.delta);
          }
        }

        // Track timing for interruption handling
        if (!responseStartTimestampTwilio) {
          responseStartTimestampTwilio = latestMediaTimestamp;
          if (SHOW_TIMING_MATH) console.log(`Setting start timestamp: ${responseStartTimestampTwilio}ms`);
        }

        if (response.item_id) {
          lastAssistantItem = response.item_id;
        }

        sendMark();
        console.log('🔊 Audio sent to Twilio');
      }

      // Handle speech interruption
      if (response.type === 'input_audio_buffer.speech_started') {
        console.log('🎤 User started speaking (interruption)');
        handleSpeechStartedEvent();
      }

      // Handle function calls - correct event types for Realtime API
      if (response.type === 'response.function_call_arguments.done') {
        console.log('🔧 Function call arguments completed');
        try {
          const functionName = response.name;
          const args = JSON.parse(response.arguments || '{}');
          const callId = response.call_id;

          console.log(`🔧 Executing function: ${functionName} with args:`, args);

          const result = executeFunctionCall(functionName!, args);

          // Send function result back to OpenAI
          const functionResultMessage = {
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: callId,
              output: JSON.stringify(result)
            }
          };

          openAiWs.send(JSON.stringify(functionResultMessage));

          // Trigger response generation after function execution
          openAiWs.send(JSON.stringify({ type: 'response.create' }));

        } catch (error) {
          console.error('❌ Error executing function call:', error);

          // Send error result back to OpenAI
          const errorMessage = {
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: response.call_id,
              output: JSON.stringify({
                success: false,
                message: `Error executing function: ${error instanceof Error ? error.message : 'Unknown error'}`
              })
            }
          };

          openAiWs.send(JSON.stringify(errorMessage));
          openAiWs.send(JSON.stringify({ type: 'response.create' }));
        }
      }

      // Log conversation events
      if (response.type === 'conversation.item.created' && response.item?.role === 'assistant') {
        console.log('🤖 Assistant speaking');
      }

      if (response.type === 'response.done') {
        console.log('✅ Response complete');
      }

      if (response.type === 'error') {
        console.error('❌ OpenAI error:', response.error);
      }

    } catch (error) {
      console.error('Error processing OpenAI message:', error);
    }
  });

  openAiWs.on('error', (error: Error) => {
    console.error('OpenAI WebSocket error:', error);
  });

  openAiWs.on('close', () => {
    console.log('OpenAI WebSocket closed');
  });

  // Handle incoming messages from Twilio
  ws.on('message', (message: WebSocket.Data) => {
    try {
      const data: TwilioMediaMessage = JSON.parse(message.toString());

      switch (data.event) {
        case 'start':
          if (data.start) {
            streamSid = data.start.streamSid;
            callSid = data.start.callSid;

            // Retrieve language, persona, and recording preference from metadata
            const metadata = callMetadata.get(callSid);

            if (metadata) {
              callLanguage = metadata.language;
              callPersonaType = metadata.personaType;
              enableRecording = metadata.enableRecording || false;
              const config = getAppConfiguration(callPersonaType);
              console.log(`📞 Media stream started - CallSid: ${callSid}, StreamSid: ${streamSid}, Language: ${callLanguage}, Persona: ${config.persona.name}, Recording: ${enableRecording}`);
            } else {
              console.log(`📞 Media stream started - CallSid: ${callSid}, StreamSid: ${streamSid}, Language: ${callLanguage} (default), Recording: ${enableRecording}`);
            }

            // Start recording if enabled
            if (enableRecording && callSid) {
              const recorder = audioRecorderManager.getRecorder(callSid);
              recorder.start();
            }

            // Reset timestamps for new stream
            responseStartTimestampTwilio = null;
            latestMediaTimestamp = 0;
          }
          break;

        case 'media':
          // Track latest timestamp for interruption handling
          if (data.media) {
            latestMediaTimestamp = parseInt(data.media.timestamp);

            // Forward audio to OpenAI FIRST (critical for interruption handling)
            if (openAiWs.readyState === WebSocket.OPEN && data.media.payload) {
              const audioAppend = {
                type: 'input_audio_buffer.append',
                audio: data.media.payload
              };
              openAiWs.send(JSON.stringify(audioAppend));
            }

            // Record incoming audio if enabled (after forwarding to ensure no delay)
            if (callSid && data.media.payload && enableRecording) {
              const recorder = audioRecorderManager.getRecorder(callSid);
              if (recorder.recording) {
                recorder.addIncomingAudio(data.media.payload);
              }
            }
          }
          break;

        case 'mark':
          // Remove mark from queue when Twilio confirms playback
          if (markQueue.length > 0) {
            markQueue.shift();
          }
          break;

        case 'stop':
          console.log(`🛑 Media stream stopped for call: ${callSid}`);

          // Stop recording if active
          if (callSid) {
            const recorder = audioRecorderManager.getRecorder(callSid);
            if (recorder.recording) {
              recorder.stop().then(paths => {
                const fileCount = Object.keys(paths).filter(key => paths[key as keyof typeof paths]).length;
                if (fileCount > 0) {
                  console.log(`📼 ${fileCount} recording file(s) saved for call ${callSid}`);
                }
              }).catch(err => {
                console.error(`Failed to save recordings for call ${callSid}:`, err);
              });
            }
            audioRecorderManager.removeRecorder(callSid);
          }

          if (openAiWs.readyState === WebSocket.OPEN) {
            openAiWs.close();
          }
          break;

        default:
          console.log('Received event:', data.event);
          break;
      }
    } catch (error) {
      console.error('Error processing Twilio message:', error);
    }
  });

  // Handle connection close
  ws.on('close', () => {
    console.log('📡 Twilio WebSocket disconnected');

    // Stop and save recordings
    if (callSid) {
      const recorder = audioRecorderManager.getRecorder(callSid);
      if (recorder.recording) {
        recorder.stop().then(paths => {
          const fileCount = Object.keys(paths).filter(key => paths[key as keyof typeof paths]).length;
          if (fileCount > 0) {
            console.log(`📼 ${fileCount} recording file(s) saved for call ${callSid}`);
          }
        }).catch(err => {
          console.error(`Failed to save recordings for call ${callSid}:`, err);
        });
      }
      audioRecorderManager.removeRecorder(callSid);
    }

    if (openAiWs.readyState === WebSocket.OPEN) {
      openAiWs.close();
    }
    if (callSid) {
      activeConnections.delete(callSid);
      // Clean up call metadata to prevent memory leaks
      callMetadata.delete(callSid);
    }
  });

  ws.on('error', (error: Error) => {
    console.error('Twilio WebSocket error:', error);
  });
};

// Status callback endpoint
router.get('/status', (_req: Request, res: Response) => {
  console.log('📞 Status webhook verification request received');
  res.status(200).send('Status webhook configured');
});

router.post('/status', express.urlencoded({ extended: false }), (req: Request<{}, {}, TwilioWebhookRequest>, res: Response) => {
  const { CallSid, CallStatus, CallDuration } = req.body;
  console.log(`📞 Call status - SID: ${CallSid}, Status: ${CallStatus}, Duration: ${CallDuration}s`);
  
  if (CallStatus === 'completed' || CallStatus === 'failed' || CallStatus === 'busy' || CallStatus === 'no-answer') {
    activeConnections.delete(CallSid);
  }
  
  res.status(200).end();
});

export default router;