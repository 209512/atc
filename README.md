# 🚁 ATC Core - Distributed Air Traffic Control System

A high-performance, real-time Air Traffic Control (ATC) simulation platform demonstrating distributed locking and state management using **Hazelcast Cloud**. This project visualizes complex concurrency patterns through a modern, interactive dashboard.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/frontend-React_19-61DAFB.svg)
![Node](https://img.shields.io/badge/backend-Node.js-339933.svg)
![Hazelcast](https://img.shields.io/badge/state-Hazelcast_Cloud-orange.svg)

## ✨ Key Features

### 🖥️ Interactive Dashboard (Frontend)
- **Real-time Radar**: Visualizes agent activity and traffic density with a dynamic scanning radar animation.
- **Draggable Terminal Log**: A resizeable, draggable system log with advanced filtering (CRITICAL, WARN, INFO) and sticky headers.
- **Control Sidebar**: 
  - **Traffic Load Control**: Slider to adjust agent density in real-time.
  - **Emergency Override**: Manual administrative takeover to forcefully acquire locks and yield all agents.
  - **Global Stop/Resume**: Instantly pause or resume all autonomous agents.
  - **Theme & Audio**: Toggle between Dark/Light modes and mute system sounds.
- **Custom Tooltips**: High-performance, hook-free custom tooltips for all interactive elements.

### ⚙️ Distributed Core (Backend)
- **Hazelcast Integration**: Uses Hazelcast CP Subsystem for strong consistency and distributed locking (FencedLock).
- **Autonomous Agents**: Simulates independent agents competing for shared resources (airspace/runways).
- **Collision Detection**: Real-time tracking of lock acquisition failures and resource conflicts.
- **REST API**: Express.js endpoints for frontend-backend communication.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Hazelcast Cloud Cluster (or local instance)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd atc
   ```

2. **Install Dependencies**
   ```bash
   # Install root dependencies
   npm install

   # Install frontend dependencies
   cd packages/frontend
   npm install

   # Install backend dependencies
   cd ../backend
   npm install
   ```

3. **Configuration**
   - Configure your Hazelcast Cloud credentials in `packages/backend/src/config/hazelcast.config.js` or via environment variables.

### Running the System

1. **Start the Backend**
   ```bash
   cd packages/backend
   node index.js
   ```
   *Server runs on port 3000*

2. **Start the Frontend**
   ```bash
   cd packages/frontend
   npm run dev
   ```
   *Client runs on http://localhost:5173*

## 🏗️ Architecture

- **Frontend**: Built with React 19, Vite, and Tailwind CSS. It uses polling to fetch state from the backend and provides an optimistic UI for control actions.
- **Backend**: Node.js service that manages the lifecycle of autonomous agents. Each agent attempts to acquire a lock from Hazelcast, simulates work, and releases it.
- **State Management**: The "Controller" state (who holds the lock) is managed by Hazelcast's distributed primitives, ensuring that only one agent (or the Human Admin) controls the critical section at any time.

## 🛠️ Tech Stack

- **Frontend**: React, Framer Motion, Lucide React, clsx, React Draggable.
- **Backend**: Express, Hazelcast Client.
- **Styling**: Tailwind CSS.
- **Tooling**: Vite, ESLint.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
