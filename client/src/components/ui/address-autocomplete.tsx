import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { MapPin, Loader2 } from "lucide-react";

interface AddressFormProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect?: (address: {
    fullAddress: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    latitude?: number;
    longitude?: number;
  }) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
  error?: string;
}

// Extend Window interface for Google Maps callback
declare global {
  interface Window {
    initGooglePlaces?: () => void;
    google?: typeof google;
  }
}

const AddressForm = ({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Start typing your address...",
  label = "Address",
  required = false,
  className,
  error
}: AddressFormProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");

  // Load Google Maps Places API
  useEffect(() => {
    const loadGooglePlaces = () => {
      // Check if already loaded
      if (window.google && window.google.maps && window.google.maps.places) {
        setIsGoogleLoaded(true);
        setIsLoading(false);
        return;
      }

      // Check if script is already being loaded
      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        // Wait for it to load
        const checkLoaded = setInterval(() => {
          if (window.google && window.google.maps && window.google.maps.places) {
            setIsGoogleLoaded(true);
            setIsLoading(false);
            clearInterval(checkLoaded);
          }
        }, 100);
        return;
      }

      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.error('Google Maps API key not found');
        setIsLoading(false);
        return;
      }

      // Create callback
      const callbackName = 'initGooglePlaces_' + Date.now();
      (window as any)[callbackName] = () => {
        setIsGoogleLoaded(true);
        setIsLoading(false);
        delete (window as any)[callbackName];
      };

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        console.error('Failed to load Google Maps API');
        setIsLoading(false);
        delete (window as any)[callbackName];
      };
      document.head.appendChild(script);
    };

    loadGooglePlaces();
  }, []);

  // Initialize autocomplete when Google is loaded and input is ready
  useEffect(() => {
    if (!isGoogleLoaded || !inputRef.current || autocompleteRef.current) return;

    try {
      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'us' },
        types: ['address'],
        fields: ['address_components', 'formatted_address', 'geometry']
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();

        if (!place.address_components) {
          console.warn('No address components returned');
          return;
        }

        // Parse address components
        let street = '';
        let city = '';
        let state = '';
        let zipCode = '';
        let streetNumber = '';
        let route = '';

        place.address_components.forEach((component) => {
          const types = component.types;

          if (types.includes('street_number')) {
            streetNumber = component.long_name;
          }
          if (types.includes('route')) {
            route = component.long_name;
          }
          if (types.includes('locality')) {
            city = component.long_name;
          }
          if (types.includes('administrative_area_level_1')) {
            state = component.short_name;
          }
          if (types.includes('postal_code')) {
            zipCode = component.long_name;
          }
        });

        street = streetNumber ? `${streetNumber} ${route}` : route;
        const fullAddress = place.formatted_address || `${street}, ${city}, ${state} ${zipCode}`;

        // Update input value
        setInputValue(fullAddress);
        onChange(fullAddress);

        // Call onAddressSelect with parsed address
        if (onAddressSelect) {
          onAddressSelect({
            fullAddress,
            street,
            city,
            state,
            zipCode,
            latitude: place.geometry?.location?.lat(),
            longitude: place.geometry?.location?.lng()
          });
        }
      });

      autocompleteRef.current = autocomplete;
    } catch (err) {
      console.error('Error initializing Google Places Autocomplete:', err);
    }
  }, [isGoogleLoaded, onChange, onAddressSelect]);

  // Sync external value changes
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value || "");
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  // Handle manual entry - parse and call onAddressSelect when user stops typing
  const handleBlur = useCallback(() => {
    if (!inputValue || !onAddressSelect) return;

    // Only trigger if there's no autocomplete selection (no lat/lng in current selection)
    // This handles manual entry fallback
    const parts = inputValue.split(',').map(p => p.trim());
    if (parts.length >= 3) {
      onAddressSelect({
        fullAddress: inputValue,
        street: parts[0] || '',
        city: parts[1] || '',
        state: parts[2]?.split(' ')[0] || '',
        zipCode: parts[2]?.split(' ')[1] || parts[3] || ''
      });
    }
  }, [inputValue, onAddressSelect]);

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="block">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}

      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={isLoading ? "Loading address search..." : placeholder}
          disabled={isLoading}
          className={cn(
            "pl-10 pr-10",
            error && "border-red-500 focus:border-red-500"
          )}
          required={required}
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        )}
      </div>

      {!isLoading && isGoogleLoaded && (
        <p className="text-xs text-gray-500">
          Start typing and select your address from the suggestions
        </p>
      )}

      {!isLoading && !isGoogleLoaded && (
        <p className="text-xs text-yellow-600">
          Address suggestions unavailable. Please enter your full address manually.
        </p>
      )}

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default AddressForm;
