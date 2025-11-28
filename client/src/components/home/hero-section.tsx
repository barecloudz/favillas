import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-supabase-auth";

const HeroSection: React.FC = () => {
  const { user } = useAuth();

  const handleRewardsClick = () => {
    if (user) {
      // If logged in, navigate to rewards page
      window.location.href = '/rewards';
    } else {
      // If not logged in, scroll to rewards section
      const rewardsSection = document.getElementById('rewards');
      if (rewardsSection) {
        rewardsSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <section className="relative h-screen lg:h-[600px] bg-cover bg-center -mt-20 lg:-mt-20" style={{ backgroundImage: "url('/images/hero-bg.jpg')" }}>
      <div className="absolute inset-0 bg-black bg-opacity-50"></div>
      <div className="container mx-auto px-4 h-full flex flex-col justify-center items-center relative z-10 text-center">
        <img src="/images/logopng.png" alt="Favilla's Pizza Logo" className="w-[160px] md:w-[190px] mb-6" loading="eager" fetchpriority="high" />
        <div className="mb-4">
          <div className="text-yellow-400 text-2xl md:text-3xl mb-2">⭐⭐⭐⭐⭐</div>
          <p className="text-white text-sm md:text-base font-semibold">4.5 Stars from 1,081+ Happy Customers</p>
        </div>
        <h1 className="text-4xl md:text-6xl font-display text-white font-bold mb-4">AUTHENTIC NEW YORK PIZZA</h1>
        <h2 className="text-2xl md:text-3xl text-yellow-400 font-bold mb-6">By the Slice & Whole Pies</h2>
        <p className="text-lg md:text-xl text-white mb-8 max-w-2xl">
          Since 2013, Favilla's has been bringing authentic New York pizza to Asheville. Our pizzas, calzones, and strombolis are made with fresh dough, handmade every day using Italian family recipes perfected in Brooklyn since 1969.
        </p>
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6">
          <Link href="/menu">
            <Button className="bg-white hover:bg-gray-100 text-[#d73a31] px-6 md:px-8 py-4 md:py-6 text-lg rounded-full font-bold">ORDER ONLINE</Button>
          </Link>
          <Button 
            onClick={handleRewardsClick}
            variant="secondary" 
            className="bg-[#f2c94c] hover:bg-[#e0b93e] text-black px-6 md:px-8 py-4 md:py-6 text-lg rounded-full font-bold"
          >
            REWARDS
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
