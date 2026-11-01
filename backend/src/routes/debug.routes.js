import express from 'express';
import { getHealth, debugCode, executeCode } from '../controllers/debug.controller.js';

const router = express.Router();

// GET /api/health - System health check
router.get('/health', getHealth);

// POST /api/debug - AI-powered Python code debugging and repair
router.post('/debug', debugCode);

// POST /api/execute - Isolated Docker execution of Python code
router.post('/execute', executeCode);

export default router;
