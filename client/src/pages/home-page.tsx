import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import HeroSection from "@/components/home/hero-section";
import ChristmasPromoSection from "@/components/home/christmas-promo-section";
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

        {/* Open Graph Tags */}
        <meta property="og:title" content="Best Pizza Delivery Asheville NC | Favilla's NY Pizza" />
        <meta property="og:description" content="⭐ 4.5 Stars from 1,081+ Reviews! Best pizza delivery in Asheville. Authentic NY pizza by the slice & whole pies with Brooklyn family recipes since 1969." />
        <meta property="og:url" content="https://favillaspizzeria.com/" />
        <meta property="og:type" content="restaurant" />
        <meta property="og:image" content="https://favillaspizzeria.com/images/hero-bg.jpg" />
        <meta property="og:locale" content="en_US" />

        {/* Twitter Card Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Best Pizza Delivery Asheville NC | Favilla's NY Pizza" />
        <meta name="twitter:description" content="⭐ 4.5 Stars from 1,081+ Reviews! Best pizza delivery in Asheville. Authentic NY pizza by the slice & whole pies." />
        <meta name="twitter:image" content="https://favillaspizzeria.com/images/hero-bg.jpg" />

        {/* Enhanced Restaurant & LocalBusiness Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Restaurant",
            "name": "Favilla's NY Pizza",
            "alternateName": "Favilla's Pizzeria",
            "description": "Authentic New York-style pizza in Asheville, NC. Serving pizza by the slice and whole pies with Brooklyn family recipes since 1969.",
            "image": [
              "https://favillaspizzeria.com/images/hero-bg.jpg",
              "https://favillaspizzeria.com/images/lineup.jpg"
            ],
            "logo": "https://favillaspizzeria.com/logo.png",
            "@id": "https://favillaspizzeria.com/#restaurant",
            "url": "https://favillaspizzeria.com/",
            "telephone": "+1-828-225-2885",
            "email": "info@favillaspizzeria.com",
            "priceRange": "$$",
            "servesCuisine": ["Pizza", "Italian", "New York Style Pizza"],
            "menu": "https://favillaspizzeria.com/menu",
            "acceptsReservations": false,
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "5 Regent Park Blvd",
              "addressLocality": "Asheville",
              "addressRegion": "NC",
              "postalCode": "28806",
              "addressCountry": "US"
            },
            "geo": {
              "@type": "GeoCoordinates",
              "latitude": "35.5793183",
              "longitude": "-82.5967883"
            },
            "openingHoursSpecification": [
              {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": ["Tuesday", "Wednesday", "Thursday"],
                "opens": "11:00",
                "closes": "20:00"
              },
              {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": ["Friday", "Saturday"],
                "opens": "11:00",
                "closes": "21:00"
              },
              {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": "Sunday",
                "opens": "12:00",
                "closes": "20:00"
              }
            ],
            "paymentAccepted": ["Cash", "Credit Card", "Debit Card"],
            "currenciesAccepted": "USD",
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.5",
              "reviewCount": "1081",
              "bestRating": "5",
              "worstRating": "1"
            },
            "hasOfferCatalog": {
              "@type": "OfferCatalog",
              "name": "Pizza Menu",
              "itemListElement": [
                {
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "MenuItem",
                    "name": "NY Style Pizza by the Slice",
                    "description": "Authentic New York style pizza sold by the slice"
                  }
                },
                {
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "MenuItem",
                    "name": "NY Style Whole Pies",
                    "description": "Authentic New York style whole pizzas"
                  }
                },
                {
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "MenuItem",
                    "name": "Calzones",
                    "description": "Fresh baked calzones with your choice of fillings"
                  }
                },
                {
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "MenuItem",
                    "name": "Italian Classics",
                    "description": "Authentic Italian dishes"
                  }
                }
              ]
            }
          })}
        </script>

        {/* Organization Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Favilla's NY Pizza",
            "alternateName": "Favilla's Pizzeria",
            "url": "https://favillaspizzeria.com/",
            "logo": "https://favillaspizzeria.com/logo.png",
            "contactPoint": {
              "@type": "ContactPoint",
              "telephone": "+1-828-225-2885",
              "contactType": "customer service",
              "areaServed": "US",
              "availableLanguage": "en"
            },
            "sameAs": [
              "https://www.facebook.com/favillaspizza",
              "https://www.instagram.com/favillaspizza"
            ]
          })}
        </script>

        {/* Breadcrumb Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://favillaspizzeria.com/"
              }
            ]
          })}
        </script>
      </Helmet>

      <div className="min-h-screen lg:pt-20 pt-12">
        {/* Hero Section */}
        <HeroSection />

        {/* Christmas Promo Section - Only shows in December */}
        <ChristmasPromoSection />

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
