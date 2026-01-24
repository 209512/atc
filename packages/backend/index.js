const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const atcService = require('./src/services/atc.service');

dotenv.config({ path: '../../.env' });

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Initialize Hazelcast & Simulation
atcService.init().then(() => {
  console.log('ATC Service Initialized');
  atcService.startSimulation();
}).catch(err => {
  console.error('Failed to init ATC:', err);
});

// SSE Endpoint
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendState = (state) => {
    res.write(`data: ${JSON.stringify(state)}\n\n`);
  };

  // Send current state immediately
  sendState(atcService.state);

  // Subscribe to updates
  const handler = (state) => sendState(state);
  atcService.on('state', handler);

  req.on('close', () => {
    atcService.off('state', handler);
  });
});

// Human Override Endpoint
app.post('/api/override', async (req, res) => {
  try {
    const result = await atcService.humanOverride();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Release Human Lock Endpoint
app.post('/api/release', (req, res) => {
  atcService.releaseHumanLock();
  res.json({ message: 'Released' });
});

app.get('/', (req, res) => {
  res.send('ATC Backend is Running. Connect to /api/stream for SSE.');
});

app.listen(port, () => {
  console.log(`ATC Backend listening on port ${port}`);
});
