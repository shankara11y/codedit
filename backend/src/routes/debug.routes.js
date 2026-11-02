import express from 'express';
import { 
  getHealth, 
  debugCode, 
  executeCode,
  createSession,
  getSessions,
  getSessionById
} from '../controllers/debug.controller.js';

const router = express.Router();

// GET /api/health - System health check
router.get('/health', getHealth);

// POST /api/debug - AI-powered multi-language code debugging and repair
router.post('/debug', debugCode);

// POST /api/execute - Isolated execution of code via Judge0 (or Docker)
router.post('/execute', executeCode);

// Sessions endpoints (Supabase persistent storage)
router.post('/sessions', createSession);
router.get('/sessions', getSessions);
router.get('/sessions/:id', getSessionById);

export default router;

