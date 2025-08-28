import { VercelRequest, VercelResponse } from '@vercel/node';
import "dotenv/config";
import express from "express";
import compression from "compression";
import { registerRoutes } from "../server/routes";

// Create express app once
let app: express.Express | null = null;
let isInitialized = false;

async function initializeApp() {
  if (isInitialized && app) {
    return app;
  }

  app = express();

  // Enable compression
  app.use(compression());

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: false, limit: '10mb' }));

  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com; frame-src https://js.stripe.com;"
    );
    next();
  });

  // CORS headers
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    next();
  });

  // Register routes
  await registerRoutes(app);

  // Error handling
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('API Error:', err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  isInitialized = true;
  return app;
}

// Vercel serverless handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await initializeApp();
    
    // Handle the request with Express
    app(req as any, res as any);
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({ 
      message: 'Internal Server Error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}