import { Handler } from '@netlify/functions';
import postgres from 'postgres';

let dbConnection: any = null;

function getDB() {
  if (dbConnection) return dbConnection;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  dbConnection = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    keep_alive: false,
  });

  return dbConnection;
}

interface CateringInquiry {
  eventType: string;
  customEventType?: string;
  serviceType: string;
  eventAddress?: string;
  eventDate?: string;
  eventTime?: string;
  specialDeliveryInstructions?: string;
  guestCount: string;
  customGuestCount?: number;
  menuStyle: string;
  dietaryRestrictions: string[];
  budgetRange: string;
  additionalServices: string[];
  specialRequests: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  preferredContact: string;
  bestTimeToCall: string;
}

export const handler: Handler = async (event, context) => {
  const origin = event.headers.origin || 'http://localhost:3000';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const sql = getDB();
    const inquiryData: CateringInquiry = JSON.parse(event.body || '{}');

    // Validate required fields
    const requiredFields = ['eventType', 'serviceType', 'guestCount', 'menuStyle', 'fullName', 'phoneNumber', 'email'];
    for (const field of requiredFields) {
      if (!inquiryData[field as keyof CateringInquiry]) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Missing required field: ${field}` })
        };
      }
    }

    // If service type is delivery, validate additional required fields
    if (inquiryData.serviceType === 'delivery') {
      const deliveryRequiredFields = ['eventAddress', 'eventDate', 'eventTime'];
      for (const field of deliveryRequiredFields) {
        if (!inquiryData[field as keyof CateringInquiry]) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: `Missing required field for delivery: ${field}` })
          };
        }
      }
    }

    console.log('📝 Saving catering inquiry:', {
      name: inquiryData.fullName,
      email: inquiryData.email,
      eventType: inquiryData.eventType,
      serviceType: inquiryData.serviceType,
      guestCount: inquiryData.guestCount
    });

    // Insert catering inquiry into database
    const result = await sql`
      INSERT INTO catering_inquiries (
        event_type,
        custom_event_type,
        service_type,
        event_address,
        event_date,
        event_time,
        special_delivery_instructions,
        guest_count,
        custom_guest_count,
        menu_style,
        dietary_restrictions,
        budget_range,
        additional_services,
        special_requests,
        full_name,
        phone_number,
        email,
        preferred_contact,
        best_time_to_call,
        status,
        created_at
      ) VALUES (
        ${inquiryData.eventType},
        ${inquiryData.customEventType || null},
        ${inquiryData.serviceType},
        ${inquiryData.eventAddress || null},
        ${inquiryData.eventDate || null},
        ${inquiryData.eventTime || null},
        ${inquiryData.specialDeliveryInstructions || null},
        ${inquiryData.guestCount},
        ${inquiryData.customGuestCount || null},
        ${inquiryData.menuStyle},
        ${JSON.stringify(inquiryData.dietaryRestrictions)},
        ${inquiryData.budgetRange},
        ${JSON.stringify(inquiryData.additionalServices)},
        ${inquiryData.specialRequests},
        ${inquiryData.fullName},
        ${inquiryData.phoneNumber},
        ${inquiryData.email},
        ${inquiryData.preferredContact},
        ${inquiryData.bestTimeToCall},
        'pending',
        NOW()
      )
      RETURNING id
    `;

    const inquiryId = result[0]?.id;

    console.log('✅ Catering inquiry saved successfully:', inquiryId);

    // TODO: Send notification email to restaurant
    // TODO: Send confirmation email to customer
    // TODO: Integrate with CRM/notification system

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        inquiryId,
        message: 'Catering inquiry submitted successfully'
      })
    };

  } catch (error) {
    console.error('❌ Catering inquiry error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to submit catering inquiry',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};