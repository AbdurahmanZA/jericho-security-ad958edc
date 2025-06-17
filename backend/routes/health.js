
const express = require('express');
const { spawn } = require('child_process');
const router = express.Router();

// Database health check
router.get('/database', (req, res) => {
  const db = req.app.get('db');
  
  db.get('SELECT 1 as test', (err, row) => {
    if (err) {
      res.status(500).json({
        status: 'error',
        message: 'Database connection failed',
        error: err.message
      });
    } else {
      res.json({
        status: 'healthy',
        message: 'Database connection successful',
        timestamp: new Date().toISOString()
      });
    }
  });
});

// FFmpeg health check
router.get('/ffmpeg', (req, res) => {
  const ffmpeg = spawn('ffmpeg', ['-version']);
  let output = '';
  let errorOutput = '';

  ffmpeg.stdout.on('data', (data) => {
    output += data.toString();
  });

  ffmpeg.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });

  ffmpeg.on('close', (code) => {
    if (code === 0 || output.includes('ffmpeg version')) {
      // FFmpeg sometimes outputs version info to stderr
      const versionInfo = output || errorOutput;
      const versionMatch = versionInfo.match(/ffmpeg version ([^\s]+)/);
      
      res.json({
        status: 'healthy',
        message: 'FFmpeg is available',
        version: versionMatch ? versionMatch[1] : 'unknown',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'FFmpeg not available',
        error: errorOutput || 'FFmpeg command failed',
        timestamp: new Date().toISOString()
      });
    }
  });

  ffmpeg.on('error', (error) => {
    res.status(500).json({
      status: 'error',
      message: 'FFmpeg not found',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  });

  // Timeout after 10 seconds
  setTimeout(() => {
    ffmpeg.kill('SIGTERM');
    if (!res.headersSent) {
      res.status(500).json({
        status: 'error',
        message: 'FFmpeg health check timeout',
        timestamp: new Date().toISOString()
      });
    }
  }, 10000);
});

// Stream status health check
router.get('/streams', (req, res) => {
  const activeStreams = req.app.get('activeStreams');
  const db = req.app.get('db');

  db.all('SELECT * FROM stream_status', (err, streams) => {
    if (err) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to query stream status',
        error: err.message
      });
    } else {
      res.json({
        status: 'healthy',
        message: `${activeStreams.size} active streams`,
        activeStreams: activeStreams.size,
        totalConfigured: streams.length,
        streams: streams,
        timestamp: new Date().toISOString()
      });
    }
  });
});

// RTSP connection test
router.post('/test-rtsp', (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({
      status: 'error',
      message: 'RTSP URL is required'
    });
  }

  console.log(`Testing RTSP connection to: ${url}`);
  
  // Use ffprobe to test the RTSP stream
  const ffprobe = spawn('ffprobe', [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_streams',
    '-rtsp_transport', 'tcp',
    '-timeout', '10000000', // 10 second timeout
    url
  ]);

  let output = '';
  let errorOutput = '';

  ffprobe.stdout.on('data', (data) => {
    output += data.toString();
  });

  ffprobe.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });

  ffprobe.on('close', (code) => {
    if (code === 0 && output) {
      try {
        const streamInfo = JSON.parse(output);
        res.json({
          status: 'success',
          message: 'RTSP stream is accessible',
          streams: streamInfo.streams,
          timestamp: new Date().toISOString()
        });
      } catch (parseError) {
        res.json({
          status: 'warning',
          message: 'RTSP stream accessible but metadata parsing failed',
          rawOutput: output,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      res.status(400).json({
        status: 'error',
        message: 'RTSP stream not accessible',
        error: errorOutput || `ffprobe exited with code ${code}`,
        url: url,
        timestamp: new Date().toISOString()
      });
    }
  });

  ffprobe.on('error', (error) => {
    res.status(500).json({
      status: 'error',
      message: 'ffprobe command failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  });

  // Timeout after 15 seconds
  setTimeout(() => {
    ffprobe.kill('SIGTERM');
    if (!res.headersSent) {
      res.status(408).json({
        status: 'error',
        message: 'RTSP connection test timeout',
        url: url,
        timestamp: new Date().toISOString()
      });
    }
  }, 15000);
});

module.exports = router;
