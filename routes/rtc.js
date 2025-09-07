import express from 'express';
import fetch from 'node-fetch';
import { makeHeaders, makeSession } from './utils.js';

const router = express.Router();

// POST /rtc : create a new WebRTC call
router.post('/', express.text({ type: '*/*' }), async (req, res) => {
  try {
    const url = "https://api.openai.com/v1/realtime/calls";
    const headers = makeHeaders();
    
    // Get language from header, default to hindi
    const language = req.headers['x-language'] || 'hindi';
    console.log(`🌐 Creating WebRTC session with language: ${language}`);
    
    const formData = new FormData();
    formData.set("sdp", req.body);
    formData.set("session", JSON.stringify(makeSession(language)));
    
    const opts = { method: "POST", headers, body: formData };
    const resp = await fetch(url, opts);
    
    if (!resp.ok) {
      const errText = await resp.text().catch(() => "<no body>");
      console.error(`🔴 start call failed: ${resp.status} ${errText}`);
      return res.status(500).text("Internal error");
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
    res.set('Content-Type', contentType);
    const responseText = await resp.text();
    res.send(responseText);

  } catch (error) {
    console.error('RTC call error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;