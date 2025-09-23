import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  console.log('🧪 LOGIN-TEST-SIMPLE called at:', new Date().toISOString());

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      message: 'Login test endpoint working',
      timestamp: new Date().toISOString(),
      method: event.httpMethod,
      path: event.path
    })
  };
};