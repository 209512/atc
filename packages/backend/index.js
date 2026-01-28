require('dotenv').config();
const express = require('express');
const cors = require('cors');
const atcService = require('./src/services/atc.service');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// SSE Endpoint
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendState = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  sendState(atcService.state);

  const listener = (data) => sendState(data);
  atcService.on('state', listener);

  req.on('close', () => {
    atcService.removeListener('state', listener);
  });
});

// API Endpoints
app.post('/api/override', async (req, res) => {
  const result = await atcService.humanOverride();
  res.json(result);
});

app.post('/api/release', async (req, res) => {
  await atcService.releaseHumanLock();
  res.json({ success: true });
});

app.post('/api/stop', async (req, res) => {
    const { enable } = req.body;
    await atcService.toggleGlobalStop(enable);
    res.json({ success: true, globalStop: enable });
});

app.post('/api/agents/:id/pause', async (req, res) => {
    const { id } = req.params;
    const { pause } = req.body;
    await atcService.pauseAgent(id, pause);
    res.json({ success: true });
});

// Terminate Agent
app.delete('/api/agents/:id', async (req, res) => {
    const { id } = req.params;
    await atcService.terminateAgent(id);
    res.json({ success: true });
});

// Rename Agent
app.post('/api/agents/:id/rename', async (req, res) => {
    const { id } = req.params;
    const { newId } = req.body;
    const result = await atcService.renameAgent(id, newId);
    if (result) res.json({ success: true });
    else res.status(404).json({ error: 'Agent not found' });
});

// Priority Toggle
app.post('/api/agents/:id/priority', async (req, res) => {
    const { id } = req.params;
    const { enable } = req.body;
    await atcService.togglePriority(id, enable);
    res.json({ success: true });
});

// Force Transfer Lock
app.post('/api/agents/:id/transfer-lock', async (req, res) => {
    const { id } = req.params;
    await atcService.transferLock(id);
    res.json({ success: true });
});

app.get('/api/agents/status', async (req, res) => {
    const status = await atcService.getAgentStatus();
    res.json(status);
});

app.post('/api/agents/scale', async (req, res) => {
  const { count } = req.body;
  if (!count || count < 0 || count > 10) { // Enforce Hard Limit 10
    return res.status(400).json({ error: 'Invalid agent count (0-10)' });
  }

  await atcService.updateAgentPool(count);
  res.json({ success: true, message: `Scaled Agent Pool to ${count}` });
});

app.post('/api/agents/register', (req, res) => {
    const { id, config } = req.body;
    if (!id || !config) return res.status(400).json({ error: 'Missing id or config' });
    
    atcService.registerAgentConfig(id, config);
    res.json({ success: true, message: `Registered config for ${id}` });
});

app.post('/api/agents/:id/config', (req, res) => {
    const { id } = req.params;
    const { config } = req.body;
    
    atcService.registerAgentConfig(id, config);
    res.json({ success: true, message: `Updated config for ${id}` });
});

atcService.init()
  .then(() => {
    console.log('✅ System Initialized. Starting Web Server...');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      atcService.startSimulation(2);
    });
  })
  .catch(err => {
    console.error('❌ Critical Initialization Failure:', err.message);
    process.exit(1);
  });
