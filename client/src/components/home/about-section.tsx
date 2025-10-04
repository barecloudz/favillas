import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const AboutSection: React.FC = () => {
  return (
    <section id="about" className="py-12 md:py-20 bg-[#f9f5f0]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-stretch">
          <div className="order-1 md:order-1">
            <div className="bg-white p-6 md:p-10 rounded-xl shadow-lg h-full flex flex-col justify-center">
              <h3 className="text-2xl md:text-4xl font-bold text-[#d73a31] mb-4 md:mb-8">OUR STORY</h3>
              <p className="text-base md:text-lg text-gray-700 mb-4 md:mb-6 leading-relaxed">
                Welcome to Favilla's, where authentic Italian tradition meets the heart of Asheville.
                As a real Italian family, we've poured our heritage into every pizza we craft—using time-honored recipes,
                fresh ingredients, and a whole lot of amore.
              </p>
              <p className="text-base md:text-lg text-gray-700 mb-6 md:mb-8 leading-relaxed">
                Our community agrees: it's the best pizza in town. Come taste the difference at Favilla's—where every slice feels like home.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8 md:mb-10">
                <p className="text-base md:text-lg font-bold text-[#d73a31]">
                  Family-owned since 1969
                </p>
                <div className="hidden sm:block w-0.5 bg-gray-300 mx-2"></div>
                <p className="text-base md:text-lg font-bold text-[#d73a31]">
                  Authentic NY Style
                </p>
              </div>
              <div className="mt-auto">
                <Link href="/menu">
                  <Button className="bg-[#d73a31] hover:bg-[#c73128] text-white px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-bold rounded-full">
                    ORDER ONLINE
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          
          <div className="order-2 md:order-2">
            <div className="h-full">
              <img
                src="/images/lineup.jpg"
                alt="Favilla's Pizza Team"
                className="rounded-xl shadow-xl w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
