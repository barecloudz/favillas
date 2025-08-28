import { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_db';
import { menuItems } from '@shared/schema';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Cache menu for 5 minutes since it doesn't change frequently
    res.setHeader('Cache-Control', 'public, max-age=300');
    
    const allMenuItems = await db.select().from(menuItems);
    
    // If no menu items exist, return sample items
    if (!allMenuItems || allMenuItems.length === 0) {
      const sampleItems = [
        {
          id: 1,
          name: "Margherita Pizza",
          description: "Fresh mozzarella, tomato sauce, and basil",
          basePrice: "12.99",
          category: "Traditional Pizza",
          imageUrl: "/images/f1.png",
          isAvailable: true,
          isPopular: false,
          isNew: false,
          isBestSeller: false,
          options: null,
          createdAt: new Date()
        },
        {
          id: 2,
          name: "Pepperoni Pizza",
          description: "Classic pepperoni with mozzarella and tomato sauce",
          basePrice: "14.99",
          category: "Traditional Pizza",
          imageUrl: "/images/f2.jpg",
          isAvailable: true,
          isPopular: true,
          isNew: false,
          isBestSeller: true,
          options: null,
          createdAt: new Date()
        }
      ];
      
      return res.status(200).json(sampleItems);
    }

    res.status(200).json(allMenuItems);
  } catch (error) {
    console.error('Menu API error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch menu items',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}