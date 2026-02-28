// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const atcService = require('./src/services/atc.service');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendCombinedData = async () => {
    try {
      const agents = await atcService.getAgentStatus();
      const data = {
        state: {
          ...atcService.state,
          logs: atcService.state.logs || []
        },
        agents: agents
      };
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      console.error("SSE 전송 에러:", err);
    }
  };

  await sendCombinedData();
  const updateListener = async () => {
    await sendCombinedData();
  };

  atcService.on('state', updateListener);

  req.on('close', () => {
    atcService.removeListener('state', updateListener);
    console.log('SSE connection closed');
  });
});

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

app.post('/api/agents/:uuid/pause', async (req, res) => {
    const { uuid } = req.params;
    const { pause } = req.body;
    await atcService.pauseAgent(uuid, pause);
    res.json({ success: true });
});

app.delete('/api/agents/:uuid', async (req, res) => {
    const { uuid } = req.params;
    await atcService.terminateAgent(uuid);
    res.json({ success: true });
});

app.post('/api/agents/:uuid/rename', async (req, res) => {
    const { uuid } = req.params;
    const { newName } = req.body;
    
    if (!newName) return res.status(400).json({ error: 'New Name is required' });
    
    const result = await atcService.renameAgent(uuid, newName);
    if (result) res.json({ success: true });
    else res.status(404).json({ error: 'Agent not found' });
});

app.post('/api/agents/:uuid/priority', async (req, res) => {
    const { uuid } = req.params;
    const { enable } = req.body;
    await atcService.togglePriority(uuid, enable);
    res.json({ success: true });
});

app.post('/api/agents/priority-order', async (req, res) => {
    const { order } = req.body; // uuid 배열
    if (!Array.isArray(order)) return res.status(400).json({ error: 'Order must be an array' });
    
    await atcService.updatePriorityOrder(order);
    res.json({ success: true });
});

app.post('/api/agents/:uuid/transfer-lock', async (req, res) => {
    const { uuid } = req.params;
    await atcService.transferLock(uuid);
    res.json({ success: true });
});

app.get('/api/agents/status', async (req, res) => {
    const status = await atcService.getAgentStatus();
    res.json(status);
});

app.post('/api/agents/scale', async (req, res) => {
  const { count } = req.body;
  if (count === undefined || count < 0 || count > 10) { 
    return res.status(400).json({ error: 'Invalid agent count (0-10)' });
  }

  await atcService.updateAgentPool(count);
  res.json({ success: true, message: `Scaled Agent Pool to ${count}` });
});

app.post('/api/agents/register', (req, res) => {
    const { uuid, config } = req.body;
    if (!uuid || !config) return res.status(400).json({ error: 'Missing uuid or config' });
    
    atcService.registerAgentConfig(uuid, config);
    res.json({ success: true, message: `Registered config for agent` });
});

app.post('/api/agents/:uuid/config', (req, res) => {
    const { uuid } = req.params;
    const { config } = req.body;
    
    atcService.registerAgentConfig(uuid, config);
    res.json({ success: true, message: `Updated config for agent` });
});

app.get('/api/agents/:uuid/config', (req, res) => {
    const { uuid } = req.params;
    const config = atcService.agentConfigs.get(uuid);

    if (!config) {
        return res.json({
            provider: 'mock',
            model: '',
            systemPrompt: 'You are a helpful AI traffic controller.'
        });
    }
    res.json(config);
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