
const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Stream control
router.post('/:cameraId/start', (req, res) => {
  const cameraId = req.params.cameraId;
  const { url } = req.body; // Get URL from request body
  
  console.log(`🎬 STREAM API: Starting stream for camera ${cameraId}`);
  console.log(`📡 STREAM API: URL provided: ${url}`);
  
  const db = req.app.get('db');
  const activeStreams = req.app.get('activeStreams');
  const wsManager = req.app.get('wsManager');
  
  console.log(`📊 STREAM API: Current active streams: ${activeStreams.size}`);

  // If URL is provided, store/update the camera in database
  if (url) {
    console.log(`💾 STREAM API: Storing camera ${cameraId} in database`);
    db.run('INSERT OR REPLACE INTO cameras (id, name, url, enabled) VALUES (?, ?, ?, ?)',
      [cameraId, `Camera ${cameraId}`, url, 1], (err) => {
        if (err) {
          console.error(`❌ STREAM API: Error storing camera ${cameraId}:`, err);
        } else {
          console.log(`✅ STREAM API: Camera ${cameraId} stored/updated in database`);
        }
      });
  }

  // Get camera details (either just stored or existing)
  db.get('SELECT * FROM cameras WHERE id = ?', [cameraId], (err, camera) => {
    if (err) {
      console.error(`❌ STREAM API: Database error for camera ${cameraId}:`, err);
      res.status(500).json({ error: 'Database error' });
      return;
    }
    
    console.log(`🔍 STREAM API: Database lookup result for camera ${cameraId}:`, camera ? 'Found' : 'Not found');
    
    if (!camera && !url) {
      console.log(`⚠️ STREAM API: Camera ${cameraId} not found and no URL provided`);
      res.status(404).json({ error: 'Camera not found and no URL provided' });
      return;
    }

    const streamUrl = url || camera.url;
    if (!streamUrl) {
      console.log(`⚠️ STREAM API: No stream URL available for camera ${cameraId}`);
      res.status(400).json({ error: 'No stream URL available' });
      return;
    }

    console.log(`🔧 STREAM API: Using stream URL: ${streamUrl}`);

    // Start FFmpeg process for HLS
    const hlsPath = path.join(__dirname, '..', 'hls', `camera_${cameraId}.m3u8`);
    const segmentPath = path.join(__dirname, '..', 'hls', `camera_${cameraId}_%03d.ts`);
    
    console.log(`📁 STREAM API: HLS output path: ${hlsPath}`);
    
    // Ensure HLS directory exists
    const hlsDir = path.dirname(hlsPath);
    if (!fs.existsSync(hlsDir)) {
      console.log(`📁 STREAM API: Creating HLS directory: ${hlsDir}`);
      fs.mkdirSync(hlsDir, { recursive: true });
    }

    console.log(`🎥 STREAM API: Starting FFmpeg for camera ${cameraId}`);

    const ffmpegArgs = [
      '-i', streamUrl,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-f', 'hls',
      '-hls_time', '2',
      '-hls_list_size', '5',
      '-hls_flags', 'delete_segments',
      '-y',
      hlsPath
    ];

    console.log(`⚙️ STREAM API: FFmpeg command: ffmpeg ${ffmpegArgs.join(' ')}`);

    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    
    ffmpeg.stdout.on('data', (data) => {
      console.log(`📤 FFmpeg stdout for camera ${cameraId}: ${data}`);
    });

    ffmpeg.stderr.on('data', (data) => {
      console.log(`📤 FFmpeg stderr for camera ${cameraId}: ${data}`);
    });
    
    ffmpeg.on('spawn', () => {
      console.log(`✅ STREAM API: FFmpeg process spawned for camera ${cameraId}`);
      activeStreams.set(parseInt(cameraId), {
        process: ffmpeg,
        camera: camera || { id: cameraId, url: streamUrl },
        hlsPath: hlsPath,
        startTime: new Date()
      });

      console.log(`📊 STREAM API: Active streams count: ${activeStreams.size}`);

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
      console.error(`💥 STREAM API: Stream error for camera ${cameraId}:`, error);
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
      console.log(`🔚 STREAM API: Stream ended for camera ${cameraId} with code ${code}`);
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
