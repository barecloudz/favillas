import type { Handler } from '@netlify/functions';
import { db } from '../server/db';
import { storeHours } from '../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Check if store is currently open and accepting orders
 * GET /api/check-store-status
 *
 * Returns:
 * {
 *   isOpen: boolean,
 *   acceptingOrders: boolean,  // false if within 30 min of closing
 *   message: string,
 *   currentTime: string,
 *   todayHours: { open: string, close: string }
 * }
 */
export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Get current time in EST (your timezone)
    const now = new Date();
    const estFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const currentTime = estFormatter.format(now);
    const dayOfWeek = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' })).getDay();

    // Get today's hours from database
    const todayHours = await db
      .select()
      .from(storeHours)
      .where(eq(storeHours.dayOfWeek, dayOfWeek))
      .limit(1);

    if (todayHours.length === 0 || !todayHours[0].isOpen) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          isOpen: false,
          acceptingOrders: false,
          message: "We're closed today",
          currentTime,
          todayHours: null
        })
      };
    }

    const hours = todayHours[0];
    const openTime = hours.openTime;
    const closeTime = hours.closeTime;

    // Parse times
    const [currentHour, currentMinute] = currentTime.split(':').map(Number);
    const [openHour, openMinute] = openTime.split(':').map(Number);
    const [closeHour, closeMinute] = closeTime.split(':').map(Number);

    const currentMinutes = currentHour * 60 + currentMinute;
    const openMinutes = openHour * 60 + openMinute;
    const closeMinutes = closeHour * 60 + closeMinute;

    // Check if currently open
    const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;

    // Check if accepting orders (not within 30 min of closing)
    const cutoffMinutes = closeMinutes - 30;
    const acceptingOrders = isOpen && currentMinutes < cutoffMinutes;

    let message = '';
    if (!isOpen) {
      if (currentMinutes < openMinutes) {
        message = `We open at ${openTime}`;
      } else {
        message = `We're closed. We were open ${openTime} - ${closeTime}`;
      }
    } else if (!acceptingOrders) {
      message = `We stop taking orders 30 minutes before closing (${closeTime})`;
    } else {
      message = `We're open! ${openTime} - ${closeTime}`;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        isOpen,
        acceptingOrders,
        message,
        currentTime,
        dayOfWeek,
        todayHours: {
          open: openTime,
          close: closeTime
        }
      })
    };

  } catch (error: any) {
    console.error('Error checking store status:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to check store status',
        details: error.message
      })
    };
  }
};
