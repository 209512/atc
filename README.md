# ATC (Agent Traffic Control) 🚦

> **Distributed System Governance Visualization Platform**  
> *"Like a traffic control tower for AI Agents competing for resources."*

![ATC Dashboard Preview](https://via.placeholder.com/1200x600.png?text=ATC+Dashboard+Preview)

## 📖 Introduction

In modern distributed systems, multiple services (Agents) often compete for a single shared resource. Without proper "traffic control," this leads to:
- **Race Conditions**: Data corruption.
- **Deadlocks**: System freeze.
- **Starvation**: Some agents never get access.

**ATC** is a visualization and governance tool that solves these problems using **Hazelcast CP Subsystem** (Raft Consensus). It visualizes the competition in real-time and provides a "Human Override" switch for emergency manual control.

## ✨ Key Features

### 1. 🌐 Real-Time CP Governance Visualization
- **Radar Chart**: Visualizes the latency and "distance" of each agent from the lock.
- **Metrics**: Real-time tracking of Lock Hold Time, Collision Count, and Fencing Tokens.
- **Status Indicators**: Instantly see who holds the lock (Agent-1, Agent-2, or Human).

### 2. 🛡️ Strong Consistency (CP) with FencedLock
- Implements **FencedLock** to guarantee linearizability.
- Prevents "Zombie Lock" issues where a dead process keeps holding a resource.
- Uses monotonic fencing tokens to reject stale requests.

### 3. 🚨 Human Override (Panic Switch)
- **Administrative Force Unlock**: Bypasses the standard queue.
- **Session Termination**: Administratively kills the CP Session of a rogue agent to force-release the lock.
- Ensures humans always have the final say in system emergencies.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, TailwindCSS, Framer Motion (Animations), Recharts (Visualization)
- **Backend**: Node.js, Express, Server-Sent Events (SSE)
- **Core Engine**: **Hazelcast Node.js Client v5.3** (CP Subsystem, FencedLock, Raft)
- **Deployment**: Vercel (Frontend), Mock Mode Fallback (for serverless environments)

## 🚀 How It Works

1. **Simulation**: The backend spawns multiple "Agents" that try to acquire a distributed lock.
2. **Competition**: Agents race to call `lock.tryLock()`. Only one succeeds.
3. **Visualization**: The state (Holder, Token, Latency) is streamed to the Frontend via SSE.
4. **Governance**: If an agent holds the lock too long, the Admin can click **"Human Override"**.
   - The backend sends a `forceCloseSession` command to the Raft group.
   - The rogue agent is evicted.
   - Control is handed to the Human user.

## 📦 Installation & Local Run

### Prerequisites
- Node.js v18+
- Docker (for local Hazelcast cluster)

### 1. Start Hazelcast Cluster
```bash
docker run -p 5701:5701 hazelcast/hazelcast
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Backend & Frontend
```bash
# Terminal 1 (Backend)
cd packages/backend
npm run dev

# Terminal 2 (Frontend)
cd packages/frontend
npm run dev
```

## ☁️ Deployment Note (Vercel)
This project is deployed on Vercel. Due to serverless network restrictions preventing direct access to the local Hazelcast container, the live demo runs in a **"High-Fidelity Mock Mode"**. This simulates the exact behavior of the CP Subsystem logic to demonstrate the architectural concepts.

## 📄 License
MIT
