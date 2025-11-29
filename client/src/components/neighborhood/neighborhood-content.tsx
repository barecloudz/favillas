import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Pizza, Utensils } from "lucide-react";

interface NeighborhoodContentProps {
  neighborhoodName: string;
  introText: string;
  areasServed: string[];
  landmarks: string[];
  localAnecdote: string;
  keywords: string[];
}

const NeighborhoodContent: React.FC<NeighborhoodContentProps> = ({
  neighborhoodName,
  introText,
  areasServed,
  landmarks,
  localAnecdote,
  keywords
}) => {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Intro Text */}
          <div className="prose prose-lg max-w-none mb-12">
            <p className="text-xl text-gray-700 leading-relaxed">
              {introText}
            </p>
          </div>

          {/* Areas We Serve */}
          <div className="bg-[#f9f5f0] p-8 rounded-xl mb-12">
            <h2 className="text-3xl font-bold mb-6 text-[#d73a31] flex items-center gap-3">
              <MapPin className="w-7 h-7" />
              Areas We Serve in {neighborhoodName}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {areasServed.map((area, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#d73a31] rounded-full"></div>
                  <span className="text-gray-700 font-medium">{area}</span>
                </div>
              ))}
            </div>
          </div>

          {/* What Makes Our Pizza Special */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-6 text-gray-900 flex items-center gap-3">
              <Pizza className="w-7 h-7 text-[#d73a31]" />
              Authentic NY-Style Pizza in {neighborhoodName}
            </h2>
            <div className="prose prose-lg max-w-none">
              <p className="text-lg text-gray-700 leading-relaxed mb-4">
                Looking for the <strong>best pizza in {neighborhoodName}</strong>? You've found it! Favilla's serves authentic New York-style pizza with a perfectly crispy, hand-tossed crust that folds just right. Every pie is made fresh to order with our signature sauce from Italian tomatoes and premium mozzarella cheese.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                We're proud to serve residents of {neighborhoodName} with fast delivery, pickup, and dine-in options. Whether you're craving a classic cheese slice or a loaded specialty pizza, we've got something for everyone.
              </p>
            </div>
          </div>

          {/* Menu Highlights */}
          <div className="bg-gradient-to-br from-[#d73a31] to-[#c22d25] p-8 rounded-xl mb-12 text-white">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
              <Utensils className="w-7 h-7" />
              Our Menu
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-xl font-bold mb-3">🍕 Pizza</h3>
                <ul className="space-y-2">
                  <li>• NY Style Thin Crust</li>
                  <li>• Sicilian Thick Crust</li>
                  <li>• Pizza by the Slice</li>
                  <li>• Specialty Pizzas</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-3">🥖 Italian Specialties</h3>
                <ul className="space-y-2">
                  <li>• Hand-Folded Calzones</li>
                  <li>• Fresh Stromboli</li>
                  <li>• Fresh Salads</li>
                  <li>• Garlic Knots & Apps</li>
                </ul>
              </div>
            </div>
            <div className="mt-6">
              <Link href="/menu">
                <Button className="bg-white text-[#d73a31] hover:bg-gray-100 px-8 py-4 text-lg rounded-full font-bold w-full md:w-auto">
                  VIEW FULL MENU
                </Button>
              </Link>
            </div>
          </div>

          {/* Local Anecdote & Landmarks */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-6 text-gray-900">
              Your Neighborhood Pizza Spot
            </h2>
            <div className="prose prose-lg max-w-none">
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                {localAnecdote}
              </p>
              {landmarks.length > 0 && (
                <p className="text-gray-600 italic">
                  <strong>Near:</strong> {landmarks.join(" • ")}
                </p>
              )}
            </div>
          </div>

          {/* SEO Keywords Section */}
          <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200">
            <h3 className="text-lg font-bold mb-3 text-gray-800">Popular Searches:</h3>
            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword, index) => (
                <span key={index} className="bg-white px-4 py-2 rounded-full text-sm text-gray-700 border border-gray-300">
                  {keyword}
                </span>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-12 text-center bg-gradient-to-r from-[#f9f5f0] to-[#f3ebe1] p-12 rounded-xl">
            <h2 className="text-4xl font-bold mb-4 text-[#d73a31]">
              Order Now — Hot & Fresh!
            </h2>
            <p className="text-xl text-gray-700 mb-6">
              Delivering authentic NY pizza to {neighborhoodName}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/menu">
                <Button className="bg-[#d73a31] hover:bg-[#c73128] text-white px-10 py-6 text-xl rounded-full font-bold shadow-xl">
                  ORDER DELIVERY
                </Button>
              </Link>
              <a href="tel:+18282252885">
                <Button variant="outline" className="border-2 border-[#d73a31] text-[#d73a31] hover:bg-[#d73a31] hover:text-white px-10 py-6 text-xl rounded-full font-bold">
                  <Phone className="w-5 h-5 mr-2" />
                  (828) 225-2885
                </Button>
              </a>
            </div>
            <div className="mt-6">
              <a href="https://share.google/8zWZ62d06mHJ4GZ1o" target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" className="bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-4 text-lg rounded-full font-semibold">
                  <MapPin className="w-5 h-5 mr-2" />
                  Get Directions to Favilla's
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NeighborhoodContent;
