import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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

const AddressForm = ({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Enter your address",
  label = "Address",
  required = false,
  className,
  error
}: AddressFormProps) => {
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [autocompleteInstance, setAutocompleteInstance] = useState<any>(null);
  const streetInputRef = useRef<HTMLInputElement>(null);

  // Parse incoming address value and populate individual fields - only on initial load
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    // Only parse the incoming value if we haven't initialized yet, or if it's a significant change
    if (value && value.trim() && !hasInitialized) {
      console.log('🏠 AddressForm: Initial parsing of incoming address:', value);

      // Simple address parsing - assumes format: "street, city, state, zipcode"
      const parts = value.split(',').map(part => part.trim());

      if (parts.length >= 4) {
        // Full format: "123 Main St, New York, NY, 12345"
        setStreet(parts[0] || '');
        setCity(parts[1] || '');
        setState(parts[2] || '');
        setZipCode(parts[3] || '');
        console.log('✅ AddressForm: Parsed 4-part address:', {
          street: parts[0],
          city: parts[1],
          state: parts[2],
          zipCode: parts[3]
        });
      } else if (parts.length === 3) {
        // Format: "New York, NY, 12345" (city, state, zip)
        setStreet('');
        setCity(parts[0] || '');
        setState(parts[1] || '');
        setZipCode(parts[2] || '');
        console.log('✅ AddressForm: Parsed 3-part address (no street):', {
          city: parts[0],
          state: parts[1],
          zipCode: parts[2]
        });
      } else {
        // Fallback: put entire value in street field
        setStreet(value);
        setCity('');
        setState('');
        setZipCode('');
        console.log('⚠️ AddressForm: Using fallback - putting full address in street field');
      }
      setHasInitialized(true);
    } else if (!value || !value.trim()) {
      // Clear fields if no value and reset initialization flag
      setStreet('');
      setCity('');
      setState('');
      setZipCode('');
      setHasInitialized(false);
    }
  }, [value, hasInitialized]);

  // Initialize Google Places Autocomplete Element
  useEffect(() => {
    const initializeAutocomplete = () => {
      if (!streetInputRef.current || !window.google?.maps?.places?.PlaceAutocompleteElement) {
        console.log('Google Maps API not loaded yet');
        return;
      }

      try {
        const autocompleteElement = new window.google.maps.places.PlaceAutocompleteElement({
          componentRestrictions: { country: 'us' },
          requestedLanguage: 'en',
          requestedRegion: 'us'
        });

        autocompleteElement.id = 'places-autocomplete';

        // Style the autocomplete element to match our input
        autocompleteElement.style.width = '100%';
        autocompleteElement.style.height = '40px';
        autocompleteElement.style.border = '1px solid #d1d5db';
        autocompleteElement.style.borderRadius = '6px';
        autocompleteElement.style.padding = '8px 12px';
        autocompleteElement.style.fontSize = '14px';
        autocompleteElement.style.outline = 'none';
        autocompleteElement.placeholder = 'Start typing your address...';

        // Replace the input with the autocomplete element
        if (streetInputRef.current?.parentNode) {
          streetInputRef.current.parentNode.insertBefore(autocompleteElement, streetInputRef.current);
          streetInputRef.current.style.display = 'none';
        }

        autocompleteElement.addEventListener('gmp-placeselect', (event: any) => {
          const place = event.place;

          if (!place.addressComponents) {
            console.warn('No address components found');
            return;
          }

          // Parse Google Places response
          let streetNumber = '';
          let route = '';
          let locality = '';
          let administrativeAreaLevel1 = '';
          let postalCode = '';
          let coordinates = null;

          place.addressComponents.forEach((component: any) => {
            const componentType = component.types[0];

            switch (componentType) {
              case 'street_number':
                streetNumber = component.longText;
                break;
              case 'route':
                route = component.longText;
                break;
              case 'locality':
                locality = component.longText;
                break;
              case 'administrative_area_level_1':
                administrativeAreaLevel1 = component.shortText;
                break;
              case 'postal_code':
                postalCode = component.longText;
                break;
            }
          });

          // Get coordinates if available
          if (place.location) {
            coordinates = {
              lat: place.location.lat(),
              lng: place.location.lng()
            };
          }

          // Combine street number and route
          const fullStreet = [streetNumber, route].filter(Boolean).join(' ');

          // Update state
          setStreet(fullStreet);
          setCity(locality);
          setState(administrativeAreaLevel1);
          setZipCode(postalCode);

          // Build full address
          const fullAddress = [fullStreet, locality, administrativeAreaLevel1, postalCode]
            .filter(Boolean)
            .join(', ');

          onChange(fullAddress);

          // Call onAddressSelect with coordinates
          if (onAddressSelect && fullStreet && locality && administrativeAreaLevel1 && postalCode) {
            onAddressSelect({
              fullAddress,
              street: fullStreet,
              city: locality,
              state: administrativeAreaLevel1,
              zipCode: postalCode,
              latitude: coordinates?.lat,
              longitude: coordinates?.lng
            });
          }

          console.log('✅ Google Places address selected:', {
            street: fullStreet,
            city: locality,
            state: administrativeAreaLevel1,
            zipCode: postalCode,
            coordinates
          });
        });

        setAutocompleteInstance(autocompleteElement);
        console.log('✅ Google Places PlaceAutocompleteElement initialized');
      } catch (error) {
        console.error('Failed to initialize Google Places PlaceAutocompleteElement:', error);
        // Fallback to regular input if new API fails
        if (streetInputRef.current) {
          streetInputRef.current.style.display = 'block';
        }
      }
    };

    // Check if Google Maps is already loaded
    if (window.google?.maps?.places?.PlaceAutocompleteElement) {
      initializeAutocomplete();
    } else {
      // Wait for Google Maps to load
      const checkGoogle = setInterval(() => {
        if (window.google?.maps?.places?.PlaceAutocompleteElement) {
          clearInterval(checkGoogle);
          initializeAutocomplete();
        }
      }, 100);

      // Clean up interval after 10 seconds
      setTimeout(() => clearInterval(checkGoogle), 10000);
    }

    // Cleanup
    return () => {
      if (autocompleteInstance && autocompleteInstance.remove) {
        autocompleteInstance.remove();
      }
    };
  }, []); // Run only once on mount

  // Load Google Maps API script
  useEffect(() => {
    const loadGoogleMapsScript = () => {
      // Check if script is already loaded
      if (window.google?.maps?.places) {
        return;
      }

      const existingScript = document.querySelector('#google-maps-script');
      if (existingScript) {
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        console.log('✅ Google Maps API loaded');
      };

      script.onerror = () => {
        console.error('❌ Failed to load Google Maps API');
      };

      document.head.appendChild(script);
    };

    loadGoogleMapsScript();
  }, []);

  const handleAddressChange = (field: string, newValue: string) => {
    let updatedStreet = street;
    let updatedCity = city;
    let updatedState = state;
    let updatedZipCode = zipCode;

    switch (field) {
      case 'street':
        setStreet(newValue);
        updatedStreet = newValue;
        break;
      case 'city':
        setCity(newValue);
        updatedCity = newValue;
        break;
      case 'state':
        setState(newValue);
        updatedState = newValue;
        break;
      case 'zipCode':
        setZipCode(newValue);
        updatedZipCode = newValue;
        break;
    }

    // Build full address using updated values
    const fullAddress = [updatedStreet, updatedCity, updatedState, updatedZipCode]
      .filter(part => part.trim())
      .join(', ');

    onChange(fullAddress);

    // If we have all required fields, call onAddressSelect
    if (updatedStreet && updatedCity && updatedState && updatedZipCode && onAddressSelect) {
      onAddressSelect({
        fullAddress,
        street: updatedStreet.trim(),
        city: updatedCity.trim(),
        state: updatedState.trim(),
        zipCode: updatedZipCode.trim()
      });
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {label && (
        <Label className="block">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Street Address */}
        <div className="md:col-span-2">
          <Label htmlFor="street-address" className="text-sm font-medium">
            Street Address *
          </Label>
          <Input
            ref={streetInputRef}
            id="street-address"
            type="text"
            placeholder="Start typing your address..."
            value={street}
            onChange={(e) => handleAddressChange('street', e.target.value)}
            className={cn(
              "mt-1",
              error && "border-red-500 focus:border-red-500"
            )}
            required={required}
          />
        </div>

        {/* City */}
        <div>
          <Label htmlFor="city" className="text-sm font-medium">
            City *
          </Label>
          <Input
            id="city"
            type="text"
            placeholder="New York"
            value={city}
            onChange={(e) => handleAddressChange('city', e.target.value)}
            className={cn(
              "mt-1",
              error && "border-red-500 focus:border-red-500"
            )}
            required={required}
          />
        </div>

        {/* State */}
        <div>
          <Label htmlFor="state" className="text-sm font-medium">
            State *
          </Label>
          <Input
            id="state"
            type="text"
            placeholder="NY"
            value={state}
            onChange={(e) => handleAddressChange('state', e.target.value)}
            className={cn(
              "mt-1",
              error && "border-red-500 focus:border-red-500"
            )}
            required={required}
          />
        </div>

        {/* ZIP Code */}
        <div>
          <Label htmlFor="zip-code" className="text-sm font-medium">
            ZIP Code *
          </Label>
          <Input
            id="zip-code"
            type="text"
            placeholder="10001"
            value={zipCode}
            onChange={(e) => handleAddressChange('zipCode', e.target.value)}
            className={cn(
              "mt-1",
              error && "border-red-500 focus:border-red-500"
            )}
            required={required}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default AddressForm;
