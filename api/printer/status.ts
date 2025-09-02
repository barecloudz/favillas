import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(printerStatus)
    };
  } catch (error) {
    console.error('Printer Status API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Failed to check printer status',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};