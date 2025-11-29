import React from "react";
import { Star } from "lucide-react";

interface Testimonial {
  name: string;
  location: string;
  text: string;
  rating: number;
}

interface NeighborhoodTestimonialsProps {
  neighborhoodName: string;
  testimonials: Testimonial[];
}

const NeighborhoodTestimonials: React.FC<NeighborhoodTestimonialsProps> = ({
  neighborhoodName,
  testimonials
}) => {
  return (
    <section className="py-16 bg-[#f9f5f0]">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-[#d73a31]">
              What {neighborhoodName} Neighbors Are Saying
            </h2>
            <p className="text-xl text-gray-700">
              Real reviews from real customers in your neighborhood
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-lg border-2 border-gray-100 hover:border-[#d73a31] transition-all duration-300">
                {/* Star Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-[#f2c94c] text-[#f2c94c]" />
                  ))}
                </div>

                {/* Review Text */}
                <p className="text-gray-700 mb-4 italic">
                  "{testimonial.text}"
                </p>

                {/* Author Info */}
                <div className="border-t pt-4">
                  <p className="font-bold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-600">{testimonial.location}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Note about reviews */}
          <p className="text-center text-gray-500 text-sm mt-8 italic">
            Reviews are representative of customer feedback. Actual customer names may vary.
          </p>
        </div>
      </div>
    </section>
  );
};

export default NeighborhoodTestimonials;
