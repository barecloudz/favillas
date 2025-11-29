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
    <section className="relative h-[500px] bg-cover bg-center -mt-20 lg:-mt-20" style={{ backgroundImage: "url('/images/hero-bg.jpg')" }}>
      <div className="absolute inset-0 bg-black bg-opacity-60"></div>
      <div className="container mx-auto px-4 h-full flex flex-col justify-center items-center relative z-10 text-center">
        <img src="/images/logopng.png" alt="Favilla's Pizza Logo" className="w-[140px] md:w-[170px] mb-4" loading="eager" fetchpriority="high" />

        <h1 className="text-3xl md:text-5xl font-display text-white font-bold mb-3">
          Favilla's NY Pizza – Real NY-Style Pizza in {neighborhoodName}
        </h1>

        <p className="text-lg md:text-xl text-white mb-6 max-w-3xl">
          {subheadline}
        </p>

        {/* Distance and Delivery Info */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 text-white">
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
            <Button className="bg-[#d73a31] hover:bg-[#c73128] text-white px-8 py-6 text-lg rounded-full font-bold shadow-lg">
              ORDER ONLINE NOW
            </Button>
          </Link>
          <Link href="/menu">
            <Button variant="secondary" className="bg-[#f2c94c] hover:bg-[#e0b93e] text-black px-8 py-6 text-lg rounded-full font-bold shadow-lg">
              VIEW MENU
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default NeighborhoodHero;
