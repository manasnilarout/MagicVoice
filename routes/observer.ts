import express, { Request, Response } from 'express';
import WebSocket from 'ws';
import { makeHeaders } from './utils.js';
import { audioRecorderManager } from '../utils/audioUtils.js';
import { executeFunctionCall } from '../functions/index.js';

const router = express.Router();

interface ObserverMessage {
  type: string;
  event_id?: string;
  response_id?: string;
  item_id?: string;
  output_index?: number;
  call_id?: string;
  name?: string;
  arguments?: string;
  item?: {
    type?: string;
    name?: string;
    call?: {
      call_id: string;
      arguments: string;
    };
  };
  call?: {
    call_id: string;
    function_name: string;
    arguments: string;
  };
  error?: {
    message: string;
  };
  audio?: string; // Base64 encoded audio for WebRTC
  delta?: string; // Audio delta for responses
}

// POST /observer/:callId : establish WebSocket connection to monitor the call
router.post('/:callId', express.json(), async (req: Request<{ callId: string }>, res: Response) => {
  try {
    const callId = req.params.callId;
    const url = `wss://api.openai.com/v1/realtime?call_id=${callId}`;
    const ws = new WebSocket(url, { headers: makeHeaders() });
    
    ws.on('open', () => {
      console.log("✅ Observer WebSocket connected for call:", callId);
      // Trigger initial response after connection
      setTimeout(() => ws.send(JSON.stringify({ type: "response.create" })), 250);
    });
    
    ws.on('message', (data: WebSocket.Data) => {
      try {
        const message: ObserverMessage = JSON.parse(data.toString());

        // Log all messages except audio transcript deltas (too verbose)
        if (message.type !== "response.audio_transcript.delta") {
          console.log(`🔍 [${callId}]`, message.type, message.error ? `Error: ${message.error.message}` : '');
        }

        // Handle audio recording for WebRTC calls
        const recorder = audioRecorderManager.getRecorder(callId);
        if (recorder.recording) {
          // Record incoming audio from user
          if (message.type === 'input_audio_buffer.append' && message.audio) {
            recorder.addIncomingAudio(message.audio);
          }
          // Record outgoing audio from bot
          else if (message.type === 'response.output_audio.delta' && message.delta) {
            recorder.addOutgoingAudio(message.delta);
          }
        }

        // Handle specific message types
        if (message.type === 'session.created') {
          console.log(`📞 Session created for call ${callId}`);
        } else if (message.type === 'response.done') {
          console.log(`✅ Response completed for call ${callId}`);
        } else if (message.type === 'response.function_call_arguments.done') {
          console.log(`🔧 Function call completed for call ${callId}`);
          try {
            const functionName = message.name;
            const args = JSON.parse(message.arguments || '{}');
            const callIdForFunction = message.call_id;
            console.log(`🔧 [${callId}] Executing function: ${functionName}`);

            const result = executeFunctionCall(functionName!, args);

            // Send function result back to OpenAI
            const functionResultMessage = {
              type: 'conversation.item.create',
              item: {
                type: 'function_call_output',
                call_id: callIdForFunction,
                output: JSON.stringify(result)
              }
            };

            ws.send(JSON.stringify(functionResultMessage));

            // Trigger response generation after function execution
            ws.send(JSON.stringify({ type: 'response.create' }));

          } catch (error) {
            console.error(`❌ [${callId}] Error executing function call:`, error);

            // Send error result back to OpenAI
            const errorMessage = {
              type: 'conversation.item.create',
              item: {
                type: 'function_call_output',
                call_id: message.call_id,
                output: JSON.stringify({
                  success: false,
                  message: `Error executing function: ${error instanceof Error ? error.message : 'Unknown error'}`
                })
              }
            };

            ws.send(JSON.stringify(errorMessage));
            ws.send(JSON.stringify({ type: 'response.create' }));
          }
        } else if (message.type === 'error') {
          console.error(`❌ Error in call ${callId}:`, message.error);
        }
      } catch (error) {
        console.error('Error processing observer message:', error);
      }
    });
    
    ws.on('error', (error: Error) => {
      console.error(`🔴 Observer WebSocket failed for call ${callId}:`, error.message);
    });

    ws.on('close', () => {
      console.log(`📡 Observer WebSocket closed for call ${callId}`);

      // Stop and save recording if active
      const recorder = audioRecorderManager.getRecorder(callId);
      if (recorder.recording) {
        recorder.stop().then(paths => {
          if (paths.incomingPath || paths.outgoingPath) {
            console.log(`📼 WebRTC recordings saved for call ${callId}:`, paths);
          }
        }).catch(err => {
          console.error(`Failed to save WebRTC recordings for call ${callId}:`, err);
        });
      }
      audioRecorderManager.removeRecorder(callId);
    });

    // Respond immediately; WebSocket continues in background
    res.status(200).json({ success: true, message: `Observer started for call ${callId}` });
    
  } catch (error: any) {
    console.error('Observer setup error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;