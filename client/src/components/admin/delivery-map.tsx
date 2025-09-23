import React, { useEffect, useRef, useState } from 'react';

interface DeliveryZone {
  id: number;
  name: string;
  maxRadius: number;
  deliveryFee: number;
  isActive: boolean;
  color: string;
}

interface DeliveryMapProps {
  zones: DeliveryZone[];
  restaurantAddress: string;
  onZoneUpdate: (zoneId: number, updates: Partial<DeliveryZone>) => void;
}

export function DeliveryMap({ zones, restaurantAddress, onZoneUpdate }: DeliveryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [restaurantLocation, setRestaurantLocation] = useState<google.maps.LatLng | null>(null);
  const [circles, setCircles] = useState<google.maps.Circle[]>([]);
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);

  // Zone colors
  const zoneColors = ['#22c55e', '#3b82f6', '#ef4444']; // Green, Blue, Red

  // Load Google Maps with proper callback approach
  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        initializeMap();
        return;
      }

      // Create a unique callback name to avoid conflicts
      const callbackName = 'initGoogleMaps_' + Date.now();
      window[callbackName] = () => {
        initializeMap();
        delete window[callbackName]; // Clean up
      };

      // Use callback parameter for reliable loading
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=geometry,marker&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        console.error('Failed to load Google Maps API');
        delete window[callbackName];
      };
      document.head.appendChild(script);
    };

    const initializeMap = () => {
      if (!mapRef.current) return;

      // Ensure Google Maps API is fully loaded
      if (!window.google || !window.google.maps || !window.google.maps.Map) {
        console.error('Google Maps API not properly loaded');
        return;
      }

      // Default to Asheville, NC
      const defaultCenter = { lat: 35.5951, lng: -82.5515 };

      try {
        const newMap = new google.maps.Map(mapRef.current, {
          zoom: 12,
          center: defaultCenter,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        setMap(newMap);

      // Geocode restaurant address
      if (restaurantAddress) {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: restaurantAddress }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const location = results[0].geometry.location;
            setRestaurantLocation(location);
            newMap.setCenter(location);

            // Add restaurant marker using modern AdvancedMarkerElement (with fallback)
            try {
              // Try to use AdvancedMarkerElement (new approach)
              if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
                const restaurantMarker = new google.maps.marker.AdvancedMarkerElement({
                  position: location,
                  map: newMap,
                  title: 'Restaurant Location',
                });
              } else {
                // Fallback to regular Marker for older browsers
                new google.maps.Marker({
                  position: location,
                  map: newMap,
                  title: 'Restaurant Location',
                  icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="16" cy="16" r="12" fill="#dc2626" stroke="white" stroke-width="2"/>
                        <text x="16" y="20" font-family="Arial" font-size="14" font-weight="bold" fill="white" text-anchor="middle">🏪</text>
                      </svg>
                    `),
                    scaledSize: new google.maps.Size(32, 32),
                    anchor: new google.maps.Point(16, 16)
                  }
                });
              }
            } catch (error) {
              console.warn('Failed to create AdvancedMarkerElement, using fallback:', error);
              // Fallback to regular Marker
              new google.maps.Marker({
                position: location,
                map: newMap,
                title: 'Restaurant Location',
                icon: {
                  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="16" cy="16" r="12" fill="#dc2626" stroke="white" stroke-width="2"/>
                      <text x="16" y="20" font-family="Arial" font-size="14" font-weight="bold" fill="white" text-anchor="middle">🏪</text>
                    </svg>
                  `),
                  scaledSize: new google.maps.Size(32, 32),
                  anchor: new google.maps.Point(16, 16)
                }
              });
            }
          }
        });
      }
      } catch (error) {
        console.error('Error initializing Google Maps:', error);
      }
    };

    loadGoogleMaps();
  }, [restaurantAddress]);

  // Update circles when zones change
  useEffect(() => {
    if (!map || !restaurantLocation) return;

    // Clear existing circles
    circles.forEach(circle => circle.setMap(null));

    // Create new circles
    const newCircles = zones.map((zone, index) => {
      const circle = new google.maps.Circle({
        strokeColor: zoneColors[index % zoneColors.length],
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: zoneColors[index % zoneColors.length],
        fillOpacity: 0.15,
        map: map,
        center: restaurantLocation,
        radius: zone.maxRadius * 1609.34, // Convert miles to meters
        clickable: true
      });

      // Add click listener
      circle.addListener('click', () => {
        setSelectedZone(zone);
      });

      return circle;
    });

    setCircles(newCircles);
  }, [map, restaurantLocation, zones]);

  // Handle zone editing
  const handleZoneEdit = (field: keyof DeliveryZone, value: any) => {
    if (!selectedZone) return;

    onZoneUpdate(selectedZone.id, { [field]: value });
    setSelectedZone({ ...selectedZone, [field]: value });
  };

  return (
    <div className="w-full">
      {/* Map Container */}
      <div className="relative">
        <div
          ref={mapRef}
          className="w-full h-96 rounded-lg border border-gray-300"
          style={{ minHeight: '400px' }}
        />

        {/* Zone Legend */}
        <div className="absolute top-4 left-4 bg-white p-3 rounded-lg shadow-md">
          <h4 className="font-semibold text-sm mb-2">Delivery Zones</h4>
          {zones.map((zone, index) => (
            <div key={zone.id} className="flex items-center space-x-2 mb-1">
              <div
                className="w-4 h-4 rounded border"
                style={{ backgroundColor: zoneColors[index % zoneColors.length] }}
              />
              <span className="text-xs">{zone.name}: ${zone.deliveryFee}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Zone Editor Panel */}
      {selectedZone && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-blue-800">
              Editing: {selectedZone.name}
            </h3>
            <button
              onClick={() => setSelectedZone(null)}
              className="text-blue-600 hover:text-blue-800"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zone Name
              </label>
              <input
                type="text"
                value={selectedZone.name}
                onChange={(e) => handleZoneEdit('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Radius (miles)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="50"
                value={selectedZone.maxRadius}
                onChange={(e) => handleZoneEdit('maxRadius', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Fee ($)
              </label>
              <input
                type="number"
                step="0.25"
                min="0"
                value={selectedZone.deliveryFee}
                onChange={(e) => handleZoneEdit('deliveryFee', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-between items-center">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={selectedZone.isActive}
                onChange={(e) => handleZoneEdit('isActive', e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Zone Active
              </label>
            </div>

            <div className="text-sm text-gray-600">
              Coverage: {(Math.PI * Math.pow(selectedZone.maxRadius, 2)).toFixed(1)} sq miles
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          <strong>Instructions:</strong> Click on any colored zone on the map to edit its distance and pricing.
          The restaurant location is marked with a red circle. Zones are displayed as colored circles with:
        </p>
        <ul className="text-xs text-gray-500 mt-2 ml-4">
          <li>• <span className="text-green-600">Green</span> - Close Range Zone</li>
          <li>• <span className="text-blue-600">Blue</span> - Medium Range Zone</li>
          <li>• <span className="text-red-600">Red</span> - Far Range Zone</li>
        </ul>
      </div>
    </div>
  );
}

// Fallback component when Google Maps is not available
export function DeliveryMapFallback({ zones, onZoneUpdate }: Omit<DeliveryMapProps, 'restaurantAddress'>) {
  return (
    <div className="w-full h-96 bg-gray-100 rounded-lg border border-gray-300 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">🗺️</div>
        <p className="text-gray-600 mb-4">Interactive map will appear here when Google Maps is configured</p>

        {/* Simple zone list for editing */}
        <div className="bg-white p-4 rounded-lg shadow-sm max-w-md mx-auto">
          <h3 className="font-semibold mb-3">Delivery Zones</h3>
          {zones.map((zone, index) => (
            <div key={zone.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: ['#22c55e', '#3b82f6', '#ef4444'][index % 3] }}
                />
                <span className="text-sm font-medium">{zone.name}</span>
              </div>
              <div className="text-sm text-gray-600">
                {zone.maxRadius} mi - ${zone.deliveryFee}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}