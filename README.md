# Athletes Management System

A full-stack application for managing athletes with React frontend and Node.js/Express backend.

## Project Structure

```
Merge/                 # Project root – run `npm run both` from here
├── backend/          # Node.js/Express API
│   ├── data/        # JSON data files
│   ├── controllers/ # API controllers
│   ├── routes/      # API routes
│   ├── utils/       # Utility functions
│   └── server.js    # Express server
├── frontend/         # React application
│   ├── src/         # React source code
│   ├── reuse/       # Reusable components
│   └── public/      # Static assets
└── docs/            # Documentation
```

## Prerequisites

- Node.js (v14 or higher)
- npm

## Installation

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd frontend
npm install
```

**Or install all dependencies at once:**

```bash
npm run install:all
```

This will install dependencies for root, backend, and frontend.

## Running the Application

### Quick Start (Recommended)

**First time setup** - Install all dependencies:
```bash
npm run install:all
```

Then run both backend and frontend together:

```bash
npm run both
```

This will start:
- **Backend server** on `http://localhost:3001` (labeled as "BACKEND" in console)
- **Frontend application** on `http://localhost:3000` (labeled as "FRONTEND" in console)

The output will be color-coded for easy identification. You'll see logs from both servers in the console.

### Stop All Development Processes

```bash
npm run kill
```

This will stop all Node.js development processes:
- Node.js processes (backend server, etc.)
- npm processes
- Vite processes (frontend dev server)

**Note**: This only stops development processes, not system Node.js processes.

### Manual Start (Alternative)

#### Start Backend Server Only

```bash
cd backend
npm start
```

The backend server will run on `http://localhost:3001`

#### Start Frontend Development Server Only

```bash
cd frontend
npm run dev
```

The frontend application will run on `http://localhost:3000`

## API Endpoints

### Athletes

- `GET /api/athletes` - Get all athletes with enrichment
- `GET /api/athletes/:id` - Get athlete by ID with enrichment
- `GET /api/health` - Health check endpoint

## Features

- ✅ List all athletes with search and filters
- ✅ View detailed athlete information
- ✅ Data enrichment (names, sports, countries, etc.)
- ✅ Responsive design with Material-UI
- ✅ Sidebar navigation

## Development

See `docs/athletes-feature-development.md` for detailed development plan and progress.
