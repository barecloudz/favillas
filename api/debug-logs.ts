import { Handler } from '@netlify/functions';

// In-memory log storage (will reset on function restart, but good for debugging)
let debugLogs: string[] = [];

// Function to add logs (called from other APIs)
export function addDebugLog(message: string) {
  const timestamp = new Date().toISOString();
  debugLogs.push(`[${timestamp}] ${message}`);

  // Keep only last 50 logs to prevent memory issues
  if (debugLogs.length > 50) {
    debugLogs = debugLogs.slice(-50);
  }
}

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        logs: debugLogs,
        count: debugLogs.length,
        message: 'Recent debug logs from orders API'
      })
    };
  }

  if (event.httpMethod === 'POST') {
    const body = JSON.parse(event.body || '{}');
    if (body.action === 'clear') {
      debugLogs = [];
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Logs cleared' })
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};