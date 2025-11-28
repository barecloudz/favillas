import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import HeroSection from "@/components/home/hero-section";
import FeaturedSection from "@/components/home/featured-section";
import WhyFavillasSection from "@/components/home/why-favilias-section";
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
        <title>Best Pizza Delivery Asheville NC | Favilla's NY Pizza - Pizza by the Slice</title>
        <meta name="description" content="⭐ 4.5 Stars from 1,081+ Reviews! Best pizza delivery in Asheville. Favilla's serves authentic NY pizza by the slice & whole pies with Brooklyn family recipes since 1969. Order online now!" />
        <meta name="keywords" content="pizza delivery asheville, best pizza delivery asheville, pizza by the slice asheville, ny pizza asheville, best pizza in asheville, new york pizza asheville, brooklyn pizza asheville, pizza asheville, authentic ny pizza, pizza near me asheville, pizza near me, best pizza near me, food near me, pizza delivery near me" />
        <link rel="canonical" href="https://favillaspizzeria.com/" />
      </Helmet>

      <div className="min-h-screen lg:pt-20 pt-12">
        {/* Hero Section */}
        <HeroSection />

        {/* Featured Section */}
        <FeaturedSection menuItems={featuredItems} />

        {/* Why Favilla's Section - Competitive advantages */}
        <WhyFavillasSection />

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
