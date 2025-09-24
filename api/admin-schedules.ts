import { Handler } from '@netlify/functions';
import { authenticateToken, isStaff } from './_shared/auth';

export const handler: Handler = async (event, context) => {
  const origin = event.headers.origin || 'http://localhost:3000';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    console.log('🔐 Admin-schedules auth check starting...');
    console.log('📋 Headers received:', {
      hasAuth: !!event.headers.authorization,
      hasCookies: !!event.headers.cookie,
      authPreview: event.headers.authorization ? event.headers.authorization.substring(0, 30) + '...' : 'none',
      origin: event.headers.origin
    });

    // Check authentication
    const authPayload = await authenticateToken(event);
    console.log('🔐 Auth payload result:', authPayload ? 'SUCCESS' : 'FAILED');

    if (!authPayload) {
      console.log('❌ Authentication failed for admin-schedules');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    console.log('✅ Authentication successful for admin-schedules:', authPayload.role);

    // Only admin/staff can manage schedules
    if (!isStaff(authPayload)) {
      console.log('❌ Authorization failed - insufficient role:', authPayload.role);
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Forbidden - Admin access required' })
      };
    }

    console.log('✅ Authorization successful - user has staff access');
  
  if (event.httpMethod === 'GET') {
    try {
      const { startDate, endDate, employeeId } = event.queryStringParameters || {};

      console.log('📅 Schedule query params:', {
        startDate,
        endDate,
        employeeId,
        queryString: event.queryStringParameters
      });
      
      // Import dependencies dynamically
      const { drizzle } = await import('drizzle-orm/postgres-js');
      const postgres = (await import('postgres')).default;
      const { employeeSchedules, users } = await import('../shared/schema');
      const { eq, and, gte, lte } = await import('drizzle-orm');
      
      // Create database connection
      const sql = postgres(process.env.DATABASE_URL!, {
        max: 1,
        idle_timeout: 20,
        connect_timeout: 10,
        prepare: false,
        keep_alive: false,
        types: {
          bigint: postgres.BigInt,
        },
      });
      
      const db = drizzle(sql);
      
      let query = db
        .select({
          id: employeeSchedules.id,
          employeeId: employeeSchedules.employeeId,
          scheduleDate: employeeSchedules.scheduleDate,
          startTime: employeeSchedules.startTime,
          endTime: employeeSchedules.endTime,
          position: employeeSchedules.position,
          isMandatory: employeeSchedules.isMandatory,
          notes: employeeSchedules.notes,
          status: employeeSchedules.status,
          createdAt: employeeSchedules.createdAt,
          updatedAt: employeeSchedules.updatedAt,
          employee: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            role: users.role
          }
        })
        .from(employeeSchedules)
        .leftJoin(users, eq(employeeSchedules.employeeId, users.id));

      // Add filters if provided
      const conditions = [];
      
      if (startDate) {
        conditions.push(gte(employeeSchedules.scheduleDate, startDate));
      }
      
      if (endDate) {
        conditions.push(lte(employeeSchedules.scheduleDate, endDate));
      }
      
      if (employeeId) {
        conditions.push(eq(employeeSchedules.employeeId, parseInt(employeeId)));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const schedules = await query;

      console.log('📅 Schedules found:', schedules.length, 'schedules');
      console.log('📅 Schedule dates:', schedules.map(s => ({
        id: s.id,
        employeeName: `${s.employee?.firstName} ${s.employee?.lastName}`,
        scheduleDate: s.scheduleDate,
        startTime: s.startTime,
        endTime: s.endTime
      })));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(schedules)
      };
    } catch (error) {
      console.error('Schedules API error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          message: 'Failed to fetch schedules',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      };
    }
  } else if (event.httpMethod === 'POST') {
    try {
      // Import dependencies dynamically
      const { drizzle } = await import('drizzle-orm/postgres-js');
      const postgres = (await import('postgres')).default;
      const { employeeSchedules } = await import('../shared/schema');
      
      // Create database connection
      const sql = postgres(process.env.DATABASE_URL!, {
        max: 1,
        idle_timeout: 20,
        connect_timeout: 10,
        prepare: false,
        keep_alive: false,
        types: {
          bigint: postgres.BigInt,
        },
      });
      
      const db = drizzle(sql);
      
      const scheduleData = JSON.parse(event.body || '{}');

      console.log('📅 Schedule creation data:', {
        employeeId: scheduleData.employeeId,
        scheduleDate: scheduleData.scheduleDate,
        startTime: scheduleData.startTime,
        endTime: scheduleData.endTime,
        position: scheduleData.position,
        rawData: scheduleData
      });

      // Validate required fields
      if (!scheduleData.employeeId || !scheduleData.scheduleDate || !scheduleData.startTime || !scheduleData.endTime) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            message: 'Missing required fields: employeeId, scheduleDate, startTime, endTime'
          })
        };
      }

      const newSchedule = await db.insert(employeeSchedules).values({
        employeeId: scheduleData.employeeId,
        scheduleDate: scheduleData.scheduleDate,
        startTime: scheduleData.startTime,
        endTime: scheduleData.endTime,
        position: scheduleData.position || 'server',
        isMandatory: scheduleData.isMandatory || false,
        notes: scheduleData.notes || '',
        status: scheduleData.status || 'scheduled',
        createdBy: authPayload.userId, // Use authenticated user ID
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      console.log('✅ Schedule created successfully:', newSchedule[0]);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(newSchedule[0])
      };
    } catch (error) {
      console.error('Schedule creation error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          message: 'Failed to create schedule',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      };
    }
  } else if (event.httpMethod === 'PUT') {
    try {
      // Import dependencies dynamically
      const { drizzle } = await import('drizzle-orm/postgres-js');
      const postgres = (await import('postgres')).default;
      const { employeeSchedules } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');
      
      // Create database connection
      const sql = postgres(process.env.DATABASE_URL!, {
        max: 1,
        idle_timeout: 20,
        connect_timeout: 10,
        prepare: false,
        keep_alive: false,
        types: {
          bigint: postgres.BigInt,
        },
      });
      
      const db = drizzle(sql);
      
      // Extract schedule ID from URL path
      const urlParts = event.path?.split('/') || [];
      const scheduleId = urlParts[urlParts.length - 1];
      
      if (!scheduleId || isNaN(parseInt(scheduleId))) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Invalid schedule ID' })
        };
      }
      
      const scheduleData = JSON.parse(event.body || '{}');
      
      const updatedSchedule = await db.update(employeeSchedules)
        .set({
          employeeId: scheduleData.employeeId,
          scheduleDate: scheduleData.scheduleDate,
          startTime: scheduleData.startTime,
          endTime: scheduleData.endTime,
          position: scheduleData.position,
          isMandatory: scheduleData.isMandatory,
          notes: scheduleData.notes,
          status: scheduleData.status,
          updatedAt: new Date(),
        })
        .where(eq(employeeSchedules.id, parseInt(scheduleId)))
        .returning();
      
      if (updatedSchedule.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Schedule not found' })
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(updatedSchedule[0])
      };
    } catch (error) {
      console.error('Schedule update error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          message: 'Failed to update schedule',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      };
    }
  } else if (event.httpMethod === 'DELETE') {
    try {
      // Import dependencies dynamically
      const { drizzle } = await import('drizzle-orm/postgres-js');
      const postgres = (await import('postgres')).default;
      const { employeeSchedules } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');
      
      // Create database connection
      const sql = postgres(process.env.DATABASE_URL!, {
        max: 1,
        idle_timeout: 20,
        connect_timeout: 10,
        prepare: false,
        keep_alive: false,
        types: {
          bigint: postgres.BigInt,
        },
      });
      
      const db = drizzle(sql);
      
      // Extract schedule ID from URL path
      const urlParts = event.path?.split('/') || [];
      const scheduleId = urlParts[urlParts.length - 1];
      
      if (!scheduleId || isNaN(parseInt(scheduleId))) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Invalid schedule ID' })
        };
      }
      
      const deletedSchedule = await db.delete(employeeSchedules)
        .where(eq(employeeSchedules.id, parseInt(scheduleId)))
        .returning();
      
      if (deletedSchedule.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Schedule not found' })
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Schedule deleted successfully' })
      };
    } catch (error) {
      console.error('Schedule deletion error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          message: 'Failed to delete schedule',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      };
    }
  } else {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  } catch (error) {
    console.error('Admin schedules API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};