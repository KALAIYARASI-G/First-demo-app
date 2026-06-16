# LiveTrack 📍

LiveTrack is a full-stack real-time tracking, chat, and WebRTC calling application designed for managers and field workers. Managers can create and assign tasks to field workers, view their live GPS locations on an interactive map, message them via a chat interface, and place audio/video calls. Field workers can update their task statuses, stream their GPS location in the background, chat with the dispatcher, and take incoming calls.

---

## Tech Stack

- **Frontend**: React (v18+), TypeScript, Vite, Leaflet Maps, Socket.io Client, TailwindCSS/Vanilla CSS, Lucide Icons
- **Backend**: NestJS, Node.js, Socket.io, Prisma ORM
- **Database**: PostgreSQL (Dockerized or Native)
- **Mobile Client**: Flutter, Dart, `flutter_map`, `geolocator`, `socket_io_client`, `flutter_webrtc`
- **Deployment**: Docker & Docker Compose, Nginx

---

## Folder Structure

```
LiveTrack/
├── backend/            # NestJS API Server & WebSockets Gateway
│   ├── src/            # NestJS modules, controllers, and services
│   ├── prisma/         # Prisma Schema & Migrations
│   └── Dockerfile      # Multi-stage production Dockerfile
├── database/           # Database setup files
│   ├── schema.sql      # Raw PostgreSQL table definitions
│   └── seed.sql        # Initial data seed (managers, workers, tasks)
├── deployment/         # Docker Compose & Nginx configuration files
│   ├── docker-compose.yml
│   └── nginx.conf
├── docs/               # System architecture & documentation
│   └── architecture.md
├── frontend/           # React + TS Dashboard with built-in Mobile Simulator
│   ├── src/            # React application files
│   ├── Dockerfile      # Multi-stage production Nginx frontend Dockerfile
│   └── vite.config.ts  # Vite configuration (includes API and WS proxying)
└── mobile/             # Flutter + Dart client source code base
    ├── lib/            # Mobile views, screens and service layer
    └── pubspec.yaml    # Flutter dependency configuration
```

---

## Getting Started

### 1. Database Setup
Ensure you have a PostgreSQL instance running.

* **Credentials**: Use port `5432`, database `demo_db`, username `postgres`, password `postgres`.
* **Schema Initialization**: Execute `/database/schema.sql` to initialize tables, followed by `/database/seed.sql` to seed initial managers, workers, and tasks.

### 2. Run the Backend
From the root of the project:
```bash
cd backend
npm install
npx prisma generate
npm run start
```
The backend server will spin up on `http://localhost:8080`.

### 3. Run the Frontend (Manager Dashboard & Mobile Simulator)
From the root of the project:
```bash
cd frontend
npm install
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

---

## Testing the Real-Time Flow

We have built a **Dual Monitor View** inside the React Web application! This lets you simulate the entire system in one browser window without needing a mobile emulator.

1. Open `http://localhost:3000`. You will see two panels side-by-side:
   - **Left Panel (Manager)**: Manage tasks, view the live map, send chat messages, or call the worker.
   - **Right Panel (Worker Mobile Simulator)**: Simulates the Flutter mobile app interface for the selected worker.
2. **GPS Simulation**: On the right panel, click **"Start GPS Simulation"**. The simulated worker will begin moving, and you will see the marker on the map in the Left Panel move in real-time.
3. **Chat**: Select the "Chat" tab on the Left Panel and send a message. It will immediately show up on the Right Panel's mobile screen. You can reply back from the mobile screen!
4. **Calling**: Go to the "Voip Call" tab on the Left Panel, and click **"Call worker_john"**. The Mobile Simulator on the right will ring! Click **"Accept"** to establish the simulated WebRTC connection.
5. **Tasks Update**: In the Mobile Simulator, click **"Start Work"** or **"Mark Complete"** on any task. The Manager's tasks list on the Left Panel will update to show the new state instantly.
