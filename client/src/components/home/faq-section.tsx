import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: "Do you deliver pizza in Asheville?",
    answer: "Yes! We deliver fresh, hot pizza throughout Asheville, NC including Downtown Asheville, West Asheville, Biltmore Village, North Asheville, South Asheville, East Asheville, and Kenilworth. Order online at favillaspizzeria.com or call (828) 225-2885 for fast delivery."
  },
  {
    question: "What are your hours in Asheville?",
    answer: "We're open Monday-Thursday 11:00 AM - 8:00 PM, Friday-Saturday 11:00 AM - 9:00 PM, and Sunday 12:00 PM - 8:00 PM. Order online 24/7 at favillaspizzeria.com for pickup or delivery!"
  },
  {
    question: "Do you have NY style pizza in Asheville?",
    answer: "Absolutely! We specialize in authentic New York style pizza with thin, crispy crust and fresh ingredients. We've been serving Asheville the best NY pizza since 1969. Try our classic cheese pizza, Sicilian pizza, or build your own with premium toppings."
  },
  {
    question: "What's the best pizza in Asheville?",
    answer: "Favilla's NY Pizza has been voted Best Pizza in Asheville! We're a family-owned Italian restaurant serving authentic NY style pizza, calzones, stromboli, and pasta since 1969. Our secret? Fresh ingredients, family recipes, and over 50 years of pizza-making tradition."
  },
  {
    question: "Do you have a rewards program?",
    answer: "Yes! Join our Pizza Spin Rewards program and earn points with every order. Get free pizza, exclusive discounts, and special offers. Sign up online when you create your account - it's free and easy!"
  },
  {
    question: "Can I order pizza online for pickup?",
    answer: "Yes! Order online at favillaspizzeria.com for quick and easy pickup. Place your order, choose pickup, and we'll have your hot, fresh pizza ready when you arrive at our Regent Park Blvd location in Asheville."
  },
  {
    question: "What Italian food do you serve besides pizza?",
    answer: "We offer a full menu of authentic Italian cuisine including hand-folded calzones, stromboli, traditional pasta dishes (spaghetti, lasagna, chicken parmesan), fresh salads, Italian subs, and appetizers. All made with family recipes passed down through generations."
  },
  {
    question: "Where is Favilla's Pizza located in Asheville?",
    answer: "We're located at 5 Regent Park Blvd, Asheville, NC 28806. We're easily accessible from all areas of Asheville with plenty of parking. Call us at (828) 225-2885 or order online for delivery or pickup!"
  }
];

const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  // Generate FAQ Schema for SEO
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqData.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <>
      {/* FAQ Schema for Voice Search & SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <section id="faq" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 text-[#d73a31]">
              FREQUENTLY ASKED QUESTIONS
            </h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
              Got questions about our pizza, delivery, or rewards? We've got answers!
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {faqData.map((faq, index) => (
              <div
                key={index}
                className="mb-4 border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full flex justify-between items-center p-6 text-left bg-[#f9f5f0] hover:bg-[#f5ede3] transition-colors"
                  aria-expanded={openIndex === index}
                  aria-controls={`faq-answer-${index}`}
                >
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 pr-4">
                    {faq.question}
                  </h3>
                  {openIndex === index ? (
                    <ChevronUp className="w-6 h-6 text-[#d73a31] flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-6 h-6 text-[#d73a31] flex-shrink-0" />
                  )}
                </button>

                {openIndex === index && (
                  <div
                    id={`faq-answer-${index}`}
                    className="p-6 bg-white border-t border-gray-200"
                  >
                    <p className="text-gray-700 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">
              Have more questions? Give us a call!
            </p>
            <a
              href="tel:+18282252885"
              className="inline-block bg-[#d73a31] hover:bg-[#c73128] text-white font-bold py-3 px-8 rounded-full text-lg transition-colors"
            >
              Call (828) 225-2885
            </a>
          </div>
        </div>
      </section>
    </>
  );
};

export default FAQSection;
