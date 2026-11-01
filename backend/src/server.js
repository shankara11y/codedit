import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import debugRoutes from './routes/debug.routes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5050;
const HOST = '0.0.0.0';

// Middleware: CORS configured with optional whitelist from CORS_ORIGIN
const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors({
  origin: corsOrigin ? corsOrigin.split(',').map(s => s.trim()) : '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware for transparency and debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// API Routes
app.use('/api', debugRoutes);

// 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  const isProd = process.env.NODE_ENV === 'production';
  const statusCode = err.status || err.statusCode || 500;

  res.status(statusCode).json({
    error: 'Internal Server Error',
    message: isProd && statusCode === 500 
      ? 'An unexpected error occurred on the server.' 
      : (err.message || 'An unexpected error occurred on the server.')
  });
});

// Start listening on 0.0.0.0 for cloud platform compatibility
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 CodeFix AI backend listening on http://${HOST}:${PORT}`);
  console.log(`📡 Health check available at: http://${HOST}:${PORT}/api/health`);
});

// Configure backend server timeout to 90 seconds (longer than Gemini API operations)
server.setTimeout(90000);


