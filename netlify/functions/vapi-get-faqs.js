/**
 * Netlify Function: Get FAQs for VAPI Assistant
 *
 * Path: /.netlify/functions/vapi-get-faqs
 *
 * This function fetches FAQs from the database for the VAPI phone agent
 * to answer common customer questions
 */

const axios = require('axios');

exports.handler = async (event, context) => {
  // Only allow POST requests (VAPI sends POST for tool calls)
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  console.log('📚 Fetching FAQs for VAPI assistant');

  try {
    // Get the base URL for API calls
    const baseUrl = process.env.URL || 'https://preview--pizzaspin.netlify.app';
    const faqsApiUrl = `${baseUrl}/api/faqs`;

    console.log('🔗 Fetching from:', faqsApiUrl);

    // Fetch FAQs from the API
    const response = await axios.get(faqsApiUrl, {
      timeout: 5000
    });

    const faqs = response.data;
    console.log(`✅ Retrieved ${faqs.length} FAQs`);

    // Format FAQs for the assistant
    const formattedFaqs = faqs.map(faq => ({
      question: faq.question,
      answer: faq.answer
    }));

    // Return formatted FAQs to VAPI
    // The assistant will use these to answer customer questions
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        result: formattedFaqs.length > 0
          ? `Here are our frequently asked questions:\n\n${formattedFaqs.map((faq, i) =>
              `${i + 1}. ${faq.question}\n   ${faq.answer}`
            ).join('\n\n')}`
          : "I don't have access to the FAQ information right now, but I'd be happy to transfer you to our front desk for assistance."
      })
    };

  } catch (error) {
    console.error('❌ Error fetching FAQs:', error.message);

    // Return error message that assistant can speak
    return {
      statusCode: 200, // Still return 200 so VAPI processes the response
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        result: "I'm having trouble accessing our FAQ information right now. Would you like me to transfer you to our front desk? They can help answer your question."
      })
    };
  }
};
