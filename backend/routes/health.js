
const express = require('express');
const { exec } = require('child_process');
const util = require('util');

const router = express.Router();
const execAsync = util.promisify(exec);

// Health check endpoints for system monitoring
router.get('/ffmpeg', async (req, res) => {
  try {
    const { stdout } = await execAsync('ffmpeg -version');
    const version = stdout.split('\n')[0];
    res.json({
      status: 'healthy',
      message: 'FFmpeg is installed and working',
      version: version,
      available: true
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'FFmpeg not found or not working',
      error: error.message,
      available: false
    });
  }
});

router.get('/systemd', async (req, res) => {
  try {
    const services = ['jericho-backend', 'apache2', 'asterisk'];
    const serviceStatus = {};

    for (const service of services) {
      try {
        const { stdout } = await execAsync(`systemctl is-active ${service}`);
        serviceStatus[service] = {
          status: stdout.trim(),
          active: stdout.trim() === 'active'
        };
      } catch (error) {
        serviceStatus[service] = {
          status: 'inactive',
          active: false,
          error: error.message
        };
      }
    }

    const allActive = Object.values(serviceStatus).every(s => s.active);
    
    res.json({
      status: allActive ? 'healthy' : 'warning',
      message: allActive ? 'All services running' : 'Some services not active',
      services: serviceStatus
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Cannot check systemd services',
      error: error.message
    });
  }
});

router.get('/database', (req, res) => {
  const db = req.app.get('db');
  // Test database connectivity with a simple query
  db.get('SELECT COUNT(*) as count FROM cameras', (err, row) => {
    if (err) {
      res.status(500).json({
        status: 'error',
        message: 'Database query failed',
        error: err.message,
        accessible: false
      });
      return;
    }
    
    res.json({
      status: 'healthy',
      message: 'Database accessible and responding',
      camera_count: row.count,
      accessible: true
    });
  });
});

router.get('/disk-space', async (req, res) => {
  try {
    const { stdout } = await execAsync('df -h /opt/jericho-backend');
    const lines = stdout.split('\n');
    const dataLine = lines[1].split(/\s+/);
    
    res.json({
      status: 'healthy',
      message: 'Disk space checked',
      filesystem: dataLine[0],
      size: dataLine[1],
      used: dataLine[2],
      available: dataLine[3],
      use_percentage: dataLine[4]
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Cannot check disk space',
      error: error.message
    });
  }
});

// Comprehensive system health check
router.get('/', async (req, res) => {
  const healthChecks = {};
  const activeStreams = req.app.get('activeStreams');
  const clients = req.app.get('clients');
  const db = req.app.get('db');
  
  // Check FFmpeg
  try {
    await execAsync('ffmpeg -version');
    healthChecks.ffmpeg = { status: 'healthy', message: 'FFmpeg available' };
  } catch {
    healthChecks.ffmpeg = { status: 'error', message: 'FFmpeg not available' };
  }
  
  // Check database
  await new Promise((resolve) => {
    db.get('SELECT 1', (err) => {
      healthChecks.database = err 
        ? { status: 'error', message: 'Database error' }
        : { status: 'healthy', message: 'Database accessible' };
      resolve();
    });
  });
  
  // Check active streams
  healthChecks.streams = {
    status: activeStreams.size > 0 ? 'healthy' : 'warning',
    message: `${activeStreams.size} active streams`,
    count: activeStreams.size
  };
  
  // Check WebSocket clients
  healthChecks.websocket = {
    status: clients.size > 0 ? 'healthy' : 'warning',
    message: `${clients.size} connected clients`,
    count: clients.size
  };
  
  const overallHealthy = Object.values(healthChecks).every(check => check.status === 'healthy');
  
  res.json({
    status: overallHealthy ? 'healthy' : 'warning',
    timestamp: new Date().toISOString(),
    checks: healthChecks,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

module.exports = router;
