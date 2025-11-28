import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import HeroSection from "@/components/home/hero-section";
import FeaturedSection from "@/components/home/featured-section";
import RewardsSection from "@/components/home/rewards-section";
import LocationSection from "@/components/home/location-section";
import SeoContentSection from "@/components/home/seo-content-section";
import FAQSection from "@/components/home/faq-section";
import Footer from "@/components/layout/footer";

const HomePage = () => {
  const { data: featuredItems } = useQuery({
    queryKey: ["/api/featured"],
  });

  return (
    <>
      <Helmet>
        <title>Best NY Pizza in Asheville NC | Favilla's - Authentic New York Style Pizza</title>
        <meta name="description" content="Voted Best Pizza in Asheville! Favilla's serves authentic New York style pizza, calzones, and stromboli with Brooklyn family recipes since 1969. Order online for pickup & delivery in Asheville, NC." />
        <meta name="keywords" content="ny pizza asheville, best pizza in asheville, new york pizza asheville, brooklyn pizza asheville, pizza asheville, authentic ny pizza, calzones asheville, stromboli asheville, pizza delivery asheville, pizza near me asheville" />
        <link rel="canonical" href="https://favillaspizzeria.com/" />
      </Helmet>

      <div className="min-h-screen lg:pt-20 pt-12">
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

        {/* FAQ Section - Optimized for voice search */}
        <FAQSection />

        {/* Footer */}
        <Footer />
      </div>
    </>
  );
};

export default HomePage;
