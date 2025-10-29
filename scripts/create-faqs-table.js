import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL, {
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
});

async function createFAQsTable() {
  try {
    console.log('Creating FAQs table...');

    // Create faqs table
    await sql`
      CREATE TABLE IF NOT EXISTS faqs (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    console.log('✅ FAQs table created successfully');

    // Insert initial FAQs from the current hardcoded data
    console.log('Inserting initial FAQ data...');

    const initialFAQs = [
      {
        question: "Do you deliver pizza in Asheville?",
        answer: "Yes! We deliver fresh, hot pizza throughout Asheville, NC including Downtown Asheville, West Asheville, Biltmore Village, North Asheville, South Asheville, East Asheville, and Kenilworth. Order online at favillaspizzeria.com or call (828) 225-2885 for fast delivery.",
        display_order: 1
      },
      {
        question: "What are your hours in Asheville?",
        answer: "We're open Tuesday-Thursday 11:00 AM - 8:00 PM, Friday-Saturday 11:00 AM - 9:00 PM, and Sunday 12:00 PM - 8:00 PM. We're CLOSED on Mondays. Order online 24/7 at favillaspizzeria.com for pickup or delivery!",
        display_order: 2
      },
      {
        question: "Do you have NY style pizza in Asheville?",
        answer: "Absolutely! We specialize in authentic New York style pizza with thin, crispy crust and fresh ingredients. We've been serving Asheville the best NY pizza since 1969. Try our classic cheese pizza, Sicilian pizza, or build your own with premium toppings.",
        display_order: 3
      },
      {
        question: "What's the best pizza in Asheville?",
        answer: "Favilla's NY Pizza has been voted Best Pizza in Asheville! We're a family-owned Italian restaurant serving authentic NY style pizza, calzones, and stromboli since 1969. Our secret? Fresh ingredients, family recipes, and over 50 years of pizza-making tradition.",
        display_order: 4
      },
      {
        question: "Do you have a rewards program?",
        answer: "Yes! Join our Pizza Spin Rewards program and earn points with every order. Get free pizza, exclusive discounts, and special offers. Sign up online when you create your account - it's free and easy!",
        display_order: 5
      },
      {
        question: "Can I order pizza online for pickup?",
        answer: "Yes! Order online at favillaspizzeria.com for quick and easy pickup. Place your order, choose pickup, and we'll have your hot, fresh pizza ready when you arrive at our Regent Park Blvd location in Asheville.",
        display_order: 6
      },
      {
        question: "What Italian food do you serve besides pizza?",
        answer: "We offer a full menu of authentic Italian cuisine including hand-folded calzones, stromboli, fresh salads, appetizers, and desserts. All made with family recipes passed down through generations and the freshest ingredients.",
        display_order: 7
      },
      {
        question: "Where is Favilla's Pizza located in Asheville?",
        answer: "We're located at 5 Regent Park Blvd, Asheville, NC 28806. We're easily accessible from all areas of Asheville with plenty of parking. Call us at (828) 225-2885 or order online for delivery or pickup!",
        display_order: 8
      }
    ];

    for (const faq of initialFAQs) {
      await sql`
        INSERT INTO faqs (question, answer, display_order, is_active)
        VALUES (${faq.question}, ${faq.answer}, ${faq.display_order}, true)
      `;
    }

    console.log(`✅ Inserted ${initialFAQs.length} initial FAQs`);
    console.log('✅ FAQs table setup complete!');

  } catch (error) {
    console.error('❌ Error creating FAQs table:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

createFAQsTable();
