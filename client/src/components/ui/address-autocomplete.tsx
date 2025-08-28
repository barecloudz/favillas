import { useState } from "react";
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

  const handleAddressChange = (field: string, value: string) => {
    switch (field) {
      case 'street':
        setStreet(value);
        break;
      case 'city':
        setCity(value);
        break;
      case 'state':
        setState(value);
        break;
      case 'zipCode':
        setZipCode(value);
        break;
    }

    // Build full address
    const fullAddress = [street, city, state, zipCode]
      .filter(part => part.trim())
      .join(', ');

    onChange(fullAddress);

    // If we have all required fields, call onAddressSelect
    if (street && city && state && zipCode && onAddressSelect) {
      onAddressSelect({
        fullAddress,
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        zipCode: zipCode.trim()
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
