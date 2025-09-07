import express, { Request, Response } from 'express';
import fetch from 'node-fetch';
import { makeHeaders, makeSession, getAppConfiguration } from './utils.js';

const router = express.Router();

// POST /rtc : create a new WebRTC call
router.post('/', express.text({ type: '*/*' }), async (req: Request, res: Response): Promise<void> => {
  try {
    const url = "https://api.openai.com/v1/realtime/calls";
    const headers = makeHeaders();
    
    // Get language and persona from headers
    const language = req.headers['x-language'] as string || getAppConfiguration().bot.defaultLanguage;
    const personaType = req.headers['x-persona'] as string;
    const config = getAppConfiguration(personaType);
    console.log(`🌐 Creating WebRTC session with language: ${language}, persona: ${personaType || 'default'}`);
    console.log(`📋 Using bot persona: ${config.persona.name} (${config.persona.role})`);
    
    const formData = new FormData();
    formData.set("sdp", req.body);
    formData.set("session", JSON.stringify(makeSession(language, personaType)));
    
    const opts = { method: "POST", headers, body: formData };
    const resp = await fetch(url, opts);
    
    if (!resp.ok) {
      const errText = await resp.text().catch(() => "<no body>");
      console.error(`🔴 start call failed: ${resp.status} ${errText}`);
      res.status(500).send("Internal error");
      return;
    }

    const contentType = resp.headers.get("Content-Type");
    const location = resp.headers.get("Location");
    const callId = location?.split("/").pop();
    console.log("✅ WebRTC call created:", callId);

    // Kick off observer in the background (fire-and-forget)
    const protocol = req.protocol;
    const host = req.get('host');
    const selfUrl = `${protocol}://${host}`;
    
    fetch(`${selfUrl}/observer/${callId}`, { method: "POST" }).catch(err => {
      console.log("Observer connection error:", err.message);
    });

    // Send the response back to client
    if (contentType) {
      res.set('Content-Type', contentType);
    }
    const responseText = await resp.text();
    res.send(responseText);

  } catch (error: any) {
    console.error('RTC call error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;