# CodeFix AI – AI Code Debugging and Repair Assistant

An AI-powered Python Code Debugging and Repair Assistant with isolated code execution and test verification.

---

## 🏗 System Architecture

```
                  ┌────────────────────────────────────────┐
                  │          React + Vite Frontend         │
                  │   Monaco Editor & Dark Developer UI    │
                  └───────────────────┬────────────────────┘
                                      │ REST API
                                      ▼
                  ┌────────────────────────────────────────┐
                  │          Node.js Express API           │
                  │  (Routes, Controllers, Error Handlers) │
                  └───────────┬────────────────┬───────────┘
                              │                │
            JSON Code Analysis│                │ Isolated Container
                              ▼                ▼
                  ┌─────────────────┐    ┌─────────────────┐
                  │ Google Gemini   │    │  Docker Sandbox │
                  │ @google/genai   │    │ (Restricted     │
                  │ (Structured AI) │    │  Python Runner) │
                  └─────────────────┘    └─────────────────┘
```

---

## 📁 Repository Structure

```
codedit/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   └── debug.controller.js
│   │   ├── routes/
│   │   │   └── debug.routes.js
│   │   ├── services/
│   │   │   ├── gemini.service.js       # (Phase 2)
│   │   │   └── execution.service.js    # (Phase 4)
│   │   ├── utils/
│   │   │   └── validation.js           # (Phase 2)
│   │   └── server.js                   # Express server entry point
│   ├── .env.example
│   ├── .env
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/                 # (Monaco Editor, Bug cards, Diffs)
│   │   ├── pages/
│   │   │   └── Home.jsx                # Developer dashboard
│   │   ├── services/
│   │   │   └── api.js                  # Frontend API client
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css                   # Tailwind CSS styles
│   ├── index.html
│   ├── vite.config.js                  # Vite dev server + API proxy
│   └── package.json
│
├── docker/
│   └── Dockerfile                      # (Phase 4 Python sandbox)
│
├── .gitignore
└── README.md
```

---

## 🚀 How to Run the Application

### 1. Prerequisites
- **Node.js**: v18+ (verified with v24.20.0)
- **npm**: v9+ (verified with v11.19.0)
- **Python**: 3.8+ (for local test reference)
- **Docker**: (Required for Phase 4 code execution)

### 2. Start the Backend Server
In your first terminal:
```bash
cd backend
npm install
npm run dev
```
> **Port Note:** On macOS, Apple Control Center / AirPlay uses port 5000. CodeFix AI backend uses port **5050** to prevent port collision.

Backend will be running at:
`http://localhost:5050`
Health check endpoint: `http://localhost:5050/api/health`

### 3. Start the Frontend Client
In a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Frontend will be running at:
`http://localhost:5174`

The frontend automatically proxies `/api` calls to `http://localhost:5050`.

---

## 📌 Phase Progress
- [x] **Phase 1: Project Setup** - Frontend & Backend initialized, REST connection verified, dark dashboard created.
- [x] **Phase 2: Gemini Integration** - @google/genai SDK, structured JSON bug schema, validation, test script, and POST /api/debug endpoint.
- [x] **Phase 3: Code Editor & AI Interface** - Monaco Editor with custom dark theme, bug presets, line highlights, categorized bug cards, side-by-side diffing, copy/download, and suggested test cases.
- [ ] **Phase 4: Docker Execution** - Restricted container runner, timeouts, resource limits.
- [ ] **Phase 5: Automatic Testing** - Input/output comparison, test pass/fail report.
- [ ] **Phase 6: Results Dashboard** - Monaco diff editor, copy/download, line highlights.
- [ ] **Phase 7: Testing & Refinement** - Multi-category bug tests (syntax, runtime, logical).
- [ ] **Phase 8: Documentation** - Complete viva documentation and presentation guides.
