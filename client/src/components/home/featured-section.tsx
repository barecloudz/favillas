import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface MenuItem {
  id: number;
  name: string;
  description: string;
  basePrice: string;
  imageUrl?: string;
  category: string;
  isPopular?: boolean;
  isBestSeller?: boolean;
}

interface FeaturedSectionProps {
  menuItems?: MenuItem[];
}

const FeaturedSection: React.FC<FeaturedSectionProps> = ({ menuItems }) => {
  return (
    <section className="py-16 bg-white" id="featured">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 text-[#d73a31]">CUSTOMER FAVORITES</h2>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto">
            Voted the best pizza delivery in Asheville! Our authentic New York style pizzas are made with Italian family recipes passed down since 1969. Order online for delivery or pickup, or stop by for pizza by the slice. Experience the perfect blend of Brooklyn tradition and Italian heritage.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {menuItems && menuItems.length > 0 ? (
            // Show featured menu items from backend
            menuItems.map((item) => (
              <div key={item.id} className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300">
                <div className="h-60 overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item?.name || 'Menu Item'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500 text-4xl">🍕</span>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-bold mb-2">{item?.name || 'Unknown Item'}</h3>
                  <p className="text-gray-600 mb-2">{item.description}</p>
                  <p className="text-lg font-bold text-[#d73a31] mb-4">${item.basePrice}</p>
                  <Link href={`/menu?item=${item.id}`}>
                    <Button className="w-full bg-[#d73a31] hover:bg-[#c73128] text-white rounded-full">
                      Order Now
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          ) : (
            // Fallback to static items if no menu items available
            <>
              <div className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300">
                <div className="h-60 overflow-hidden">
                  <img
                    src="/images/f1.png"
                    alt="Traditional Pizza"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-bold mb-2">Traditional Pizza</h3>
                  <p className="text-gray-600 mb-4">Our classic thin crust pizza with perfect New York style fold, topped with premium mozzarella and our signature sauce.</p>
                  <Link href="/menu">
                    <Button className="w-full bg-[#d73a31] hover:bg-[#c73128] text-white rounded-full">
                      Order Now
                    </Button>
                  </Link>
                </div>
              </div>
              
              <div className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300">
                <div className="h-60 overflow-hidden">
                  <img
                    src="/images/f2.jpg"
                    alt="Grandma Caprese Pizza"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-bold mb-2">Grandma Caprese</h3>
                  <p className="text-gray-600 mb-4">Fresh mozzarella, ripe tomatoes, fresh basil, and extra virgin olive oil on our signature grandma-style crust.</p>
                  <Link href="/menu">
                    <Button className="w-full bg-[#d73a31] hover:bg-[#c73128] text-white rounded-full">
                      Order Now
                    </Button>
                  </Link>
                </div>
              </div>
              
              <div className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300">
                <div className="h-60 overflow-hidden">
                  <img
                    src="/images/f3.jpg"
                    alt="Stromboli"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-bold mb-2">Stromboli</h3>
                  <p className="text-gray-600 mb-4">Rolled with savory Italian meats, cheeses, and vegetables, then baked to golden perfection with our fresh dough.</p>
                  <Link href="/menu">
                    <Button className="w-full bg-[#d73a31] hover:bg-[#c73128] text-white rounded-full">
                      Order Now
                    </Button>
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className="mt-16 text-center">
          <div className="relative inline-block">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#d73a31] via-[#ff6b35] to-[#d73a31] rounded-full blur opacity-30 animate-pulse"></div>
            <Link href="/menu">
              <Button className="relative inline-flex items-center px-12 py-5 bg-gradient-to-r from-[#d73a31] to-[#ff6b35] hover:from-[#c73128] hover:to-[#e55a2b] text-white text-xl font-bold rounded-full shadow-2xl transform hover:scale-105 transition-all duration-300 border-2 border-white/20">
                <span className="mr-3">🍕</span>
                View Full Menu
                <span className="ml-3">✨</span>
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-gray-600 text-sm">
            Discover all our authentic Italian specialties
          </p>
        </div>
      </div>
    </section>
  );
};

export default FeaturedSection;
