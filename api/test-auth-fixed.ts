import { Handler } from '@netlify/functions';
import { authenticateToken } from './utils/auth';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('🧪 TEST-AUTH-FIXED: Testing FIXED authentication logic');
    console.log('🧪 TEST-AUTH-FIXED: Headers received:', {
      authorization: event.headers.authorization ? 'Present' : 'Missing',
      cookie: event.headers.cookie ? 'Present' : 'Missing',
      origin: event.headers.origin
    });

    // Use the FIXED authentication from utils/auth.ts
    const authResult = await authenticateToken(
      event.headers.authorization || event.headers.Authorization,
      event.headers.cookie || event.headers.Cookie
    );

    console.log('🧪 TEST-AUTH-FIXED: Auth result:', {
      success: authResult.success,
      hasUser: !!authResult.user,
      userId: authResult.user?.id,
      legacyUserId: authResult.user?.legacyUserId,
      email: authResult.user?.email,
      username: authResult.user?.username,
      role: authResult.user?.role,
      error: authResult.error
    });

    // Simulate the orders.ts auth payload creation logic
    let simulatedAuthPayload = null;
    if (authResult.success && authResult.user) {
      simulatedAuthPayload = {
        userId: authResult.user.legacyUserId || null,
        supabaseUserId: authResult.user.id && isNaN(Number(authResult.user.id)) ? authResult.user.id : null,
        username: authResult.user.email || authResult.user.username || 'user',
        role: authResult.user.role || 'customer',
        isSupabase: authResult.user.id && isNaN(Number(authResult.user.id)),
        hasLegacyUser: !!authResult.user.legacyUserId
      };
    }

    console.log('🧪 TEST-AUTH-FIXED: Simulated orders.ts authPayload:', simulatedAuthPayload);

    // Test the CRITICAL fix - will we get user_id: 29?
    const finalUserId = simulatedAuthPayload?.hasLegacyUser ? simulatedAuthPayload.userId : null;
    const shouldAwardPoints = !!(finalUserId || simulatedAuthPayload?.supabaseUserId);

    console.log('🎁 TEST-AUTH-FIXED: CRITICAL RESULTS:', {
      finalUserId: finalUserId,
      expectedUserId: 29,
      correctUserIdFound: finalUserId === 29,
      shouldAwardPoints: shouldAwardPoints,
      pointsTargetUser: finalUserId ? 'legacy' : 'supabase'
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        testName: 'FIXED Authentication Test',
        authenticationSuccess: authResult.success,
        rawAuthResult: authResult,
        simulatedOrdersAuthPayload: simulatedAuthPayload,
        criticalResults: {
          finalUserId: finalUserId,
          expectedUserId: 29,
          correctUserIdFound: finalUserId === 29,
          shouldAwardPoints: shouldAwardPoints,
          pointsTargetUser: finalUserId ? 'legacy' : 'supabase'
        },
        conclusion: finalUserId === 29
          ? '✅ SUCCESS: Will create orders with user_id: 29'
          : '❌ FAILURE: Will NOT create orders with user_id: 29',
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('🧪 TEST-AUTH-FIXED: Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Test auth fixed failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};