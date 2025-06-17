
const express = require('express');
const router = express.Router();

// Add WebRTC stream management
router.post('/streams/:cameraId/start', (req, res) => {
  const cameraId = req.params.cameraId;
  const db = req.app.get('db');
  const wsManager = req.app.get('wsManager');
  
  db.get('SELECT * FROM cameras WHERE id = ?', [cameraId], (err, camera) => {
    if (err || !camera) {
      res.status(404).json({ error: 'Camera not found' });
      return;
    }

    // Store WebRTC stream info
    db.run('INSERT OR REPLACE INTO webrtc_streams (camera_id, stream_url, enabled) VALUES (?, ?, ?)',
      [cameraId, camera.url, 1]);

    wsManager.broadcast({
      type: 'webrtc_stream_ready',
      cameraId: parseInt(cameraId),
      timestamp: new Date().toISOString()
    });

    res.json({ 
      status: 'webrtc_ready', 
      cameraId: parseInt(cameraId),
      signaling_url: '/api/ws'
    });
  });
});

router.get('/streams/:cameraId/status', (req, res) => {
  const cameraId = req.params.cameraId;
  const db = req.app.get('db');
  
  db.get('SELECT * FROM webrtc_streams WHERE camera_id = ?', [cameraId], (err, stream) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    res.json({
      cameraId: parseInt(cameraId),
      webrtc_available: !!stream && stream.enabled,
      stream_url: stream?.stream_url || null
    });
  });
});

module.exports = router;
