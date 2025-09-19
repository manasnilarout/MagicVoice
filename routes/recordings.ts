import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { audioRecorderManager } from '../utils/audioUtils.js';

const router = express.Router();
const recordingsDir = path.join(process.cwd(), 'recordings');

/**
 * GET /recordings
 * List all available recordings
 */
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    if (!fs.existsSync(recordingsDir)) {
      res.json({ recordings: [] });
      return;
    }

    const files = await fs.promises.readdir(recordingsDir);
    const recordings = files
      .filter(file => file.endsWith('.wav'))
      .map(file => {
        const stats = fs.statSync(path.join(recordingsDir, file));
        const parts = file.split('_');
        const typeWithExt = parts[2]?.replace('.wav', '') || '';
        return {
          filename: file,
          callId: parts[0],
          timestamp: parts[1],
          type: typeWithExt, // incoming, outgoing, or conversation
          size: stats.size,
          created: stats.birthtime
        };
      });

    res.json({ recordings });
  } catch (error: any) {
    console.error('Error listing recordings:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /recordings/:filename
 * Download a specific recording
 */
router.get('/:filename', async (req: Request<{ filename: string }>, res: Response): Promise<void> => {
  try {
    const { filename } = req.params;
    const filePath = path.join(recordingsDir, filename);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Recording not found' });
      return;
    }

    res.download(filePath);
  } catch (error: any) {
    console.error('Error downloading recording:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /recordings/:filename
 * Delete a specific recording
 */
router.delete('/:filename', async (req: Request<{ filename: string }>, res: Response): Promise<void> => {
  try {
    const { filename } = req.params;
    const filePath = path.join(recordingsDir, filename);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Recording not found' });
      return;
    }

    await fs.promises.unlink(filePath);
    res.json({ success: true, message: `Recording ${filename} deleted` });
  } catch (error: any) {
    console.error('Error deleting recording:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /recordings/:callId/start
 * Start recording for a specific call
 */
router.post('/:callId/start', async (req: Request<{ callId: string }>, res: Response): Promise<void> => {
  try {
    const { callId } = req.params;
    const recorder = audioRecorderManager.getRecorder(callId);

    if (recorder.recording) {
      res.status(400).json({ error: 'Recording already in progress' });
      return;
    }

    recorder.start();
    res.json({ success: true, message: `Recording started for call ${callId}` });
  } catch (error: any) {
    console.error('Error starting recording:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /recordings/:callId/stop
 * Stop recording for a specific call
 */
router.post('/:callId/stop', async (req: Request<{ callId: string }>, res: Response): Promise<void> => {
  try {
    const { callId } = req.params;
    const recorder = audioRecorderManager.getRecorder(callId);

    if (!recorder.recording) {
      res.status(400).json({ error: 'No recording in progress' });
      return;
    }

    const paths = await recorder.stop();
    res.json({
      success: true,
      message: `Recording stopped for call ${callId}`,
      files: paths
    });
  } catch (error: any) {
    console.error('Error stopping recording:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;