import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Clock, Play, Square, Coffee, AlertTriangle, Calendar } from "lucide-react";
import { Helmet } from "react-helmet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const EmployeeClockPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [breakDuration, setBreakDuration] = useState(0);
  const [clockOutNotes, setClockOutNotes] = useState("");
  const [showUnscheduledDialog, setShowUnscheduledDialog] = useState(false);

  // Get current clock status
  const { data: clockStatus, isLoading, refetch } = useQuery({
    queryKey: ["/api/time-clock/status"],
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Clock In mutation
  const clockInMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/time-clock/clock-in", {}),
    onSuccess: async (response) => {
      const data = await response.json();
      toast({
        title: "Clocked In Successfully",
        description: `Welcome back, ${user?.firstName}!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/time-clock/status"] });
      
      // Show alert if there's a scheduling issue
      if (data.alert) {
        toast({
          title: "Scheduling Notice",
          description: data.alert.message,
          variant: data.alert.alertType === 'late_clock_in' ? "destructive" : "default",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Clock In Failed",
        description: error.message || "Failed to clock in",
        variant: "destructive",
      });
    },
  });

  // Clock Out mutation
  const clockOutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/time-clock/clock-out", {
      timeEntryId: clockStatus?.activeEntry?.id,
      breakDuration,
      notes: clockOutNotes,
    }),
    onSuccess: async (response) => {
      const data = await response.json();
      toast({
        title: "Clocked Out Successfully",
        description: `You worked ${data.totalHours} hours today. Great job!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/time-clock/status"] });
      setBreakDuration(0);
      setClockOutNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Clock Out Failed",
        description: error.message || "Failed to clock out",
        variant: "destructive",
      });
    },
  });

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDuration = (clockInTime: string) => {
    const start = new Date(clockInTime);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60)); // minutes
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return `${hours}h ${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#d73a31]"></div>
      </div>
    );
  }

  const isClocked = clockStatus?.isClocked;
  const activeEntry = clockStatus?.activeEntry;
  const todaysSchedule = clockStatus?.todaysSchedule;

  return (
    <>
      <Helmet>
        <title>Time Clock - Favilla's NY Pizza</title>
      </Helmet>
      
      <div className="min-h-screen bg-gray-50 py-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Time Clock</h1>
            <p className="text-gray-600">Welcome, {user?.firstName} {user?.lastName}</p>
            <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-US', { 
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
            })}</p>
          </div>

          <div className="space-y-6">
            {/* Today's Schedule */}
            {todaysSchedule && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Today's Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{todaysSchedule.position}</p>
                      <p className="text-sm text-gray-600">
                        {formatTime(`2000-01-01T${todaysSchedule.startTime}`)} - {formatTime(`2000-01-01T${todaysSchedule.endTime}`)}
                      </p>
                    </div>
                    <Badge variant={todaysSchedule.isMandatory ? "default" : "secondary"}>
                      {todaysSchedule.isMandatory ? "Required" : "Optional"}
                    </Badge>
                  </div>
                  {todaysSchedule.notes && (
                    <p className="text-sm text-gray-600 mt-2">{todaysSchedule.notes}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Clock Status */}
            <Card className="border-2 border-[#d73a31]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-6 w-6" />
                  Current Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isClocked ? (
                  <div className="text-center space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="font-medium text-green-800">Currently Clocked In</span>
                      </div>
                      <p className="text-sm text-green-700">
                        Started at {formatTime(activeEntry.clockInTime)}
                      </p>
                      <p className="text-lg font-bold text-green-800 mt-2">
                        Time Worked: {formatDuration(activeEntry.clockInTime)}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Break Duration (minutes)</label>
                        <Input
                          type="number"
                          min="0"
                          value={breakDuration}
                          onChange={(e) => setBreakDuration(parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                        <Textarea
                          value={clockOutNotes}
                          onChange={(e) => setClockOutNotes(e.target.value)}
                          placeholder="Any notes about your shift..."
                          className="w-full"
                          rows={3}
                        />
                      </div>

                      <Button
                        onClick={() => clockOutMutation.mutate()}
                        disabled={clockOutMutation.isPending}
                        className="w-full bg-red-600 hover:bg-red-700 text-white py-3"
                        size="lg"
                      >
                        <Square className="h-5 w-5 mr-2" />
                        {clockOutMutation.isPending ? "Clocking Out..." : "Clock Out"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                        <span className="font-medium text-gray-700">Not Clocked In</span>
                      </div>
                      <p className="text-sm text-gray-600">Ready to start your shift?</p>
                    </div>

                    <Button
                      onClick={() => {
                        // Check if employee has a scheduled shift today
                        if (!todaysSchedule) {
                          setShowUnscheduledDialog(true);
                        } else {
                          clockInMutation.mutate();
                        }
                      }}
                      disabled={clockInMutation.isPending}
                      className="w-full bg-[#d73a31] hover:bg-[#c73128] text-white py-3"
                      size="lg"
                    >
                      <Play className="h-5 w-5 mr-2" />
                      {clockInMutation.isPending ? "Clocking In..." : "Clock In"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="h-16 flex flex-col items-center gap-2"
                  onClick={() => {
                    refetch();
                    queryClient.invalidateQueries({ queryKey: ["/api/time-clock/status"] });
                    toast({
                      title: "Status Refreshed",
                      description: "Clock status has been updated",
                    });
                  }}
                >
                  <Clock className="h-5 w-5" />
                  <span className="text-sm">Refresh Status</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-16 flex flex-col items-center gap-2"
                  onClick={() => {
                    toast({
                      title: "Coming Soon",
                      description: "Timesheet view is not yet implemented",
                    });
                  }}
                >
                  <Calendar className="h-5 w-5" />
                  <span className="text-sm">View Timesheet</span>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Unscheduled Clock-In Confirmation Dialog */}
      <AlertDialog open={showUnscheduledDialog} onOpenChange={setShowUnscheduledDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Unscheduled Clock-In
            </AlertDialogTitle>
            <AlertDialogDescription>
              You don't have a scheduled shift today. Are you sure you want to clock in unscheduled? 
              Admin will be notified about this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                clockInMutation.mutate();
                setShowUnscheduledDialog(false);
              }}
              className="bg-[#d73a31] hover:bg-[#c73128]"
            >
              Clock In Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EmployeeClockPage;