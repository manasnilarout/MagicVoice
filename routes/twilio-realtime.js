import express from 'express';
import WebSocket from 'ws';
import { twilioClient, twilioPhoneNumber } from './twilio-utils.js';
import { makeSession } from './utils.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const activeConnections = new Map();
const callMetadata = new Map(); // Store call-specific metadata like language

// Configuration
const VOICE = 'alloy';
const TEMPERATURE = 0.8;
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
    'session.updated'
];

// Initiate an outbound call
router.post('/call', express.json(), async (req, res) => {
  try {
    const { phoneNumber, language = 'hindi' } = req.body;
    console.log(`🌐 Creating Twilio call with language: ${language}`);
    
    if (!twilioClient) {
      return res.status(500).json({ error: 'Twilio not configured' });
    }
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
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
      from: twilioPhoneNumber,
      url: `${baseUrl}/twilio-realtime/answer`,
      statusCallback: `${baseUrl}/twilio-realtime/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      record: false
    });

    // Store language metadata for this call
    callMetadata.set(call.sid, { language, phoneNumber });
    
    console.log(`✅ Call initiated to ${phoneNumber}, Call SID: ${call.sid}`);
    res.json({ 
      success: true, 
      callSid: call.sid,
      status: call.status 
    });

  } catch (error) {
    console.error('Error initiating call:', error);
    res.status(500).json({ error: error.message });
  }
});

// TwiML endpoint - handles call when answered
router.get('/answer', (req, res) => {
  console.log('📞 Twilio webhook verification request received');
  res.type('text/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say>Webhook configured successfully.</Say>
    </Response>`);
});

// POST handler for actual call handling
router.post('/answer', express.urlencoded({ extended: false }), (req, res) => {
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
export const mediaStreamWebSocketHandler = (ws, req) => {
  console.log('🎙️ Twilio Media Stream WebSocket connected');
  
  // Connection-specific state
  let streamSid = null;
  let callSid = null;
  let callLanguage = 'hindi'; // Default language
  let latestMediaTimestamp = 0;
  let lastAssistantItem = null;
  let markQueue = [];
  let responseStartTimestampTwilio = null;
  
  // Connect to OpenAI Realtime API
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const openAiWs = new WebSocket(`wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview&temperature=${TEMPERATURE}`, {
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    }
  });

  // Initialize session with OpenAI
  const initializeSession = () => {
    const baseSession = makeSession(callLanguage);
    const sessionUpdate = {
      type: 'session.update',
      session: {
        type: 'realtime',
        model: "gpt-4o-realtime-preview",
        output_modalities: ["audio"],
        audio: {
          input: { 
            format: { type: 'audio/pcmu' }, 
            turn_detection: { type: "server_vad" } 
          },
          output: {
            format: { type: 'audio/pcmu' }, 
            voice: VOICE 
          },
        },
        instructions: baseSession.instructions,
      },
    };

    console.log(`📋 Sending session update with ${callLanguage} instructions`);
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

  openAiWs.on('message', (data) => {
    try {
      const response = JSON.parse(data.toString());

      if (LOG_EVENT_TYPES.includes(response.type)) {
        console.log(`📌 OpenAI event: ${response.type}`);
      }

      // Handle audio output from OpenAI
      if (response.type === 'response.output_audio.delta' && response.delta) {
        const audioDelta = {
          event: 'media',
          streamSid: streamSid,
          media: { payload: response.delta }
        };
        ws.send(JSON.stringify(audioDelta));

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

  openAiWs.on('error', (error) => {
    console.error('OpenAI WebSocket error:', error);
  });

  openAiWs.on('close', () => {
    console.log('OpenAI WebSocket closed');
  });

  // Handle incoming messages from Twilio
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());

      switch (data.event) {
        case 'start':
          streamSid = data.start.streamSid;
          callSid = data.start.callSid;
          
          // Retrieve language from metadata
          const metadata = callMetadata.get(callSid);
          if (metadata) {
            callLanguage = metadata.language;
            console.log(`📞 Media stream started - CallSid: ${callSid}, StreamSid: ${streamSid}, Language: ${callLanguage}`);
          } else {
            console.log(`📞 Media stream started - CallSid: ${callSid}, StreamSid: ${streamSid}, Language: ${callLanguage} (default)`);
          }
          
          // Reset timestamps for new stream
          responseStartTimestampTwilio = null;
          latestMediaTimestamp = 0;
          break;

        case 'media':
          // Track latest timestamp for interruption handling
          latestMediaTimestamp = data.media.timestamp;
          
          // Forward audio to OpenAI
          if (openAiWs.readyState === WebSocket.OPEN && data.media?.payload) {
            const audioAppend = {
              type: 'input_audio_buffer.append',
              audio: data.media.payload
            };
            openAiWs.send(JSON.stringify(audioAppend));
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
    if (openAiWs.readyState === WebSocket.OPEN) {
      openAiWs.close();
    }
    if (callSid) {
      activeConnections.delete(callSid);
      // Clean up call metadata to prevent memory leaks
      callMetadata.delete(callSid);
    }
  });

  ws.on('error', (error) => {
    console.error('Twilio WebSocket error:', error);
  });
};

// Status callback endpoint
router.get('/status', (req, res) => {
  console.log('📞 Status webhook verification request received');
  res.status(200).send('Status webhook configured');
});

router.post('/status', express.urlencoded({ extended: false }), (req, res) => {
  const { CallSid, CallStatus, CallDuration } = req.body;
  console.log(`📞 Call status - SID: ${CallSid}, Status: ${CallStatus}, Duration: ${CallDuration}s`);
  
  if (CallStatus === 'completed' || CallStatus === 'failed' || CallStatus === 'busy' || CallStatus === 'no-answer') {
    activeConnections.delete(CallSid);
  }
  
  res.status(200).end();
});

export default router;