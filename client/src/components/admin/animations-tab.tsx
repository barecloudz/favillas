import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2, Snowflake } from 'lucide-react';

export const AnimationsTab = () => {
  const { toast } = useToast();

  const { data: animations = [], isLoading } = useQuery({
    queryKey: ['/api/animations'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/animations');
      if (!response.ok) throw new Error('Failed to fetch animations');
      return response.json();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ animation_key, is_enabled }: { animation_key: string; is_enabled: boolean }) => {
      const animation = animations.find((a: any) => a.animation_key === animation_key);
      const response = await apiRequest('POST', '/api/animations', {
        animation_key,
        is_enabled,
        settings: animation?.settings || {},
        pages: animation?.pages || ['all'],
      });
      if (!response.ok) throw new Error('Failed to update animation');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/animations'] });
      toast({
        title: 'Success',
        description: 'Animation settings updated',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update animation',
        variant: 'destructive',
      });
    },
  });

  const snowAnimation = animations.find((a: any) => a.animation_key === 'snow_fall');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#d73a31]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Animation Settings</h2>
        <p className="text-gray-600">Control festive animations displayed on your site</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Snowflake className="h-5 w-5 text-blue-500" />
            Christmas Snow
          </CardTitle>
          <CardDescription>
            White snowfall animation that appears across all pages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="snow-toggle">Enable Snow Animation</Label>
              <p className="text-sm text-gray-500">
                Non-interactive overlay that won't block user interactions
              </p>
            </div>
            <Switch
              id="snow-toggle"
              checked={snowAnimation?.is_enabled || false}
              onCheckedChange={(checked) =>
                toggleMutation.mutate({
                  animation_key: 'snow_fall',
                  is_enabled: checked,
                })
              }
              disabled={toggleMutation.isPending}
            />
          </div>

          {snowAnimation?.is_enabled && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                ❄️ <strong>Active:</strong> Snow is currently falling on all pages
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Changes take effect immediately. Refresh the page to see updates.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gray-50 border-dashed">
        <CardHeader>
          <CardTitle className="text-lg">Coming Soon</CardTitle>
          <CardDescription>
            More festive animations will be available here: flying Santa, ornaments, lights, and more!
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};
