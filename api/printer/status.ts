import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Return sample printer status - in a real implementation this would check actual printer connectivity
    const printerStatus = {
      isConnected: false,
      printerName: 'Default Printer',
      ip: process.env.PRINTER_IP || 'localhost:8080',
      status: 'offline',
      lastPing: null,
      error: 'Printer not configured or offline'
    };

    res.status(200).json(printerStatus);
  } catch (error) {
    console.error('Printer Status API error:', error);
    res.status(500).json({ 
      message: 'Failed to check printer status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}