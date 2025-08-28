import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Simple API info endpoint
  return res.status(200).json({ 
    message: 'Pizza Spin Rewards API', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    status: 'active',
    endpoints: {
      auth: '/api/auth/*',
      users: '/api/user',
      test: '/api/test'
    }
  });
}