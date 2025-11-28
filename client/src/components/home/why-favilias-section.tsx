import React from "react";
import { Check } from "lucide-react";

const WhyFavillasSection: React.FC = () => {
  return (
    <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-[#d73a31]">
              Why Favilla's is Asheville's #1 Pizza
            </h2>
            <p className="text-xl text-gray-700">
              Voted Best Pizza in Asheville for a Reason
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              <div className="flex items-start space-x-4 bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2 text-gray-900">⭐ 1,081+ Five-Star Reviews</h3>
                  <p className="text-gray-600">Rated 4.5 stars by the Asheville community. Our customers speak for themselves!</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2 text-gray-900">Brooklyn Family Recipes Since 1969</h3>
                  <p className="text-gray-600">Authentic Italian recipes perfected in Brooklyn and brought to Asheville with love.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2 text-gray-900">Fresh Dough Made Daily</h3>
                  <p className="text-gray-600">Never frozen. We make our dough fresh every single day using traditional methods.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2 text-gray-900">Pizza by the Slice & Full Pies</h3>
                  <p className="text-gray-600">Grab a quick slice in-store or order a whole pie online for delivery or pickup.</p>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div className="flex items-start space-x-4 bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2 text-gray-900">Fast Delivery Across Asheville</h3>
                  <p className="text-gray-600">Hot, fresh pizza delivered quickly to your door throughout Asheville and surrounding areas.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2 text-gray-900">Family-Owned Since 2013</h3>
                  <p className="text-gray-600">Not a chain! We're a local family business that treats every customer like family.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2 text-gray-900">Catering for Events & Parties</h3>
                  <p className="text-gray-600">Planning an event? We offer catering services with the same quality you love.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2 text-gray-900">Rewards Program for Loyal Customers</h3>
                  <p className="text-gray-600">Earn points with every order and get rewarded for being a Favilla's fan!</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-12 text-center">
            <div className="bg-[#d73a31] text-white py-8 px-6 rounded-lg shadow-xl">
              <h3 className="text-3xl font-bold mb-4">Experience the Best Pizza in Asheville Today!</h3>
              <p className="text-lg mb-6">Join thousands of satisfied customers. Order online for delivery or pickup.</p>
              <a href="/menu" className="inline-block bg-white text-[#d73a31] px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-100 transition-colors shadow-lg">
                Order Now
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyFavillasSection;
