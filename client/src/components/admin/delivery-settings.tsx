import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { DeliveryMap, DeliveryMapFallback } from './delivery-map';

interface DeliveryZone {
  id: number;
  name: string;
  maxRadius: string;
  deliveryFee: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

interface DeliverySettings {
  id?: number;
  restaurantAddress: string;
  restaurantLat?: number;
  restaurantLng?: number;
  googleMapsApiKey?: string;
  maxDeliveryRadius: string;
  distanceUnit: string;
  isGoogleMapsEnabled: boolean;
  fallbackDeliveryFee: string;
  createdAt?: string;
  updatedAt?: string;
}

interface DeliveryData {
  zones: DeliveryZone[];
  settings: DeliverySettings;
}

export function DeliverySettings() {
  const queryClient = useQueryClient();
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [showAddZone, setShowAddZone] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [migrationError, setMigrationError] = useState<string>('');

  // Fetch delivery zones and settings
  const { data: deliveryData, isLoading, error } = useQuery<DeliveryData>({
    queryKey: ['/api/admin/delivery-zones'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/delivery-zones');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    },
    retry: false // Don't retry on failure to see the actual error
  });

  // Create delivery zone mutation
  const createZoneMutation = useMutation({
    mutationFn: async (zoneData: Omit<DeliveryZone, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await apiRequest('POST', '/api/admin/delivery-zones', zoneData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/delivery-zones'] });
      setShowAddZone(false);
    }
  });

  // Update delivery zone mutation
  const updateZoneMutation = useMutation({
    mutationFn: async (zoneData: DeliveryZone) => {
      const response = await apiRequest('PUT', '/api/admin/delivery-zones', zoneData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/delivery-zones'] });
      setEditingZone(null);
    }
  });

  // Delete delivery zone mutation
  const deleteZoneMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', '/api/admin/delivery-zones?id=' + id);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/delivery-zones'] });
    }
  });

  // Update delivery settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settingsData: DeliverySettings) => {
      const response = await apiRequest('PUT', '/api/admin/delivery-zones', {
        type: 'settings',
        ...settingsData
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/delivery-zones'] });
      setShowSettings(false);
    }
  });

  const handleCreateZone = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const zoneData = {
      name: formData.get('name') as string,
      maxRadius: formData.get('maxRadius') as string,
      deliveryFee: formData.get('deliveryFee') as string,
      isActive: formData.get('isActive') === 'on',
      sortOrder: parseInt(formData.get('sortOrder') as string) || 0
    };

    createZoneMutation.mutate(zoneData);
  };

  const handleUpdateZone = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingZone) return;

    const formData = new FormData(event.currentTarget);

    const zoneData = {
      ...editingZone,
      name: formData.get('name') as string,
      maxRadius: formData.get('maxRadius') as string,
      deliveryFee: formData.get('deliveryFee') as string,
      isActive: formData.get('isActive') === 'on',
      sortOrder: parseInt(formData.get('sortOrder') as string) || 0
    };

    updateZoneMutation.mutate(zoneData);
  };

  const handleUpdateSettings = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const settingsData = {
      ...deliveryData?.settings,
      restaurantAddress: formData.get('restaurantAddress') as string,
      googleMapsApiKey: formData.get('googleMapsApiKey') as string,
      maxDeliveryRadius: formData.get('maxDeliveryRadius') as string,
      distanceUnit: formData.get('distanceUnit') as string,
      isGoogleMapsEnabled: formData.get('isGoogleMapsEnabled') === 'on',
      fallbackDeliveryFee: formData.get('fallbackDeliveryFee') as string
    };

    updateSettingsMutation.mutate(settingsData);
  };

  const runMigration = async () => {
    setMigrationStatus('running');
    setMigrationError('');

    try {
      const response = await apiRequest('POST', '/api/run-delivery-migration');
      if (!response.ok) {
        throw new Error(`Migration failed: ${response.statusText}`);
      }

      const result = await response.json();
      setMigrationStatus('success');

      // Refresh the delivery data after successful migration
      queryClient.invalidateQueries({ queryKey: ['/api/admin/delivery-zones'] });

    } catch (error) {
      setMigrationStatus('error');
      setMigrationError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  if (isLoading) return <div>Loading delivery settings...</div>;
  if (error) return (
    <div className="space-y-4">
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        <h3 className="font-bold">Error loading delivery settings:</h3>
        <p>{error instanceof Error ? error.message : 'Unknown error'}</p>
        <details className="mt-2">
          <summary>Technical Details</summary>
          <pre className="text-xs mt-1">{JSON.stringify(error, null, 2)}</pre>
        </details>
      </div>
    </div>
  );

  const zones = deliveryData?.zones || [];
  const settings = deliveryData?.settings || {
    restaurantAddress: '',
    maxDeliveryRadius: '10',
    distanceUnit: 'miles',
    isGoogleMapsEnabled: false,
    fallbackDeliveryFee: '5.00'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Delivery Management</h2>
        <div className="space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Delivery Settings
          </button>
          <button
            onClick={() => setShowAddZone(!showAddZone)}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Add Delivery Zone
          </button>
        </div>
      </div>

      {/* Delivery Settings Form */}
      {showSettings && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Delivery Settings</h3>
          <form onSubmit={handleUpdateSettings} className="space-y-4">
            <div>
              <label htmlFor="restaurantAddress" className="block text-sm font-medium text-gray-700">
                Restaurant Address
              </label>
              <input
                type="text"
                id="restaurantAddress"
                name="restaurantAddress"
                defaultValue={settings.restaurantAddress}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>

            <div>
              <label htmlFor="googleMapsApiKey" className="block text-sm font-medium text-gray-700">
                Google Maps API Key
              </label>
              <input
                type="text"
                id="googleMapsApiKey"
                name="googleMapsApiKey"
                defaultValue={settings.googleMapsApiKey || ''}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="maxDeliveryRadius" className="block text-sm font-medium text-gray-700">
                  Max Delivery Radius
                </label>
                <input
                  type="number"
                  step="0.1"
                  id="maxDeliveryRadius"
                  name="maxDeliveryRadius"
                  defaultValue={settings.maxDeliveryRadius}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  required
                />
              </div>

              <div>
                <label htmlFor="distanceUnit" className="block text-sm font-medium text-gray-700">
                  Distance Unit
                </label>
                <select
                  id="distanceUnit"
                  name="distanceUnit"
                  defaultValue={settings.distanceUnit}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                >
                  <option value="miles">Miles</option>
                  <option value="kilometers">Kilometers</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="fallbackDeliveryFee" className="block text-sm font-medium text-gray-700">
                Fallback Delivery Fee
              </label>
              <input
                type="number"
                step="0.01"
                id="fallbackDeliveryFee"
                name="fallbackDeliveryFee"
                defaultValue={settings.fallbackDeliveryFee}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isGoogleMapsEnabled"
                name="isGoogleMapsEnabled"
                defaultChecked={settings.isGoogleMapsEnabled}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="isGoogleMapsEnabled" className="ml-2 block text-sm text-gray-900">
                Enable Google Maps Integration
              </label>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateSettingsMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Zone Form */}
      {showAddZone && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Add Delivery Zone</h3>
          <form onSubmit={handleCreateZone} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Zone Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="maxRadius" className="block text-sm font-medium text-gray-700">
                  Max Radius (miles)
                </label>
                <input
                  type="number"
                  step="0.1"
                  id="maxRadius"
                  name="maxRadius"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  required
                />
              </div>

              <div>
                <label htmlFor="deliveryFee" className="block text-sm font-medium text-gray-700">
                  Delivery Fee ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  id="deliveryFee"
                  name="deliveryFee"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  required
                />
              </div>

              <div>
                <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700">
                  Sort Order
                </label>
                <input
                  type="number"
                  id="sortOrder"
                  name="sortOrder"
                  defaultValue={zones.length}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                defaultChecked={true}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                Active
              </label>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowAddZone(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createZoneMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {createZoneMutation.isPending ? 'Creating...' : 'Create Zone'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Interactive Delivery Map */}
      {settings.isGoogleMapsEnabled && settings.googleMapsApiKey && settings.restaurantAddress && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Delivery Zone Map</h3>
          <DeliveryMap
            zones={zones.map((zone, index) => ({
              id: zone.id,
              name: zone.name,
              maxRadius: parseFloat(zone.maxRadius),
              deliveryFee: parseFloat(zone.deliveryFee),
              isActive: zone.isActive,
              color: ['#22c55e', '#3b82f6', '#ef4444'][index % 3] // Green, Blue, Red
            }))}
            restaurantAddress={settings.restaurantAddress}
            onZoneUpdate={(zoneId, updates) => {
              const zone = zones.find(z => z.id === zoneId);
              if (zone) {
                const updatedZone = {
                  ...zone,
                  name: updates.name || zone.name,
                  maxRadius: updates.maxRadius?.toString() || zone.maxRadius,
                  deliveryFee: updates.deliveryFee?.toString() || zone.deliveryFee,
                  isActive: updates.isActive !== undefined ? updates.isActive : zone.isActive
                };
                updateZoneMutation.mutate(updatedZone);
              }
            }}
          />
        </div>
      )}

      {/* Fallback Map when Google Maps is not enabled */}
      {(!settings.isGoogleMapsEnabled || !settings.googleMapsApiKey) && zones.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Delivery Zones</h3>
          <DeliveryMapFallback
            zones={zones.map((zone, index) => ({
              id: zone.id,
              name: zone.name,
              maxRadius: parseFloat(zone.maxRadius),
              deliveryFee: parseFloat(zone.deliveryFee),
              isActive: zone.isActive,
              color: ['#22c55e', '#3b82f6', '#ef4444'][index % 3]
            }))}
            onZoneUpdate={(zoneId, updates) => {
              const zone = zones.find(z => z.id === zoneId);
              if (zone) {
                const updatedZone = {
                  ...zone,
                  name: updates.name || zone.name,
                  maxRadius: updates.maxRadius?.toString() || zone.maxRadius,
                  deliveryFee: updates.deliveryFee?.toString() || zone.deliveryFee,
                  isActive: updates.isActive !== undefined ? updates.isActive : zone.isActive
                };
                updateZoneMutation.mutate(updatedZone);
              }
            }}
          />
        </div>
      )}

      {/* Delivery Zones List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Delivery Zones</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Zone Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Max Radius
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delivery Fee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {zones.map((zone) => (
                <tr key={zone.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {zone.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {zone.maxRadius} miles
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${zone.deliveryFee}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      zone.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {zone.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => setEditingZone(zone)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteZoneMutation.mutate(zone.id)}
                      className="text-red-600 hover:text-red-900"
                      disabled={deleteZoneMutation.isPending}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {zones.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No delivery zones configured. Add one to get started!
            </div>
          )}
        </div>
      </div>

      {/* Edit Zone Modal */}
      {editingZone && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-semibold mb-4">Edit Delivery Zone</h3>
            <form onSubmit={handleUpdateZone} className="space-y-4">
              <div>
                <label htmlFor="editName" className="block text-sm font-medium text-gray-700">
                  Zone Name
                </label>
                <input
                  type="text"
                  id="editName"
                  name="name"
                  defaultValue={editingZone.name}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  required
                />
              </div>

              <div>
                <label htmlFor="editMaxRadius" className="block text-sm font-medium text-gray-700">
                  Max Radius (miles)
                </label>
                <input
                  type="number"
                  step="0.1"
                  id="editMaxRadius"
                  name="maxRadius"
                  defaultValue={editingZone.maxRadius}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  required
                />
              </div>

              <div>
                <label htmlFor="editDeliveryFee" className="block text-sm font-medium text-gray-700">
                  Delivery Fee ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  id="editDeliveryFee"
                  name="deliveryFee"
                  defaultValue={editingZone.deliveryFee}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  required
                />
              </div>

              <div>
                <label htmlFor="editSortOrder" className="block text-sm font-medium text-gray-700">
                  Sort Order
                </label>
                <input
                  type="number"
                  id="editSortOrder"
                  name="sortOrder"
                  defaultValue={editingZone.sortOrder}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="editIsActive"
                  name="isActive"
                  defaultChecked={editingZone.isActive}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="editIsActive" className="ml-2 block text-sm text-gray-900">
                  Active
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingZone(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateZoneMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {updateZoneMutation.isPending ? 'Updating...' : 'Update Zone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}