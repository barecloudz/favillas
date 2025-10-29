import { Link } from "wouter";
import { Facebook, Instagram, Phone, MapPin, Mail, Clock } from "lucide-react";
import { useBranding } from "@/hooks/use-branding";
import { useRestaurantSettings } from "@/hooks/use-restaurant-settings";

const Footer = () => {
  const { companyName, companyTagline, logoUrl } = useBranding();
  const { address, phone, email } = useRestaurantSettings();
  
  return (
    <footer className="bg-[#222] text-white pt-16 pb-8">
      <div className="container mx-auto px-4">
        {/* Our Story Section */}
        <div id="story" className="mb-16 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-[#f2c94c] mb-8">OUR STORY</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="text-left">
                <p className="text-lg text-gray-300 mb-6 leading-relaxed">
                  Welcome to Favilla's, where authentic Italian tradition meets the heart of Asheville.
                  As a real Italian family, we've poured our heritage into every pizza we craft—using time-honored recipes,
                  fresh ingredients, and a whole lot of amore.
                </p>
                <p className="text-lg text-gray-300 mb-6 leading-relaxed">
                  Our community agrees: it's the best pizza in town. Come taste the difference at Favilla's—where every slice feels like home.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <p className="text-lg font-bold text-[#d73a31]">
                    Family-owned since 1969
                  </p>
                  <div className="hidden sm:block w-0.5 bg-gray-600 mx-2"></div>
                  <p className="text-lg font-bold text-[#d73a31]">
                    Authentic NY Style
                  </p>
                </div>
              </div>
              <div>
                <img
                  src="/images/lineup.jpg"
                  alt="Favilla's Pizza Team"
                  className="rounded-xl shadow-xl w-full h-64 object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Column 1 - About */}
          <div className="text-center md:text-left">
            <div className="mb-6 flex justify-center md:justify-start">
              <img src={logoUrl} alt={companyName} className="w-[150px]" />
            </div>
            <p className="mb-6 text-gray-300">
              {companyTagline}
            </p>
            <div className="flex space-x-4 justify-center md:justify-start">
              <a 
                href="https://www.facebook.com/favillaspizzeria/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-[#d73a31] hover:bg-[#f2c94c] text-white p-2 rounded-full transition-colors" 
                aria-label="Facebook"
              >
                <Facebook size={20} />
              </a>
              <a 
                href="https://www.instagram.com/favillaspizzeria/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-[#d73a31] hover:bg-[#f2c94c] text-white p-2 rounded-full transition-colors" 
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
            </div>
          </div>
          
          {/* Column 2 - Quick Links */}
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold mb-6 text-[#f2c94c]">QUICK LINKS</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/">
                  <div className="text-gray-300 hover:text-white hover:underline transition-colors cursor-pointer">Home</div>
                </Link>
              </li>
              <li>
                <Link href="/menu">
                  <div className="text-gray-300 hover:text-white hover:underline transition-colors cursor-pointer">Menu</div>
                </Link>
              </li>
              <li>
                <a href="#story" className="text-gray-300 hover:text-white hover:underline transition-colors cursor-pointer">
                  About Us
                </a>
              </li>
              <li>
                <Link href="/#locations">
                  <div className="text-gray-300 hover:text-white hover:underline transition-colors cursor-pointer">Location</div>
                </Link>
              </li>
              <li>
                <Link href="/auth">
                  <div className="text-gray-300 hover:text-white hover:underline transition-colors cursor-pointer">Login / Register</div>
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Column 3 - Contact */}
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold mb-6 text-[#f2c94c]">CONTACT US</h3>
            <ul className="space-y-4">
              <li className="flex items-start justify-center md:justify-start">
                <MapPin className="mt-1 mr-3 h-5 w-5 text-[#d73a31] flex-shrink-0" />
                <span className="text-gray-300">{address}</span>
              </li>
              <li className="flex items-start justify-center md:justify-start">
                <Phone className="mt-1 mr-3 h-5 w-5 text-[#d73a31] flex-shrink-0" />
                <a
                  href={`tel:${phone.replace(/[^\d]/g, '')}`}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  {phone}
                </a>
              </li>
              <li className="flex items-start justify-center md:justify-start">
                <Mail className="mt-1 mr-3 h-5 w-5 text-[#d73a31] flex-shrink-0" />
                <a
                  href={`mailto:${email}`}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  {email}
                </a>
              </li>
            </ul>
          </div>
          
          {/* Column 4 - Hours */}
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold mb-6 text-[#f2c94c]">OPEN HOURS</h3>
            <ul className="space-y-4">
              <li className="text-gray-300">
                <span className="flex items-center mb-1 justify-center md:justify-start">
                  <Clock className="mr-2 h-5 w-5 text-[#d73a31] flex-shrink-0" />
                  <span className="font-semibold">Monday</span>
                </span>
                <span className="block pl-0 md:pl-7 text-red-400 font-semibold">CLOSED</span>
              </li>
              <li className="text-gray-300">
                <span className="flex items-center mb-1 justify-center md:justify-start">
                  <Clock className="mr-2 h-5 w-5 text-[#d73a31] flex-shrink-0" />
                  <span className="font-semibold">Tuesday - Thursday</span>
                </span>
                <span className="block pl-0 md:pl-7">11:00 AM - 8:00 PM</span>
              </li>
              <li className="text-gray-300">
                <span className="flex items-center mb-1 justify-center md:justify-start">
                  <Clock className="mr-2 h-5 w-5 text-[#d73a31] flex-shrink-0" />
                  <span className="font-semibold">Friday - Saturday</span>
                </span>
                <span className="block pl-0 md:pl-7">11:00 AM - 9:00 PM</span>
              </li>
              <li className="text-gray-300">
                <span className="flex items-center mb-1 justify-center md:justify-start">
                  <Clock className="mr-2 h-5 w-5 text-[#d73a31] flex-shrink-0" />
                  <span className="font-semibold">Sunday</span>
                </span>
                <span className="block pl-0 md:pl-7">12:00 PM - 8:00 PM</span>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Copyright */}
        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center text-center md:text-left">
          <p className="text-gray-400">&copy; {new Date().getFullYear()} {companyName}. All rights reserved.</p>
          <div className="mt-4 md:mt-0 space-x-6">
            <Link href="/privacy">
              <div className="text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">Privacy Policy</div>
            </Link>
            <Link href="/terms">
              <div className="text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">Terms & Conditions</div>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
