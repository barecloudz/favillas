import { useState, useEffect } from "react";
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
            id="street-address"
            type="text"
            placeholder="123 Main Street"
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

      {/* Display full address for reference */}
      {value && (
        <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600">
          <strong>Full Address:</strong> {value}
        </div>
      )}
    </div>
  );
};

export default AddressForm;
