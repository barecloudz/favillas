import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL, {
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
});

async function updateFAQHours() {
  try {
    console.log('Updating FAQ hours...');

    // Update the FAQ about hours to reflect Monday as CLOSED
    const result = await sql`
      UPDATE faqs
      SET answer = 'We''re open Tuesday-Thursday 11:00 AM - 8:00 PM, Friday-Saturday 11:00 AM - 9:00 PM, and Sunday 12:00 PM - 8:00 PM. We''re CLOSED on Mondays. Order online 24/7 at favillaspizzeria.com for pickup or delivery!',
          updated_at = CURRENT_TIMESTAMP
      WHERE question = 'What are your hours in Asheville?'
      RETURNING *
    `;

    if (result.length > 0) {
      console.log('✅ FAQ hours updated successfully');
      console.log('Updated FAQ:', result[0]);
    } else {
      console.log('⚠️  No FAQ found with the question "What are your hours in Asheville?"');
    }

  } catch (error) {
    console.error('❌ Error updating FAQ hours:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

updateFAQHours();
