import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar, DollarSign, TrendingUp } from "lucide-react";

export const TipsReport = ({ orders }: any) => {
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'custom'>('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Safety check - ensure orders is an array
  // Note: Test order filtering is now applied system-wide in the parent component
  const safeOrders = Array.isArray(orders) ? orders : [];

  // Get today's date in YYYY-MM-DD format (EST timezone)
  const getTodayString = () => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(new Date());
  };

  // Get date one week ago (EST timezone)
  const getWeekAgoString = () => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return formatter.format(weekAgo);
  };

  // Initialize dates
  useEffect(() => {
    setStartDate(getTodayString());
    setEndDate(getTodayString());
  }, []);

  // Filter orders based on selected date range
  const getFilteredOrders = () => {
    if (safeOrders.length === 0) return [];

    let start: Date, end: Date;

    // Filter orders by comparing EST dates
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    return safeOrders.filter((order: any) => {
      const dateValue = order.created_at || order.createdAt;
      if (!dateValue) return false;

      const orderDate = new Date(dateValue);
      if (isNaN(orderDate.getTime())) return false;

      // Convert order timestamp to EST date string using formatter
      const orderDateStr = formatter.format(orderDate);

      if (dateRange === 'today') {
        const todayStr = formatter.format(new Date());
        return orderDateStr === todayStr && order.status === 'picked_up';
      } else if (dateRange === 'week') {
        const today = new Date();
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = formatter.format(weekAgo);
        const todayStr = formatter.format(today);
        return orderDateStr >= weekAgoStr && orderDateStr <= todayStr && order.status === 'picked_up';
      } else {
        if (!startDate || !endDate) return false;
        return orderDateStr >= startDate && orderDateStr <= endDate && order.status === 'picked_up';
      }
    });
  };

  // Calculate tip totals
  const calculateTips = () => {
    const filtered = getFilteredOrders();

    let totalTips = 0;
    let pickupTips = 0;
    let deliveryTips = 0;
    let pickupCount = 0;
    let deliveryCount = 0;

    filtered.forEach((order: any) => {
      const tip = parseFloat(String(order.tip || '0'));
      if (!isNaN(tip)) {
        totalTips += tip;

        if (order.order_type === 'pickup' || order.orderType === 'pickup') {
          pickupTips += tip;
          pickupCount++;
        } else if (order.order_type === 'delivery' || order.orderType === 'delivery') {
          deliveryTips += tip;
          deliveryCount++;
        }
      }
    });

    return {
      totalTips,
      pickupTips,
      deliveryTips,
      pickupCount,
      deliveryCount,
      orderCount: filtered.length,
      avgTipPerOrder: filtered.length > 0 ? totalTips / filtered.length : 0,
      avgPickupTip: pickupCount > 0 ? pickupTips / pickupCount : 0,
      avgDeliveryTip: deliveryCount > 0 ? deliveryTips / deliveryCount : 0,
    };
  };

  // Get daily breakdown for custom range
  const getDailyBreakdown = () => {
    if (dateRange !== 'custom' || !startDate || !endDate) return [];

    const filtered = getFilteredOrders();
    const dailyMap: { [key: string]: { pickupTips: number; deliveryTips: number; total: number } } = {};

    filtered.forEach((order: any) => {
      const dateValue = order.created_at || order.createdAt;
      if (!dateValue) return;
      const orderDate = new Date(dateValue);
      if (isNaN(orderDate.getTime())) return;
      const date = orderDate.toISOString().split('T')[0];
      const tip = parseFloat(String(order.tip || '0'));

      if (!isNaN(tip)) {
        if (!dailyMap[date]) {
          dailyMap[date] = { pickupTips: 0, deliveryTips: 0, total: 0 };
        }

        dailyMap[date].total += tip;

        if (order.order_type === 'pickup' || order.orderType === 'pickup') {
          dailyMap[date].pickupTips += tip;
        } else if (order.order_type === 'delivery' || order.orderType === 'delivery') {
          dailyMap[date].deliveryTips += tip;
        }
      }
    });

    return Object.entries(dailyMap)
      .map(([date, tips]) => ({ date, ...tips }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const tips = calculateTips();
  const dailyBreakdown = getDailyBreakdown();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tips Report</h1>
        <p className="text-gray-600 mt-1">Track tip earnings by date range and order type</p>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Date Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="week">Last 7 Days</TabsTrigger>
              <TabsTrigger value="custom">Custom Range</TabsTrigger>
            </TabsList>

            <TabsContent value="custom" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-600">
              Note: Test order filtering (orders before #52, and #55, #56) is controlled system-wide in Settings → General → Analytics & Reporting
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tip Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tips</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${tips.totalTips.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {tips.orderCount} orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pickup Tips</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${tips.pickupTips.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {tips.pickupCount} pickup orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Tips</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${tips.deliveryTips.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {tips.deliveryCount} delivery orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Tip/Order</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${tips.avgTipPerOrder.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Pickup: ${tips.avgPickupTip.toFixed(2)} | Delivery: ${tips.avgDeliveryTip.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Breakdown (Custom Range Only) */}
      {dateRange === 'custom' && dailyBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Breakdown</CardTitle>
            <CardDescription>Tips by day for selected date range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dailyBreakdown.map((day) => (
                <div
                  key={day.date}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">
                      {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex gap-6 text-sm">
                    <div className="text-right">
                      <p className="text-gray-500">Pickup</p>
                      <p className="font-semibold text-green-600">${day.pickupTips.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500">Delivery</p>
                      <p className="font-semibold text-blue-600">${day.deliveryTips.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500">Total</p>
                      <p className="font-bold">${day.total.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
