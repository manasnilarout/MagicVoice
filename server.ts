import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import expressWs from 'express-ws';
import path from 'path';
import { fileURLToPath } from 'url';
import twilioRealtimeRouter, { mediaStreamWebSocketHandler } from './routes/twilio-realtime.js';
import rtcRouter from './routes/rtc.js';
import observerRouter from './routes/observer.js';
import { getConfiguration, getAvailablePersonas } from './config/app.config.js';
import { externalConfigLoader, hasExternalConfiguration, getConfigurationDirectory } from './config/external-config-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
expressWs(app);

// Get app configuration
const appConfig = getConfiguration();
const PORT = process.env.PORT || 3000;

// Twilio Realtime API routes
app.use('/twilio-realtime', twilioRealtimeRouter);

// WebRTC routes for browser-based voice interaction
app.use('/rtc', rtcRouter);
app.use('/observer', observerRouter);

// Register WebSocket endpoint for Twilio Media Stream
(app as any).ws('/twilio-realtime/media-stream', mediaStreamWebSocketHandler);

// Configuration API endpoints
app.get('/api/config', (_req, res) => {
  res.json({
    app: appConfig.app,
    bot: {
      supportedLanguages: appConfig.bot.supportedLanguages,
      defaultLanguage: appConfig.bot.defaultLanguage
    },
    persona: {
      type: appConfig.persona.type,
      name: appConfig.persona.name,
      role: appConfig.persona.role,
      company: appConfig.persona.company
    },
    availablePersonas: getAvailablePersonas()
  });
});

app.get('/api/personas', (_req, res) => {
  const personas = getAvailablePersonas().map(type => {
    const config = getConfiguration(type);
    return {
      type,
      name: config.persona.name,
      role: config.persona.role,
      company: config.persona.company,
      tone: config.persona.tone
    };
  });
  res.json(personas);
});

app.get('/api/config-info', (_req, res) => {
  res.json({
    usingExternalConfig: hasExternalConfiguration(),
    configDirectory: getConfigurationDirectory(),
    availablePersonas: getAvailablePersonas()
  });
});

app.post('/api/reload-config', (_req, res) => {
  try {
    externalConfigLoader.clearCache();
    res.json({ success: true, message: 'Configuration cache cleared successfully' });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Determine the correct public directory path
const publicDir = process.env.NODE_ENV === 'production' || __dirname.includes('dist')
  ? path.join(__dirname, 'public')  // In production, public is copied to dist/public
  : path.join(__dirname, 'public'); // In development, public is in the same directory

// Serve static files from the public directory
app.use(express.static(publicDir));

app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index-twilio.html'));
});

app.get('/twilio', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index-twilio.html'));
});

app.listen(PORT, () => {
  console.log(`✅ ${appConfig.app.name} running on http://localhost:${PORT}`);
  console.log(`🎤 Voice bot ready: ${appConfig.persona.name} (${appConfig.persona.role})`);
  console.log(`🌐 Default language: ${appConfig.bot.defaultLanguage}`);
  console.log(`🔧 Available personas: ${getAvailablePersonas().join(', ')}`);
});