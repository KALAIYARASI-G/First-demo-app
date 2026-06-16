# LiveTrack - System Architecture

This document provides a high-level view of the LiveTrack system architecture, components, data flows, and communication protocols.

## High-Level System Design

```
+-----------------------------------+               +-----------------------------------+
|      Manager Dashboard            |               |      Worker Mobile App            |
|       (React + TS)                |               |      (Flutter + Dart)             |
+-----------------------------------+               +-----------------------------------+
          |                    ^                              |                    ^
    HTTPS | WebSockets         | WebSockets             HTTPS | WebSockets         | WebSockets
          v                    |                              v                    |
+---------------------------------------------------------------------------------------+
|                                    NestJS Backend                                     |
|                               (REST APIs & WS Gateway)                                |
+---------------------------------------------------------------------------------------+
                                           |
                                           | (ORM / Prisma)
                                           v
                                +---------------------+
                                |     PostgreSQL      |
                                |      Database       |
                                +---------------------+
```

## Key Modules & Technologies

### 1. Frontend Web App (Manager)
- **Framework**: React, TypeScript, Vite.
- **Routing & State**: Native React Hooks (`useState`, `useEffect`, `useRef`).
- **Mapping**: Leaflet (OpenStreetMap tile provider) for rendering the real-time position of various workers.
- **Real-time Engine**: Socket.io Client for real-time chat, GPS updates, and WebRTC handshakes.

### 2. Mobile App (Worker)
- **Framework**: Flutter, Dart.
- **Location tracking**: `geolocator` and `permission_handler` to track and stream real-time GPS coordinates.
- **Mapping**: `flutter_map` for local mapping visualization.
- **Real-time Engine**: `socket_io_client` for real-time web-socket events.

### 3. Backend Service
- **Framework**: NestJS, Node.js.
- **Database Access**: Prisma & TypeORM (PostgreSQL Database client).
- **Authentication**: AWS Cognito JSON Web Token (JWT) Strategy paired with custom local bypass for simulation/development purposes.
- **Real-time Server**: `@nestjs/websockets` (Socket.io) handling connections, rooms, live status updates, and signaling messages.

## Data Flows

### Real-Time GPS Tracking
1. The **Worker Mobile App** queries the device geolocation.
2. The coordinates (latitude, longitude) are transmitted over the established WebSocket channel via a `update_location` event.
3. The **NestJS Backend Gateway** receive the event, persists the location log to the `location_logs` database table, and broadcasts the event to the `location_updated` channel.
4. The **Manager Dashboard** receives the `location_updated` socket message and updates the corresponding marker position on the map.

### WebRTC Call Establishment (Signaling)
1. **Initiation**: The Manager initiates a call to the Worker by sending a `call_user` payload containing the WebRTC SDP offer through the WS connection.
2. **Alerting**: The Backend forwards the offer to the targeted worker.
3. **Acceptance**: The Worker accepts the call, generating an SDP answer, and emits an `accept_call` socket event back.
4. **ICE Exchange**: Both peers exchange network candidates via `ice_candidate` events relayed by the WS server until a P2P connection is established.
