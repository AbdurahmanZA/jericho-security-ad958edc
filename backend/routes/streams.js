
const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Stream control
router.post('/:cameraId/start', (req, res) => {
  const cameraId = req.params.cameraId;
  const db = req.app.get('db');
  const activeStreams = req.app.get('activeStreams');
  const wsManager = req.app.get('wsManager');
  
  // Get camera details
  db.get('SELECT * FROM cameras WHERE id = ?', [cameraId], (err, camera) => {
    if (err || !camera) {
      res.status(404).json({ error: 'Camera not found' });
      return;
    }

    // Start FFmpeg process for HLS
    const hlsPath = path.join(__dirname, '..', 'hls', `camera_${cameraId}.m3u8`);
    const segmentPath = path.join(__dirname, '..', 'hls', `camera_${cameraId}_%03d.ts`);
    
    // Ensure HLS directory exists
    const hlsDir = path.dirname(hlsPath);
    if (!fs.existsSync(hlsDir)) {
      fs.mkdirSync(hlsDir, { recursive: true });
    }

    const ffmpegArgs = [
      '-i', camera.url,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-f', 'hls',
      '-hls_time', '2',
      '-hls_list_size', '5',
      '-hls_flags', 'delete_segments',
      '-y',
      hlsPath
    ];

    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    
    ffmpeg.on('spawn', () => {
      activeStreams.set(parseInt(cameraId), {
        process: ffmpeg,
        camera: camera,
        hlsPath: hlsPath,
        startTime: new Date()
      });

      // Update stream status
      db.run('INSERT OR REPLACE INTO stream_status (camera_id, status) VALUES (?, ?)',
        [cameraId, 'running']);

      wsManager.broadcast({
        type: 'stream_started',
        cameraId: parseInt(cameraId),
        timestamp: new Date().toISOString()
      });

      res.json({ status: 'started', cameraId: parseInt(cameraId) });
    });

    ffmpeg.on('error', (error) => {
      console.error(`Stream error for camera ${cameraId}:`, error);
      activeStreams.delete(parseInt(cameraId));
      
      db.run('UPDATE stream_status SET status = ?, error_message = ? WHERE camera_id = ?',
        ['error', error.message, cameraId]);

      wsManager.broadcast({
        type: 'stream_error',
        cameraId: parseInt(cameraId),
        error: error.message,
        timestamp: new Date().toISOString()
      });
    });

    ffmpeg.on('exit', (code) => {
      console.log(`Stream ended for camera ${cameraId} with code ${code}`);
      activeStreams.delete(parseInt(cameraId));
      
      db.run('UPDATE stream_status SET status = ? WHERE camera_id = ?',
        ['stopped', cameraId]);

      wsManager.broadcast({
        type: 'stream_stopped',
        cameraId: parseInt(cameraId),
        timestamp: new Date().toISOString()
      });
    });
  });
});

router.post('/:cameraId/stop', (req, res) => {
  const cameraId = parseInt(req.params.cameraId);
  const activeStreams = req.app.get('activeStreams');
  const db = req.app.get('db');
  const wsManager = req.app.get('wsManager');
  const stream = activeStreams.get(cameraId);
  
  if (stream) {
    stream.process.kill('SIGTERM');
    activeStreams.delete(cameraId);
    
    db.run('UPDATE stream_status SET status = ? WHERE camera_id = ?',
      ['stopped', cameraId]);

    wsManager.broadcast({
      type: 'stream_stopped',
      cameraId: cameraId,
      timestamp: new Date().toISOString()
    });

    res.json({ status: 'stopped', cameraId });
  } else {
    res.status(404).json({ error: 'Stream not found' });
  }
});

// Get stream status
router.get('/:cameraId/status', (req, res) => {
  const cameraId = req.params.cameraId;
  const db = req.app.get('db');
  const activeStreams = req.app.get('activeStreams');
  
  db.get('SELECT * FROM stream_status WHERE camera_id = ?', [cameraId], (err, status) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const isActive = activeStreams.has(parseInt(cameraId));
    res.json({
      cameraId: parseInt(cameraId),
      status: isActive ? 'running' : (status?.status || 'stopped'),
      lastUpdate: status?.last_update || null,
      errorMessage: status?.error_message || null
    });
  });
});

module.exports = router;
