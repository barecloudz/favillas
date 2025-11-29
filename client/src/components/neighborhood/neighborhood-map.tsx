import React from "react";
import { MapPin } from "lucide-react";

interface NeighborhoodMapProps {
  neighborhoodName: string;
}

const NeighborhoodMap: React.FC<NeighborhoodMapProps> = ({ neighborhoodName }) => {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold mb-4 text-[#d73a31] flex items-center justify-center gap-3">
              <MapPin className="w-8 h-8" />
              Find Us - We're Close to {neighborhoodName}!
            </h2>
            <p className="text-xl text-gray-700">
              5 Regent Park Blvd, Asheville, NC 28806 (Next to Sam's Club)
            </p>
          </div>

          <div className="bg-white rounded-xl overflow-hidden shadow-2xl border-4 border-gray-200">
            <div className="h-[450px]">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3270.0486378442976!2d-82.5967883!3d35.5793183!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8859f4832a2e7b35%3A0x9b0b6f7d47e62a9c!2s5%20Regent%20Park%20Blvd%2C%20Asheville%2C%20NC%2028806!5e0!3m2!1sen!2sus!4v1635555555555!5m2!1sen!2sus"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                title="Favilla's Pizza Asheville Location"
              ></iframe>
            </div>
          </div>

          <div className="mt-8 text-center">
            <a
              href="https://share.google/8zWZ62d06mHJ4GZ1o"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-[#d73a31] hover:bg-[#c73128] text-white px-8 py-4 text-lg rounded-full font-bold shadow-lg transition-colors"
            >
              <MapPin className="inline-block w-5 h-5 mr-2 -mt-1" />
              Get Directions
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NeighborhoodMap;
