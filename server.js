import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import expressWs from 'express-ws';
import path from 'path';
import { fileURLToPath } from 'url';
import twilioRealtimeRouter, { mediaStreamWebSocketHandler } from './routes/twilio-realtime.js';
import rtcRouter from './routes/rtc.js';
import observerRouter from './routes/observer.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
expressWs(app);

const PORT = process.env.PORT || 3000;

// Twilio Realtime API routes
app.use('/twilio-realtime', twilioRealtimeRouter);

// WebRTC routes for browser-based voice interaction
app.use('/rtc', rtcRouter);
app.use('/observer', observerRouter);

// Register WebSocket endpoint for Twilio Media Stream
app.ws('/twilio-realtime/media-stream', mediaStreamWebSocketHandler);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index-twilio.html'));
});

app.get('/twilio', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index-twilio.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`🎤 Twilio Voice bot ready for phone calls`);
});