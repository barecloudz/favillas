import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MapPin, Clock } from "lucide-react";

interface NeighborhoodHeroProps {
  neighborhoodName: string;
  subheadline: string;
  distanceFromFavillas: string;
  deliveryTime: string;
}

const NeighborhoodHero: React.FC<NeighborhoodHeroProps> = ({
  neighborhoodName,
  subheadline,
  distanceFromFavillas,
  deliveryTime
}) => {
  return (
    <section className="relative h-screen lg:h-[600px] bg-cover bg-center -mt-20 lg:-mt-20" style={{ backgroundImage: "url('/images/hero-bg.jpg')" }}>
      <div className="absolute inset-0 bg-black bg-opacity-50"></div>
      <div className="container mx-auto px-4 h-full flex flex-col justify-center items-center relative z-10 text-center">
        <img src="/images/logopng.png" alt="Favilla's Pizza Logo" className="w-[140px] md:w-[170px] mb-4" loading="eager" fetchpriority="high" />

        <div className="text-yellow-400 text-xl md:text-2xl mb-3">⭐⭐⭐⭐⭐ <span className="text-white text-sm md:text-base ml-2">4.5 / 1,081+ Reviews</span></div>

        <h1 className="text-3xl md:text-5xl font-display text-white font-bold mb-3">
          AUTHENTIC NEW YORK PIZZA IN {neighborhoodName.toUpperCase()}
        </h1>

        <h2 className="text-xl md:text-2xl text-yellow-400 font-bold mb-4">By the Slice & Whole Pies</h2>

        <p className="text-base md:text-lg text-white mb-4 max-w-2xl">
          {subheadline}
        </p>

        {/* Distance and Delivery Info */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 text-white">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#f2c94c]" />
            <span className="text-sm md:text-base">{distanceFromFavillas} from Favilla's</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#f2c94c]" />
            <span className="text-sm md:text-base">{deliveryTime} delivery</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6">
          <Link href="/menu">
            <Button className="bg-white hover:bg-gray-100 text-[#d73a31] px-6 md:px-8 py-4 md:py-6 text-lg rounded-full font-bold">
              ORDER ONLINE
            </Button>
          </Link>
          <Link href="/menu">
            <Button variant="secondary" className="bg-[#f2c94c] hover:bg-[#e0b93e] text-black px-6 md:px-8 py-4 md:py-6 text-lg rounded-full font-bold">
              VIEW MENU
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default NeighborhoodHero;
