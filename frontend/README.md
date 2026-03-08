# AutoApply Frontend ⚡

AutoApply is a fully automated, AI-powered job search and application platform. This repository contains the frontend implementation built with modern web technologies.

## 🚀 Features

- **Automated Job Scanning & Matching:** AI agents scan top job boards and match positions to your profile automatically.
- **Smart CV-Job Fit Analysis:** Get instant fit scores and gap analysis for every position found.
- **Tailored Applications:** AI generates customized CVs and cover letters for each application.
- **Auto-Submit & Tracking:** Applications are submitted automatically, or queued for your approval. Track every application status with a Kanban board.
- **Real-Time Agent Feed:** Watch 5 specialized AI agents (Scout, Evaluator, Writer, Submitter, Tracker) work in real-time via WebSocket connections.
- **Rich Analytics:** Dashboard and charts for visual insights (Applications over time, Response Rate, Fit Score distributions, etc.).

## 🛠 Tech Stack

- **Framework:** React 18 + Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Routing:** React Router v6
- **State Management:** 
  - Server State: `@tanstack/react-query`
  - Client State: `zustand`
- **Forms & Validation:** `react-hook-form` + `@hookform/resolvers/zod` + `zod`
- **Charts:** `recharts`
- **HTTP Client:** `axios` (with JWT interceptors)

## 🏗 Project Structure

```text
src/
├── components/      # UI, Layout, and Domain-specific components
│   ├── ui/          # Primitive reusable components (Buttons, Inputs, etc.)
│   ├── layout/      # App layout components (Sidebar, Navbar, etc.)
│   ├── jobs/        # Job feed, cards, and filters
│   ├── agents/      # Real-time agent logs and status
│   ├── applications/# Kanban board, application cards, modals
│   └── analytics/   # Charts and stat cards
├── hooks/           # Custom React hooks (useAuth, useAgentFeed, etc.)
├── lib/             # Utility configurations (axios, queryClient, websocket, mockData)
├── pages/           # Route views (Landing, Login, Dashboard, Analytics, etc.)
├── services/        # API integration layer functions
├── store/           # Global states (zustand authStore, etc.)
└── types/           # Global TypeScript interfaces
```

## ⚙️ Getting Started

### Prerequisites

- Node.js (v20.19+ or v22.12+ required by Vite v7)
- npm or yarn

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file with the following variables:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   VITE_WS_URL=ws://localhost:8000/ws
   VITE_USE_MOCK=true # Set to false to use real backend API
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

## 🧩 Mock Mode

The application includes a rich **Mock Data Mode** (`VITE_USE_MOCK=true` in `.env`). This allows you to explore the full UI, state changes, simulated WebSocket agent feeds, and Kanban interactions without needing a backend running. Disable it to connect to the live API endpoints.

## 📄 Documentation

Please refer to the `DEVELOPMENT.md` in the root folder for full component and architecture specifications used to build this frontend.
