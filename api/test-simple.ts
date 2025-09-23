import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      message: 'Functions are working!',
      timestamp: new Date().toISOString(),
      method: event.httpMethod,
      path: event.path
    })
  };
};