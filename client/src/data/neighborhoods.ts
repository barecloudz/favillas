// Neighborhood data for SEO landing pages
export interface NeighborhoodData {
  slug: string; // URL slug (e.g., "South-Asheville")
  name: string; // Display name (e.g., "South Asheville")
  title: string; // Page title for SEO
  metaDescription: string; // Meta description
  heroSubheadline: string; // Hero subheadline
  introText: string; // Unique intro paragraph
  distanceFromFavillas: string; // e.g., "2.5 miles"
  deliveryTime: string; // e.g., "15-25 minutes"
  areasServed: string[]; // List of specific areas within neighborhood
  landmarks: string[]; // 2-3 local landmarks
  localAnecdote: string; // Community connection story
  testimonials: {
    name: string;
    location: string;
    text: string;
    rating: number;
  }[];
  keywords: string[]; // SEO keywords for this neighborhood
}

// Master list of all neighborhoods (we'll populate this as we create pages)
export const neighborhoods: NeighborhoodData[] = [];