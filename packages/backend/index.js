require('dotenv').config();
const express = require('express');
const cors = require('cors');
const atcService = require('./src/services/atc.service');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 1. Initialize System (Non-blocking)
atcService.init()
  .then(() => {
    // Start background agents only if init succeeded
    atcService.startSimulation(2);
  })
  .catch(err => {
    console.error('⚠️ ATC Service failed to initialize, but starting Web Server anyway.', err.message);
  });

// 2. SSE Endpoint
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendState = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Send initial state
  sendState(atcService.state);

  // Subscribe
  const listener = (data) => sendState(data);
  atcService.on('state', listener);

  // Cleanup
  req.on('close', () => {
    atcService.removeListener('state', listener);
  });
});

// 3. API Endpoints
app.post('/api/override', async (req, res) => {
  const result = await atcService.humanOverride();
  res.json(result);
});

app.post('/api/release', async (req, res) => {
  await atcService.releaseHumanLock();
  res.json({ success: true });
});

// Global Stop
app.post('/api/stop', async (req, res) => {
    const { enable } = req.body;
    await atcService.toggleGlobalStop(enable);
    res.json({ success: true, globalStop: enable });
});

// Targeted Pause
app.post('/api/agents/:id/pause', async (req, res) => {
    const { id } = req.params;
    const { pause } = req.body;
    await atcService.pauseAgent(id, pause);
    res.json({ success: true });
});

// Agent Status
app.get('/api/agents/status', async (req, res) => {
    const status = await atcService.getAgentStatus();
    res.json(status);
});

// Endpoint for "Traffic Intensity" Slider
app.post('/api/agents/scale', async (req, res) => {
  const { count } = req.body;
  if (!count || count < 0 || count > 20) {
    return res.status(400).json({ error: 'Invalid agent count (0-20)' });
  }

  await atcService.updateAgentPool(count);
  res.json({ success: true, message: `Scaled Agent Pool to ${count}` });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
