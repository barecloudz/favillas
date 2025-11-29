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

        {/* Open Graph Tags */}
        <meta property="og:title" content={data.title} />
        <meta property="og:description" content={data.metaDescription} />
        <meta property="og:url" content={`https://favillaspizzeria.com/${data.slug}`} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://favillaspizzeria.com/images/hero-bg.jpg" />

        {/* Local Business Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Restaurant",
            "name": `Favilla's NY Pizza - ${data.name}`,
            "description": data.metaDescription,
            "servesCuisine": ["Pizza", "Italian"],
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "5 Regent Park Blvd",
              "addressLocality": "Asheville",
              "addressRegion": "NC",
              "postalCode": "28806",
              "addressCountry": "US"
            },
            "telephone": "+1-828-225-2885",
            "url": `https://favillaspizzeria.com/${data.slug}`,
            "areaServed": data.areasServed,
            "priceRange": "$$"
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
