# Agent Traffic Control (ATC)

ATC is a **traffic control system designed for AI agents**. It manages concurrency and resolves conflicts when multiple agents attempt to access shared files or resources simultaneously. Just as air traffic control manages airspace to prevent collisions, ATC ensures smooth operation and resource integrity among autonomous agents.

## 🚀 Live Demo & Repository

- **Live Deployment:** [https://atc-frontend-eight.vercel.app/](https://atc-frontend-eight.vercel.app/)
- **GitHub Repository:** [https://github.com/209512/atc.git](https://github.com/209512/atc.git)

## 💡 Concept

In multi-agent systems, agents often work autonomously on shared tasks. Problems arise when:
- Multiple agents try to write to the same file at once.
- Two agents attempt to use a limited API quota or database connection simultaneously.

**Agent Traffic Control** solves this by acting as a central authority that:
- Monitors agent activities.
- Detects potential resource collisions.
- Manages locks and queues to serialize access.
- Visualizes the entire process in real-time.

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 19
- **Build Tool:** Vite
- **Styling:** Tailwind CSS, clsx, tailwind-merge
- **Animation:** Framer Motion
- **Icons:** Lucide React
- **UI Logic:** React Draggable, React Resizable

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js 5
- **Distributed System:** Hazelcast (for distributed locking and state management)
- **Utilities:** dotenv, cors

## 📖 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- A Hazelcast Cloud Cluster (or local instance)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/209512/atc.git
    cd atc
    ```

2.  **Install Frontend Dependencies:**
    ```bash
    cd packages/frontend
    npm install
    ```

3.  **Install Backend Dependencies:**
    ```bash
    cd ../backend
    npm install
    ```

### Configuration

Create a `.env` file in the `packages/backend` directory based on `.env.example`:

```bash
# packages/backend/.env
HAZELCAST_DISCOVERY_TOKEN=your_token_here
HAZELCAST_PASSWORD=your_password_here
# Optional
PORT=3000
```

### Running the Application

1.  **Start the Backend:**
    ```bash
    cd packages/backend
    node index.js
    ```
    The server will start (default port: 3000).

2.  **Start the Frontend:**
    Open a new terminal and run:
    ```bash
    cd packages/frontend
    npm run dev
    ```
    Access the dashboard at `http://localhost:5173`.
