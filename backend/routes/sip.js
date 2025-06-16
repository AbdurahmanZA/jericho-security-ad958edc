
const express = require('express');
const AsteriskManager = require('../asterisk-manager');
const router = express.Router();

// Initialize Asterisk manager (will be passed from main server)
let asteriskManager;

const initializeSipRoutes = (db) => {
  asteriskManager = new AsteriskManager(db);
  return router;
};

// Get SIP configuration
router.get('/config', async (req, res) => {
  try {
    const config = await asteriskManager.getSipConfig();
    res.json(config);
  } catch (error) {
    console.error('Error getting SIP config:', error);
    res.status(500).json({ error: 'Failed to get SIP configuration' });
  }
});

// Update SIP configuration
router.put('/config', async (req, res) => {
  try {
    const config = await asteriskManager.updateSipConfig(req.body);
    res.json(config);
  } catch (error) {
    console.error('Error updating SIP config:', error);
    res.status(500).json({ error: 'Failed to update SIP configuration' });
  }
});

// Get all extensions
router.get('/extensions', async (req, res) => {
  try {
    const extensions = await asteriskManager.getExtensions();
    res.json(extensions);
  } catch (error) {
    console.error('Error getting extensions:', error);
    res.status(500).json({ error: 'Failed to get extensions' });
  }
});

// Create new extension
router.post('/extensions', async (req, res) => {
  try {
    const extension = await asteriskManager.createExtension(req.body);
    res.json(extension);
  } catch (error) {
    console.error('Error creating extension:', error);
    res.status(500).json({ error: 'Failed to create extension' });
  }
});

// Update extension
router.put('/extensions/:id', async (req, res) => {
  try {
    const extension = await asteriskManager.updateExtension(req.params.id, req.body);
    res.json(extension);
  } catch (error) {
    console.error('Error updating extension:', error);
    res.status(500).json({ error: 'Failed to update extension' });
  }
});

// Delete extension
router.delete('/extensions/:id', async (req, res) => {
  try {
    const result = await asteriskManager.deleteExtension(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error deleting extension:', error);
    res.status(500).json({ error: 'Failed to delete extension' });
  }
});

// Start Asterisk service
router.post('/start', async (req, res) => {
  try {
    const result = await asteriskManager.startAsterisk();
    res.json(result);
  } catch (error) {
    console.error('Error starting Asterisk:', error);
    res.status(500).json({ error: 'Failed to start Asterisk service' });
  }
});

// Stop Asterisk service
router.post('/stop', async (req, res) => {
  try {
    const result = await asteriskManager.stopAsterisk();
    res.json(result);
  } catch (error) {
    console.error('Error stopping Asterisk:', error);
    res.status(500).json({ error: 'Failed to stop Asterisk service' });
  }
});

// Get Asterisk status
router.get('/status', async (req, res) => {
  try {
    const status = await asteriskManager.getAsteriskStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting Asterisk status:', error);
    res.status(500).json({ error: 'Failed to get Asterisk status' });
  }
});

// Reload Asterisk configuration
router.post('/reload', async (req, res) => {
  try {
    const result = await asteriskManager.reloadAsterisk();
    res.json(result);
  } catch (error) {
    console.error('Error reloading Asterisk:', error);
    res.status(500).json({ error: 'Failed to reload Asterisk' });
  }
});

// Get SIP peers
router.get('/peers', async (req, res) => {
  try {
    const peers = await asteriskManager.getSipPeers();
    res.json(peers);
  } catch (error) {
    console.error('Error getting SIP peers:', error);
    res.status(500).json({ error: 'Failed to get SIP peers' });
  }
});

// Get call logs
router.get('/logs', async (req, res) => {
  try {
    const limit = req.query.limit || 100;
    const logs = await asteriskManager.getCallLogs(limit);
    res.json(logs);
  } catch (error) {
    console.error('Error getting call logs:', error);
    res.status(500).json({ error: 'Failed to get call logs' });
  }
});

// Make emergency call
router.post('/emergency-call', async (req, res) => {
  try {
    const { extension, emergency_number, message } = req.body;
    const result = await asteriskManager.makeEmergencyCall(extension, emergency_number, message);
    res.json(result);
  } catch (error) {
    console.error('Error making emergency call:', error);
    res.status(500).json({ error: 'Failed to make emergency call' });
  }
});

module.exports = { initializeSipRoutes };
