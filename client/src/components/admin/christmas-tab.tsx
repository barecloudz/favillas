import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2, Gift, Calendar, Trash2, Users, Plus } from 'lucide-react';
import { ImageUpload } from '@/components/ui/image-upload';

export const ChristmasTab = () => {
  const { toast } = useToast();
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [rewardForm, setRewardForm] = useState({
    name: '',
    description: '',
    pointsRequired: '0',
    voucher_code: '',
    image_url: '',
    rewardType: 'discount',
    discount: '',
    discountType: 'percentage',
    maxDiscountAmount: '',
    freeItem: '',
    minOrderAmount: '',
    bonusPoints: '',
  });

  // Fetch animation settings (to get advent calendar toggle)
  const { data: animations = [] } = useQuery({
    queryKey: ['/api/animations'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/animations');
      if (!response.ok) throw new Error('Failed to fetch animations');
      return response.json();
    },
  });

  const adventAnimation = animations.find((a: any) => a.animation_key === 'advent_calendar');

  // Fetch advent calendar data
  const { data: calendarData, isLoading } = useQuery({
    queryKey: ['/api/admin/advent-calendar'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/advent-calendar');
      if (!response.ok) throw new Error('Failed to fetch advent calendar');
      return response.json();
    },
  });

  // Toggle advent calendar feature
  const toggleMutation = useMutation({
    mutationFn: async (isEnabled: boolean) => {
      const response = await apiRequest('POST', '/api/animations', {
        animation_key: 'advent_calendar',
        is_enabled: isEnabled,
        settings: adventAnimation?.settings || {},
        pages: ['all'],
      });
      if (!response.ok) throw new Error('Failed to update advent calendar');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/animations'] });
      toast({
        title: 'Success',
        description: 'Advent calendar settings updated',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update settings',
        variant: 'destructive',
      });
    },
  });

  // Assign reward to a day
  const assignRewardMutation = useMutation({
    mutationFn: async ({ day, rewardId, isClosed }: { day: number; rewardId: string; isClosed?: boolean }) => {
      const response = await apiRequest('POST', '/api/admin/advent-calendar', {
        day,
        rewardId: rewardId && rewardId !== 'closed' ? parseInt(rewardId) : null,
        isActive: true,
        isClosed: isClosed || rewardId === 'closed',
      });
      if (!response.ok) throw new Error('Failed to assign reward');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/advent-calendar'] });
      setEditingDay(null);
      toast({
        title: 'Success',
        description: 'Reward assigned successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign reward',
        variant: 'destructive',
      });
    },
  });

  // Remove reward from a day
  const removeRewardMutation = useMutation({
    mutationFn: async (day: number) => {
      const response = await apiRequest('DELETE', '/api/admin/advent-calendar', { day });
      if (!response.ok) throw new Error('Failed to remove reward');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/advent-calendar'] });
      toast({
        title: 'Success',
        description: 'Reward removed',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove reward',
        variant: 'destructive',
      });
    },
  });

  // Create advent-only reward
  const createRewardMutation = useMutation({
    mutationFn: async (rewardData: any) => {
      const response = await apiRequest('POST', '/api/admin/rewards', {
        ...rewardData,
        is_advent_only: true,
        is_active: true,
      });
      if (!response.ok) throw new Error('Failed to create reward');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/advent-calendar'] });
      setShowRewardForm(false);
      setRewardForm({
        name: '',
        description: '',
        pointsRequired: '0',
        voucher_code: '',
        image_url: '',
        rewardType: 'discount',
        discount: '',
        discountType: 'percentage',
        maxDiscountAmount: '',
        freeItem: '',
        minOrderAmount: '',
        bonusPoints: '',
      });
      toast({
        title: 'Success',
        description: 'Advent reward created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create reward',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#d73a31]" />
      </div>
    );
  }

  // Create array for all 25 days
  const allDays = Array.from({ length: 25 }, (_, i) => {
    const day = i + 1;
    const entry = calendarData?.entries?.find((e: any) => e.day === day);
    return {
      day,
      rewardId: entry?.reward_id || null,
      rewardName: entry?.reward_name || null,
      claimCount: entry?.claimCount || 0,
      hasReward: !!entry?.reward_id,
      isClosed: entry?.is_closed || false,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Christmas Advent Calendar</h2>
        <p className="text-gray-600">
          Manage daily rewards for your customers (Dec 1-25)
        </p>
      </div>

      {/* Enable/Disable Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-red-500" />
            Advent Calendar Feature
          </CardTitle>
          <CardDescription>
            Show countdown button and daily rewards on mobile navigation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="advent-toggle">Enable Advent Calendar</Label>
              <p className="text-sm text-gray-500">
                Customers can claim one reward per day in December
              </p>
            </div>
            <Switch
              id="advent-toggle"
              checked={adventAnimation?.is_enabled || false}
              onCheckedChange={(checked) => toggleMutation.mutate(checked)}
              disabled={toggleMutation.isPending}
            />
          </div>

          {adventAnimation?.is_enabled && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-900">
                ✅ <strong>Active:</strong> Advent calendar is visible to customers
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Advent-Only Rewards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-green-500" />
            Create Advent Rewards
          </CardTitle>
          <CardDescription>
            Create rewards that only appear in the advent calendar (hidden from regular rewards page)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showRewardForm ? (
            <Button
              onClick={() => setShowRewardForm(true)}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Advent Reward
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Reward Name</Label>
                  <Input
                    value={rewardForm.name}
                    onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
                    placeholder="e.g., Free Large Pizza"
                  />
                </div>
                <div>
                  <Label>Voucher Code</Label>
                  <Input
                    value={rewardForm.voucher_code}
                    onChange={(e) => setRewardForm({ ...rewardForm, voucher_code: e.target.value })}
                    placeholder="e.g., XMAS15"
                  />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={rewardForm.description}
                  onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
                  placeholder="Describe the reward..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Reward Type</Label>
                  <Select
                    value={rewardForm.rewardType}
                    onValueChange={(value) => setRewardForm({ ...rewardForm, rewardType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="discount">Discount</SelectItem>
                      <SelectItem value="free_item">Free Item</SelectItem>
                      <SelectItem value="bonus_points">⭐ Bonus Points</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Points Cost (use 0 for free)</Label>
                  <Input
                    type="number"
                    value={rewardForm.pointsRequired}
                    onChange={(e) => setRewardForm({ ...rewardForm, pointsRequired: e.target.value })}
                    min="0"
                  />
                </div>
              </div>

              {rewardForm.rewardType === 'discount' && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Discount Amount</Label>
                    <Input
                      type="number"
                      value={rewardForm.discount}
                      onChange={(e) => setRewardForm({ ...rewardForm, discount: e.target.value })}
                      placeholder="10"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label>Discount Type</Label>
                    <Select
                      value={rewardForm.discountType}
                      onValueChange={(value) => setRewardForm({ ...rewardForm, discountType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Max Discount ($)</Label>
                    <Input
                      type="number"
                      value={rewardForm.maxDiscountAmount}
                      onChange={(e) => setRewardForm({ ...rewardForm, maxDiscountAmount: e.target.value })}
                      placeholder="Optional"
                      min="0"
                    />
                  </div>
                </div>
              )}

              {rewardForm.rewardType === 'free_item' && (
                <div>
                  <Label>Free Item Name</Label>
                  <Input
                    value={rewardForm.freeItem}
                    onChange={(e) => setRewardForm({ ...rewardForm, freeItem: e.target.value })}
                    placeholder="e.g., Large Pepperoni Pizza"
                  />
                </div>
              )}

              {rewardForm.rewardType === 'bonus_points' && (
                <div>
                  <Label>Bonus Points to Award</Label>
                  <Input
                    type="number"
                    value={rewardForm.bonusPoints}
                    onChange={(e) => setRewardForm({ ...rewardForm, bonusPoints: e.target.value })}
                    placeholder="e.g., 50"
                    min="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Points will be added directly to the customer's account when claimed
                  </p>
                </div>
              )}

              <div>
                <Label>Minimum Order Amount ($)</Label>
                <Input
                  type="number"
                  value={rewardForm.minOrderAmount}
                  onChange={(e) => setRewardForm({ ...rewardForm, minOrderAmount: e.target.value })}
                  placeholder="Optional - e.g., 25"
                  min="0"
                />
              </div>

              <div>
                <Label>Reward Image</Label>
                <ImageUpload
                  value={rewardForm.image_url}
                  onChange={(url) => setRewardForm({ ...rewardForm, image_url: url })}
                  label="Upload reward image"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    createRewardMutation.mutate({
                      name: rewardForm.name,
                      description: rewardForm.description,
                      pointsRequired: parseInt(rewardForm.pointsRequired) || 0,
                      voucher_code: rewardForm.voucher_code,
                      image_url: rewardForm.image_url,
                      rewardType: rewardForm.rewardType,
                      discount: rewardForm.discount ? parseFloat(rewardForm.discount) : null,
                      discountType: rewardForm.discountType,
                      maxDiscountAmount: rewardForm.maxDiscountAmount ? parseFloat(rewardForm.maxDiscountAmount) : null,
                      freeItem: rewardForm.freeItem || null,
                      minOrderAmount: rewardForm.minOrderAmount ? parseFloat(rewardForm.minOrderAmount) : null,
                      bonusPoints: rewardForm.bonusPoints ? parseInt(rewardForm.bonusPoints) : null,
                    });
                  }}
                  disabled={!rewardForm.name || (rewardForm.rewardType !== 'bonus_points' && !rewardForm.voucher_code) || (rewardForm.rewardType === 'bonus_points' && !rewardForm.bonusPoints) || createRewardMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {createRewardMutation.isPending ? 'Creating...' : 'Create Reward'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRewardForm(false);
                    setRewardForm({
                      name: '',
                      description: '',
                      pointsRequired: '0',
                      voucher_code: '',
                      image_url: '',
                      rewardType: 'discount',
                      discount: '',
                      discountType: 'percentage',
                      maxDiscountAmount: '',
                      freeItem: '',
                      minOrderAmount: '',
                      bonusPoints: '',
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Rewards to Days */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-red-500" />
            Daily Rewards ({calendarData?.year})
          </CardTitle>
          <CardDescription>
            Assign rewards to each day of December (1-25)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {allDays.map((dayData) => (
              <div
                key={dayData.day}
                className={`p-3 rounded-lg border-2 ${
                  dayData.isClosed
                    ? 'border-gray-400 bg-gray-200'
                    : dayData.hasReward
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 bg-gray-50'
                }`}
              >
                <div className="text-center mb-2">
                  <div className="text-2xl font-bold text-gray-900">
                    {dayData.day}
                  </div>
                  <div className="text-xs text-gray-500">Dec {dayData.day}</div>
                </div>

                {dayData.isClosed ? (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-600 text-center">
                      Closed
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs"
                        onClick={() => setEditingDay(dayData.day)}
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                ) : dayData.hasReward ? (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-900 line-clamp-2">
                      {dayData.rewardName}
                    </div>

                    {dayData.claimCount > 0 && (
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <Users className="w-3 h-3" />
                        {dayData.claimCount} claimed
                      </div>
                    )}

                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs"
                        onClick={() => setEditingDay(dayData.day)}
                      >
                        Change
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeRewardMutation.mutate(dayData.day)}
                        disabled={removeRewardMutation.isPending}
                      >
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    className="w-full text-xs bg-red-600 hover:bg-red-700"
                    onClick={() => setEditingDay(dayData.day)}
                  >
                    Assign
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Assign Reward Modal/Dialog */}
      {editingDay && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">
              Assign Reward for December {editingDay}
            </h3>

            <div className="space-y-4">
              <div>
                <Label>Select Reward</Label>
                <Select
                  onValueChange={(value) => {
                    assignRewardMutation.mutate({
                      day: editingDay,
                      rewardId: value,
                      isClosed: value === 'closed',
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a reward..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="closed">
                      🚫 Mark as Closed
                    </SelectItem>
                    {calendarData?.rewards?.map((reward: any) => (
                      <SelectItem key={reward.id} value={reward.id.toString()}>
                        {reward.name} ({reward.points_required} pts)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setEditingDay(null)}
                  disabled={assignRewardMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
