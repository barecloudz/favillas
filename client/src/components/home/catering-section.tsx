import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, Users, Calendar, Phone } from "lucide-react";

const CateringSection: React.FC = () => {
  return (
    <section className="py-16 bg-gradient-to-br from-red-50 via-white to-orange-50">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <UtensilsCrossed className="w-8 h-8 text-[#d73a31]" />
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-[#d73a31]">
              Catering for Any Occasion
            </h2>
            <p className="text-xl text-gray-700 max-w-2xl mx-auto">
              From office parties to family gatherings, let Favilla's bring authentic NY pizza to your next event
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-full mb-4">
                <Users className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-gray-900">Any Group Size</h3>
              <p className="text-gray-600">Whether it's 10 or 100+ guests, we've got you covered with delicious pizza</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-4">
                <Calendar className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-gray-900">Easy Scheduling</h3>
              <p className="text-gray-600">Book your catering order online and schedule pickup or delivery</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-purple-100 rounded-full mb-4">
                <Phone className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-gray-900">Personal Service</h3>
              <p className="text-gray-600">Our team will help customize the perfect menu for your event</p>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <div className="relative inline-block">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#d73a31] via-[#ff6b35] to-[#d73a31] rounded-full blur opacity-30 animate-pulse"></div>
              <Link href="/catering">
                <Button className="relative inline-flex items-center px-10 py-5 bg-gradient-to-r from-[#d73a31] to-[#ff6b35] hover:from-[#c73128] hover:to-[#e55a2b] text-white text-lg font-bold rounded-full shadow-2xl transform hover:scale-105 transition-all duration-300 border-2 border-white/20">
                  <UtensilsCrossed className="w-5 h-5 mr-2" />
                  Order Catering
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-gray-600 text-sm">
              Perfect for office lunches, birthday parties, game days & more!
            </p>
            <p className="mt-2 text-gray-500 text-xs font-medium">
              Please submit catering orders at least 24 hours in advance
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CateringSection;
