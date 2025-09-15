import { Handler } from '@netlify/functions';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { categories } from '../../shared/schema';
import jwt from 'jsonwebtoken';

let dbConnection: any = null;

function getDB() {
  if (dbConnection) return dbConnection;
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    keep_alive: false,
  });
  
  dbConnection = drizzle(sql, { schema: { categories } });
  return dbConnection;
}

function authenticateToken(event: any): { userId: number; username: string; role: string } | null {
  // Check for JWT token in Authorization header first
  const authHeader = event.headers.authorization;
  let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  // If no Authorization header, check for auth-token cookie
  if (!token) {
    const cookies = event.headers.cookie;
    if (cookies) {
      const authCookie = cookies.split(';').find((c: string) => c.trim().startsWith('auth-token='));
      if (authCookie) {
        token = authCookie.split('=')[1];
      }
    }
  }

  if (!token) {
    return null;
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET or SESSION_SECRET environment variable is required');
    }

    const payload = jwt.verify(token, jwtSecret) as { userId: number; username: string; role: string };
    return payload;
  } catch (error) {
    return null;
  }
}

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

  const authPayload = authenticateToken(event);
  if (!authPayload) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  // Only admin and manager can manage categories
  if (authPayload.role !== 'admin' && authPayload.role !== 'manager') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Forbidden - Admin or Manager access required' })
    };
  }

  try {
    const db = getDB();

    if (event.httpMethod === 'GET') {
      // Get all categories
      const allCategories = await db.select().from(categories).orderBy(categories.order, categories.name);
      
      // If no categories exist, create default ones
      if (allCategories.length === 0) {
        const defaultCategories = [
          { name: 'Pizza', order: 1, isActive: true },
          { name: 'Appetizers', order: 2, isActive: true },
          { name: 'Salads', order: 3, isActive: true },
          { name: 'Pasta', order: 4, isActive: true },
          { name: 'Beverages', order: 5, isActive: true },
          { name: 'Desserts', order: 6, isActive: true },
        ];
        
        const createdCategories = [];
        for (const categoryData of defaultCategories) {
          const [newCategory] = await db
            .insert(categories)
            .values({
              ...categoryData,
              createdAt: new Date(),
            })
            .returning();
          createdCategories.push(newCategory);
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(createdCategories)
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(allCategories)
      };
      
    } else if (event.httpMethod === 'POST') {
      // Create new category
      const categoryData = JSON.parse(event.body || '{}');
      
      // Check if category name already exists
      const [existingCategory] = await db.select().from(categories).where(eq(categories.name, categoryData.name));
      if (existingCategory) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Category name already exists' })
        };
      }
      
      const [newCategory] = await db
        .insert(categories)
        .values({
          ...categoryData,
          createdAt: new Date(),
        })
        .returning();

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(newCategory)
      };
      
    } else if (event.httpMethod === 'PUT') {
      // Update category
      const { id, ...categoryData } = JSON.parse(event.body || '{}');
      
      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Category ID is required' })
        };
      }
      
      const [updatedCategory] = await db
        .update(categories)
        .set(categoryData)
        .where(eq(categories.id, id))
        .returning();

      if (!updatedCategory) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Category not found' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(updatedCategory)
      };
      
    } else if (event.httpMethod === 'DELETE') {
      // Delete category
      const { id } = event.queryStringParameters || {};
      
      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Category ID is required' })
        };
      }
      
      const [deletedCategory] = await db
        .delete(categories)
        .where(eq(categories.id, parseInt(id)))
        .returning();

      if (!deletedCategory) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Category not found' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Category deleted successfully' })
      };
      
    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }
  } catch (error) {
    console.error('Categories API error:', error);
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