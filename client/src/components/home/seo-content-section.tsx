import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const SeoContentSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        {/* Collapsible About Us Section */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              variant="outline"
              className="text-lg font-semibold text-[#d73a31] border-[#d73a31] hover:bg-[#d73a31] hover:text-white transition-colors"
            >
              {isExpanded ? (
                <>
                  Hide About Us <ChevronUp className="ml-2 h-5 w-5" />
                </>
              ) : (
                <>
                  About Favilla's Pizza <ChevronDown className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>

          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isExpanded ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-center mb-8 text-[#d73a31]">
              Best Pizza in Asheville, NC - Authentic Italian Cuisine
            </h1>

          <div className="prose prose-lg max-w-none">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">Voted Best Pizza in Asheville</h2>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              Welcome to <strong>Favilla's NY Pizza</strong>, Asheville's premier destination for <strong>authentic Italian pizza</strong> and cuisine.
              As a family-owned restaurant since 1969, we've been serving the <strong>best pizza in Asheville</strong> for over 50 years.
              Our commitment to traditional recipes and fresh, quality ingredients has made us a beloved staple in the Asheville community.
            </p>

            <h2 className="text-3xl font-bold mb-4 text-gray-900">Authentic NY Style Pizza in Asheville</h2>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              Looking for <strong>pizza near me in Asheville</strong>? Look no further! Our <strong>New York style pizza</strong> features
              a perfectly thin, crispy crust that folds just right, topped with our signature sauce made from fresh Italian tomatoes
              and premium mozzarella cheese. Every pie is hand-tossed and baked to perfection in our traditional pizza ovens.
              We also serve delicious <strong>Sicilian pizza</strong> with a thick, fluffy crust that's become a local favorite.
            </p>

            <h2 className="text-3xl font-bold mb-4 text-gray-900">Calzones, Stromboli & Italian Specialties</h2>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              Beyond our award-winning pizza, Favilla's offers an extensive menu of <strong>Italian food in Asheville</strong>.
              Our <strong>calzones in Asheville</strong> are hand-folded masterpieces, stuffed with ricotta, mozzarella, and your choice of
              premium toppings. Try our <strong>stromboli in Asheville</strong> - rolled with savory meats, cheeses, and vegetables,
              then baked until golden brown.
            </p>

            <h3 className="text-2xl font-bold mb-3 text-gray-900">Our Menu Features:</h3>
            <ul className="list-disc list-inside mb-6 text-gray-700 space-y-2">
              <li><strong>NY Style Pizza</strong> - Thin crust, hand-tossed perfection</li>
              <li><strong>Sicilian Square Pizza</strong> - Thick, fluffy crust with robust flavors</li>
              <li><strong>Gourmet Calzones</strong> - Stuffed with premium ingredients</li>
              <li><strong>Italian Stromboli</strong> - Rolled and baked to golden perfection</li>
              <li><strong>Fresh Salads</strong> - Crisp greens with house-made dressings</li>
              <li><strong>Appetizers</strong> - Garlic knots, mozzarella sticks, and more</li>
              <li><strong>Desserts</strong> - Sweet treats to complete your meal</li>
            </ul>

            <h2 className="text-3xl font-bold mb-4 text-gray-900">Pizza Delivery & Pickup in Asheville</h2>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              Craving <strong>pizza delivery in Asheville</strong>? Order online for fast, reliable delivery right to your door.
              We serve all of Asheville and surrounding areas with hot, fresh pizza delivered quickly. Prefer pickup?
              Order ahead online and we'll have your food ready when you arrive. Our online ordering system makes it
              easy to customize your pizza, add sides, and earn rewards points with every order.
            </p>

            <h2 className="text-3xl font-bold mb-4 text-gray-900">Family-Owned Italian Restaurant Since 1969</h2>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              As a <strong>family-owned pizza restaurant in Asheville</strong>, we take pride in treating every customer like family.
              Our recipes have been perfected over generations, bringing true <strong>authentic Italian cuisine</strong> to North Carolina.
              When you dine with us, you're not just getting great food - you're experiencing the warmth and tradition of
              Italian hospitality that has made Favilla's a cornerstone of the Asheville dining scene.
            </p>

            <h2 className="text-3xl font-bold mb-4 text-gray-900">Why Favilla's is the Best Pizza in Asheville</h2>
            <ul className="list-disc list-inside mb-6 text-gray-700 space-y-2">
              <li>Family recipes passed down since 1969</li>
              <li>Fresh, high-quality ingredients sourced daily</li>
              <li>Hand-tossed dough made fresh every day</li>
              <li>Traditional Italian cooking methods</li>
              <li>Voted Best Pizza by the Asheville community</li>
              <li>Fast delivery throughout Asheville, NC</li>
              <li>Catering available for events and parties</li>
              <li>Rewards program for loyal customers</li>
            </ul>

            <h2 className="text-3xl font-bold mb-4 text-gray-900">Order the Best Pizza in Asheville Today</h2>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              Ready to taste why we're known as the <strong>best pizza place in Asheville</strong>? Order online now for
              delivery or pickup. Whether you're craving a classic cheese pizza, loaded specialty pie, hearty calzone,
              or delicious stromboli, Favilla's has something for everyone. Join our rewards program and earn points
              with every order. Experience the authentic taste of Italy right here in Asheville, NC!
            </p>
          </div>

          {/* Location & Service Area Keywords */}
          <div className="mt-12 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-xl font-bold mb-3 text-gray-900">Serving Asheville & Surrounding Areas</h3>
            <p className="text-gray-700">
              <strong>Asheville Pizza Delivery Areas:</strong> Downtown Asheville, West Asheville, North Asheville,
              South Asheville, East Asheville, Biltmore Village, Kenilworth, and surrounding neighborhoods in Asheville, NC.
            </p>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SeoContentSection;
