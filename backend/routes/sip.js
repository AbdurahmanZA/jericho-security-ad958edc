
const express = require('express');
const FreePBXManager = require('../asterisk-manager');
const router = express.Router();

// Initialize FreePBX manager (will be passed from main server)
let freepbxManager;

const initializeSipRoutes = (db) => {
  freepbxManager = new FreePBXManager(db);
  return router;
};

// Get SIP configuration
router.get('/config', async (req, res) => {
  try {
    const config = await freepbxManager.getSipConfig();
    res.json(config);
  } catch (error) {
    console.error('Error getting SIP config:', error);
    res.status(500).json({ error: 'Failed to get SIP configuration' });
  }
});

// Update SIP configuration
router.put('/config', async (req, res) => {
  try {
    const config = await freepbxManager.updateSipConfig(req.body);
    res.json(config);
  } catch (error) {
    console.error('Error updating SIP config:', error);
    res.status(500).json({ error: 'Failed to update SIP configuration' });
  }
});

// Get all extensions
router.get('/extensions', async (req, res) => {
  try {
    const extensions = await freepbxManager.getExtensions();
    res.json(extensions);
  } catch (error) {
    console.error('Error getting extensions:', error);
    res.status(500).json({ error: 'Failed to get extensions' });
  }
});

// Create new extension
router.post('/extensions', async (req, res) => {
  try {
    const extension = await freepbxManager.createExtension(req.body);
    res.json(extension);
  } catch (error) {
    console.error('Error creating extension:', error);
    res.status(500).json({ error: 'Failed to create extension' });
  }
});

// Update extension
router.put('/extensions/:id', async (req, res) => {
  try {
    const extension = await freepbxManager.updateExtension(req.params.id, req.body);
    res.json(extension);
  } catch (error) {
    console.error('Error updating extension:', error);
    res.status(500).json({ error: 'Failed to update extension' });
  }
});

// Delete extension
router.delete('/extensions/:id', async (req, res) => {
  try {
    const result = await freepbxManager.deleteExtension(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error deleting extension:', error);
    res.status(500).json({ error: 'Failed to delete extension' });
  }
});

// Start FreePBX service
router.post('/start', async (req, res) => {
  try {
    const result = await freepbxManager.startAsterisk();
    res.json(result);
  } catch (error) {
    console.error('Error starting FreePBX:', error);
    res.status(500).json({ error: 'Failed to start FreePBX service' });
  }
});

// Stop FreePBX service
router.post('/stop', async (req, res) => {
  try {
    const result = await freepbxManager.stopAsterisk();
    res.json(result);
  } catch (error) {
    console.error('Error stopping FreePBX:', error);
    res.status(500).json({ error: 'Failed to stop FreePBX service' });
  }
});

// Get FreePBX status
router.get('/status', async (req, res) => {
  try {
    const status = await freepbxManager.getAsteriskStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting FreePBX status:', error);
    res.status(500).json({ error: 'Failed to get FreePBX status' });
  }
});

// Reload FreePBX configuration
router.post('/reload', async (req, res) => {
  try {
    const result = await freepbxManager.reloadAsterisk();
    res.json(result);
  } catch (error) {
    console.error('Error reloading FreePBX:', error);
    res.status(500).json({ error: 'Failed to reload FreePBX' });
  }
});

// Get SIP peers
router.get('/peers', async (req, res) => {
  try {
    const peers = await freepbxManager.getSipPeers();
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
    const logs = await freepbxManager.getCallLogs(limit);
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
    const result = await freepbxManager.makeEmergencyCall(extension, emergency_number, message);
    res.json(result);
  } catch (error) {
    console.error('Error making emergency call:', error);
    res.status(500).json({ error: 'Failed to make emergency call' });
  }
});

module.exports = { initializeSipRoutes };
