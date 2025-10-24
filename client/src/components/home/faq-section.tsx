import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ChevronDown, ChevronUp, Loader2, AlertCircle } from "lucide-react";

interface FAQItem {
  id?: number;
  question: string;
  answer: string;
  display_order?: number;
  is_active?: boolean;
}

const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Fetch FAQs from API
  const { data: faqData = [], isLoading, error } = useQuery<FAQItem[]>({
    queryKey: ["/api/faqs"],
    queryFn: () => apiRequest<FAQItem[]>("/api/faqs"),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

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
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#d73a31]" />
                <span className="ml-3 text-gray-600">Loading FAQs...</span>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="flex items-center justify-center py-12 text-red-600">
                <AlertCircle className="w-6 h-6 mr-2" />
                <span>Unable to load FAQs. Please try again later.</span>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && faqData.length === 0 && (
              <div className="text-center py-12 text-gray-600">
                <p>No FAQs available at the moment.</p>
              </div>
            )}

            {/* FAQs List */}
            {!isLoading && !error && faqData.length > 0 && (
              <>
                {faqData.map((faq, index) => (
                  <div
                    key={faq.id || index}
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
              </>
            )}
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
