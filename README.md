# ATC (AI Traffic Control) System

![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)
![License](https://img.shields.io/badge/License-ISC-blue?style=for-the-badge)
![Stack](https://img.shields.io/badge/Stack-React%20|%20Node.js%20|%20Hazelcast-orange?style=for-the-badge)

The **ATC System** is a distributed AI agent management platform designed to visualize and control concurrent agent activities in real-time. It simulates a high-stakes "Air Traffic Control" environment where AI agents compete for resources (locks) to perform tasks. 

Beyond simple monitoring, ATC empowers administrators with **God-mode controls**: granting priorities, seizing locks by force, and executing emergency overrides.

---

## 🎬 Demo Scenarios (Planned)

Here are the recommended scenarios to showcase the system's capabilities in action.

| Scenario | Duration | Layout | Sequence |
| :--- | :--- | :--- | :--- |
| **1. The Priority Override** | 8s | **Split View**<br>(Radar 50% / List 50%) | 1) Agent list shows normal competition.<br>2) Admin clicks "Star" icon on `Agent-3`.<br>3) `Agent-3` turns Gold in Radar and immediately acquires the lock.<br>4) Other agents back off instantly. |
| **2. Administrative Seizure** | 6s | **Focus View**<br>(Tactical Panel Center) | 1) `Agent-1` holds the lock (Green).<br>2) Admin clicks "Zap" (Seize) on `Agent-5`.<br>3) `Agent-1` is forcibly detached (Red flash).<br>4) `Agent-5` acquires the lock immediately. |
| **3. The Great Lock War** | 10s | **Full Dashboard**<br>(Sidebar + Radar + Log) | 1) Sidebar: Increase Intensity to 10.<br>2) Radar: Swarm of agents spawns.<br>3) Terminal: Rapid "Collision" and "Retry" logs scrolling.<br>4) Visual chaos with particle effects. |
| **4. Ghost Protocol** | 5s | **Compact Mode**<br>(Sidebar Only) | 1) Sidebar is active, main view hidden.<br>2) Admin triggers "Global Stop".<br>3) All status indicators turn Red/Paused.<br>4) Admin renames an agent; change reflects instantly (Optimistic UI). |

---

## 🚀 Key Features

### 📡 Real-time Visualization & Control
- **3D Radar Interface:** Interactive **React Three Fiber** visualization showing agent positions, priority status (Gold), and lock holding (Green/Red).
- **Tactical Command:** Floating panel to manage agents.
    - **Grant VIP:** Give specific agents priority access to locks.
    - **Seize Lock:** Forcefully transfer a lock from one agent to another.
    - **Terminate:** Remove agents with a single click (Trash icon).
- **Detachable View:** Radar can be detached to a full-screen "Main View" or kept as a widget.

### ⚡ Ultra-Compact Monitoring

| Feature Focus | Preview |
| :--- | :--- |
| **Seamless Layout Adaptation**<br><br>The main viewport collapses to 0px width without breaking layout integrity. Administrators can shrink the browser to focus solely on the **Sidebar Control Panel**—perfect for keeping an eye on system metrics (`Active Threads`, `Congestion`) while multitasking. | <img src="sidebar_takeover.gif" width="260px" alt="Sidebar Mode" /> |

### 🎮 Human-in-the-Loop Authority
- **Emergency Takeover:** Instant administrative lock override (`EMERGENCY TAKEOVER`) to halt all agent activity.
- **Priority Management:** Dynamically assign "Star" status to agents, allowing them to bypass queues.
- **Optimistic UI:** Rename agents or toggle states with zero latency; the interface updates instantly while syncing with the server in the background.

### 🛠 Modern Engineering
- **Terminal Log:** Collapsible system log with filtering (ALL, CRITICAL, WARN, INFO).
- **Themes:** Toggle between **Cyberpunk Dark Mode** (Deep Space) and **Clean Light Mode** (Corporate).
- **SoundFX:** Audio feedback for system events (Lock Acquired, Priority Alarm, Override).

---

## 🏗 Architecture

### `packages/backend` (Node.js + Express)
- **Core Service (`atc.service.js`):** Manages simulation loop, priority queues, and state synchronization.
- **Hazelcast Integration:** Uses distributed locks with fencing tokens for strong consistency.
- **API:** REST endpoints for commands (Seize, Priority) and SSE for real-time state streaming.

### `packages/frontend` (React + Vite + Tailwind)
- **State Management:** Custom `useATC` hook with optimistic updates and race-condition handling (Ghosting protection).
- **Visuals:** `Three.js` for Radar, `Lucide React` for iconography.

---

## 📦 Installation & Setup

### Prerequisites
- Node.js (v18+)
- Hazelcast Cloud Cluster (or local instance)

### 1. Backend Setup
```bash
cd packages/backend
npm install
# Configure .env for Hazelcast
node index.js
```

### 2. Frontend Setup
```bash
cd packages/frontend
npm install
npm run dev
```

## 🛡️ Security & Constraints
- **Hard Limits:** Agent scaling is capped at 10 to prevent resource exhaustion.
- **Fencing Tokens:** Ensures old lock holders cannot commit changes after losing access.

## 📝 License
ISC
