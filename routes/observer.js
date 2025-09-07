import express from 'express';
import WebSocket from 'ws';
import { makeHeaders } from './utils.js';

const router = express.Router();

// POST /observer/:callId : establish WebSocket connection to monitor the call
router.post('/:callId', express.json(), async (req, res) => {
  try {
    const callId = req.params.callId;
    const url = `wss://api.openai.com/v1/realtime?call_id=${callId}`;
    const ws = new WebSocket(url, { headers: makeHeaders() });
    
    ws.on('open', () => {
      console.log("✅ Observer WebSocket connected for call:", callId);
      // Trigger initial response after connection
      setTimeout(() => ws.send(JSON.stringify({ type: "response.create" })), 250);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Log all messages except audio transcript deltas (too verbose)
        if (message.type !== "response.audio_transcript.delta") {
          console.log(`🔍 [${callId}]`, message.type, message.error ? `Error: ${message.error.message}` : '');
        }
        
        // Handle specific message types
        if (message.type === 'session.created') {
          console.log(`📞 Session created for call ${callId}`);
        } else if (message.type === 'response.done') {
          console.log(`✅ Response completed for call ${callId}`);
        } else if (message.type === 'error') {
          console.error(`❌ Error in call ${callId}:`, message.error);
        }
      } catch (error) {
        console.error('Error processing observer message:', error);
      }
    });
    
    ws.on('error', (error) => {
      console.error(`🔴 Observer WebSocket failed for call ${callId}:`, error.message);
    });

    ws.on('close', () => {
      console.log(`📡 Observer WebSocket closed for call ${callId}`);
    });

    // Respond immediately; WebSocket continues in background
    res.status(200).json({ success: true, message: `Observer started for call ${callId}` });
    
  } catch (error) {
    console.error('Observer setup error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;