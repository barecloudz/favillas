import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { registerRoutes } from "../server/routes";

const app = express();

// Enable compression for all responses
app.use(compression());

// Optimize body parsing with conditional middleware - exclude upload routes
app.use('/api', (req, res, next) => {
  // Skip JSON parsing for file upload routes
  if (req.path === '/upload-image') {
    return next();
  }
  express.json({ limit: '10mb' })(req, res, next);
});

app.use('/api', (req, res, next) => {
  // Skip URL encoding for file upload routes
  if (req.path === '/upload-image') {
    return next();
  }
  express.urlencoded({ extended: false, limit: '10mb' })(req, res, next);
});

// Set security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Content Security Policy for production
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com; frame-src https://js.stripe.com;"
  );
  
  next();
});

// Initialize routes
let server: any = null;
let routesInitialized = false;

async function initializeRoutes() {
  if (!routesInitialized) {
    console.log('Initializing routes...');
    server = await registerRoutes(app);
    routesInitialized = true;
    console.log('Routes initialized successfully');
  }
}

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

// Export handler for Vercel
export default async function handler(req: Request, res: Response) {
  await initializeRoutes();
  app(req, res);
}