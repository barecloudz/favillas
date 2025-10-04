import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import HeroSection from "@/components/home/hero-section";
import FeaturedSection from "@/components/home/featured-section";
import RewardsSection from "@/components/home/rewards-section";
import LocationSection from "@/components/home/location-section";
import Footer from "@/components/layout/footer";

const HomePage = () => {
  const { data: featuredItems } = useQuery({
    queryKey: ["/api/featured"],
  });

  return (
    <>
      <Helmet>
        <title>Favilla's NY Pizza - Authentic New York Style Pizza</title>
        <meta name="description" content="Order authentic New York style pizza from Favilla's. Fast delivery, fresh ingredients, and amazing taste." />
      </Helmet>

      <div className="min-h-screen md:pt-[72px] pt-[60px]">
        {/* Hero Section */}
        <HeroSection />
        
        {/* Featured Section */}
        <FeaturedSection menuItems={featuredItems} />
        
        {/* Rewards Section */}
        <RewardsSection />
        
        {/* Location Section */}
        <LocationSection />
        
        {/* Footer */}
        <Footer />
      </div>
    </>
  );
};

export default HomePage;
