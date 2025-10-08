import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import HeroSection from "@/components/home/hero-section";
import FeaturedSection from "@/components/home/featured-section";
import RewardsSection from "@/components/home/rewards-section";
import LocationSection from "@/components/home/location-section";
import SeoContentSection from "@/components/home/seo-content-section";
import Footer from "@/components/layout/footer";

const HomePage = () => {
  const { data: featuredItems } = useQuery({
    queryKey: ["/api/featured"],
  });

  return (
    <>
      <Helmet>
        <title>Best Pizza in Asheville NC | Favilla's NY Pizza - Authentic Italian Restaurant</title>
        <meta name="description" content="Voted Best Pizza in Asheville! Favilla's serves authentic Italian pizza, calzones, and stromboli. Family-owned since 1969. Order online for pickup & delivery in Asheville, NC." />
        <meta name="keywords" content="pizza asheville, best pizza in asheville, asheville pizza, italian restaurant asheville, ny pizza asheville, calzones asheville, stromboli asheville, pizza delivery asheville" />
        <link rel="canonical" href="https://favillaspizzeria.com/" />
      </Helmet>

      <div className="min-h-screen md:pt-[72px] pt-[60px]">
        {/* Hero Section */}
        <HeroSection />

        {/* Featured Section */}
        <FeaturedSection menuItems={featuredItems} />

        {/* SEO Content Section - Rich keyword content for search engines */}
        <SeoContentSection />

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
