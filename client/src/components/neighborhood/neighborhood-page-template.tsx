import React from "react";
import { Helmet } from "react-helmet";
import { NeighborhoodData } from "@/data/neighborhoods";
import NeighborhoodHero from "./neighborhood-hero";
import NeighborhoodContent from "./neighborhood-content";
import NeighborhoodTestimonials from "./neighborhood-testimonials";
import NeighborhoodMap from "./neighborhood-map";
import Footer from "@/components/layout/footer";

interface NeighborhoodPageTemplateProps {
  data: NeighborhoodData;
}

const NeighborhoodPageTemplate: React.FC<NeighborhoodPageTemplateProps> = ({ data }) => {
  return (
    <>
      <Helmet>
        <title>{data.title}</title>
        <meta name="description" content={data.metaDescription} />
        <meta name="keywords" content={data.keywords.join(", ")} />
        <link rel="canonical" href={`https://favillaspizzeria.com/${data.slug}`} />

        {/* Open Graph Tags for Facebook/LinkedIn */}
        <meta property="og:title" content={data.title} />
        <meta property="og:description" content={data.metaDescription} />
        <meta property="og:url" content={`https://favillaspizzeria.com/${data.slug}`} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Favilla's NY Pizza" />
        <meta property="og:image" content="https://favillaspizzeria.com/images/hero-bg.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale" content="en_US" />

        {/* Twitter Card Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={data.title} />
        <meta name="twitter:description" content={data.metaDescription} />
        <meta name="twitter:image" content="https://favillaspizzeria.com/images/hero-bg.jpg" />

        {/* Enhanced Local Business Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Restaurant",
            "name": "Favilla's NY Pizza",
            "alternateName": `Favilla's Pizzeria ${data.name}`,
            "description": data.metaDescription,
            "image": [
              "https://favillaspizzeria.com/images/hero-bg.jpg",
              "https://favillaspizzeria.com/images/lineup.jpg"
            ],
            "logo": "https://favillaspizzeria.com/logo.png",
            "servesCuisine": ["Pizza", "Italian", "New York Style Pizza"],
            "priceRange": "$$",
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
            "telephone": "+1-828-225-2885",
            "email": "info@favillaspizzeria.com",
            "url": `https://favillaspizzeria.com/${data.slug}`,
            "menu": "https://favillaspizzeria.com/menu",
            "acceptsReservations": false,
            "paymentAccepted": ["Cash", "Credit Card", "Debit Card"],
            "currenciesAccepted": "USD",
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
            "areaServed": data.areasServed.map(area => ({
              "@type": "City",
              "name": area
            })),
            "hasOfferCatalog": {
              "@type": "OfferCatalog",
              "name": "Pizza Menu",
              "itemListElement": [
                {
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "MenuItem",
                    "name": "NY Style Pizza",
                    "description": "Authentic New York style pizza"
                  }
                }
              ]
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.5",
              "reviewCount": "1081",
              "bestRating": "5",
              "worstRating": "1"
            },
            "review": data.testimonials.map(testimonial => ({
              "@type": "Review",
              "author": {
                "@type": "Person",
                "name": testimonial.name
              },
              "reviewRating": {
                "@type": "Rating",
                "ratingValue": testimonial.rating,
                "bestRating": "5",
                "worstRating": "1"
              },
              "reviewBody": testimonial.text,
              "publisher": {
                "@type": "Organization",
                "name": "Favilla's NY Pizza"
              }
            }))
          })}
        </script>
      </Helmet>

      <div className="min-h-screen lg:pt-20 pt-12">
        {/* Hero Section */}
        <NeighborhoodHero
          neighborhoodName={data.name}
          subheadline={data.heroSubheadline}
          distanceFromFavillas={data.distanceFromFavillas}
          deliveryTime={data.deliveryTime}
        />

        {/* Main Content Section */}
        <NeighborhoodContent
          neighborhoodName={data.name}
          introText={data.introText}
          areasServed={data.areasServed}
          landmarks={data.landmarks}
          localAnecdote={data.localAnecdote}
          keywords={data.keywords}
        />

        {/* Testimonials Section */}
        <NeighborhoodTestimonials
          neighborhoodName={data.name}
          testimonials={data.testimonials}
        />

        {/* Map Section */}
        <NeighborhoodMap neighborhoodName={data.name} />

        {/* Footer */}
        <Footer />
      </div>
    </>
  );
};

export default NeighborhoodPageTemplate;
