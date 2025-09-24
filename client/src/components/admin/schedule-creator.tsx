import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Plus, Trash2, Edit, Users, ChevronLeft, ChevronRight, CalendarDays, DollarSign, AlertTriangle, Printer, BarChart3 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface ScheduleCreatorProps {
  className?: string;
}

const ScheduleCreator: React.FC<ScheduleCreatorProps> = ({ className }) => {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Utility function to get date string in local timezone
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Utility function to create date from date string (avoiding timezone issues)
  const createDateFromString = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const [scheduleForm, setScheduleForm] = useState({
    employeeId: '',
    scheduleDate: getLocalDateString(new Date()),
    startTime: '09:00',
    endTime: '17:00',
    position: 'kitchen',
    isMandatory: true,
    notes: '',
  });

  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);

  // Calculate view dates based on current week
  const viewDates = useMemo(() => {
    const startOfWeek = new Date(currentWeek);
    // Get Monday of the current week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = startOfWeek.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Handle Sunday properly
    startOfWeek.setDate(startOfWeek.getDate() + daysToMonday);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday

    return {
      startDate: getLocalDateString(startOfWeek),
      endDate: getLocalDateString(endOfWeek),
    };
  }, [currentWeek]);

  // Get list of employees
  const { data: employees } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/users");
      const data = await response.json();
      return data.filter((user: any) => user.role === 'employee' || user.isAdmin);
    },
  });

  // Get schedules for the current view period
  const { data: schedules, isLoading } = useQuery({
    queryKey: ["/api/admin-schedules", viewDates],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/admin-schedules?startDate=${viewDates.startDate}&endDate=${viewDates.endDate}`
      );
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Create schedule mutation
  const createScheduleMutation = useMutation({
          mutationFn: (data: any) => apiRequest("POST", "/api/admin-schedules", data),
    onSuccess: async () => {
      toast({
        title: "Schedule Created",
        description: "Employee schedule has been created successfully.",
      });
      // Invalidate all schedule queries to refresh the grid immediately
      queryClient.invalidateQueries({ queryKey: ["/api/admin-schedules"] });
      queryClient.refetchQueries({ queryKey: ["/api/admin-schedules", viewDates] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: async (error: any) => {
      const errorData = await error.response?.json();
      toast({
        title: "Failed to Create Schedule",
        description: errorData?.message || "There was an error creating the schedule.",
        variant: "destructive",
      });
    },
  });

  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", `/api/admin-schedules/${editingScheduleId}`, data),
    onSuccess: async () => {
      toast({
        title: "Schedule Updated",
        description: "Employee schedule has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin-schedules"] });
      queryClient.refetchQueries({ queryKey: ["/api/admin-schedules", viewDates] });
      setIsDialogOpen(false);
      setEditingScheduleId(null);
      resetForm();
    },
    onError: async (error: any) => {
      const errorData = await error.response?.json();
      toast({
        title: "Failed to Update Schedule",
        description: errorData?.message || "There was an error updating the schedule.",
        variant: "destructive",
      });
    },
  });

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: (scheduleId: number) => apiRequest("DELETE", `/api/admin-schedules/${scheduleId}`),
    onSuccess: async () => {
      toast({
        title: "Schedule Deleted",
        description: "Employee schedule has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin-schedules"] });
      queryClient.refetchQueries({ queryKey: ["/api/admin-schedules", viewDates] });
      setIsDialogOpen(false);
      setEditingScheduleId(null);
      resetForm();
    },
    onError: async (error: any) => {
      const errorData = await error.response?.json();
      toast({
        title: "Failed to Delete Schedule",
        description: errorData?.message || "There was an error deleting the schedule.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setScheduleForm({
      employeeId: '',
      scheduleDate: getLocalDateString(new Date()),
      startTime: '09:00',
      endTime: '17:00',
      position: 'kitchen',
      isMandatory: true,
      notes: '',
    });
    setEditingScheduleId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.employeeId) {
      toast({
        title: "Validation Error",
        description: "Please select an employee.",
        variant: "destructive",
      });
      return;
    }

    const scheduleData = {
      employeeId: parseInt(scheduleForm.employeeId),
      scheduleDate: scheduleForm.scheduleDate,
      startTime: scheduleForm.startTime,
      endTime: scheduleForm.endTime,
      position: scheduleForm.position,
      isMandatory: scheduleForm.isMandatory,
      notes: scheduleForm.notes,
    };

    if (editingScheduleId) {
      updateScheduleMutation.mutate(scheduleData);
    } else {
      createScheduleMutation.mutate(scheduleData);
    }
  };

  const handleDateClick = (date: Date) => {
    const dateStr = getLocalDateString(date);
    setSelectedDate(dateStr);
    setScheduleForm(prev => ({ ...prev, scheduleDate: dateStr }));
    setIsDialogOpen(true);
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const calculateShiftHours = (startTime: string, endTime: string) => {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return diff.toFixed(1);
  };

  const calculateLaborCost = () => {
    if (!Array.isArray(schedules) || !Array.isArray(employees)) {
      return 0;
    }

    return schedules.reduce((total: number, schedule: any) => {
      const employee = employees.find((emp: any) => emp.id === schedule.employeeId);
      const hours = parseFloat(calculateShiftHours(schedule.startTime, schedule.endTime));
      const hourlyRate = employee?.hourlyRate ? parseFloat(employee.hourlyRate) : 15.00; // Default to $15 if not set
      return total + (hours * hourlyRate);
    }, 0);
  };

  const groupSchedulesByDate = (schedules: any[]) => {
    if (!Array.isArray(schedules)) {
      console.warn('⚠️ groupSchedulesByDate received non-array:', schedules);
      return {};
    }
    return schedules.reduce((acc, schedule) => {
      const date = schedule.scheduleDate;
      if (!acc[date]) acc[date] = [];
      acc[date].push(schedule);
      return acc;
    }, {} as Record<string, any[]>);
  };

  const getPositionColor = (position: string) => {
    const colors = {
      kitchen: 'bg-blue-100 text-blue-800',
      cashier: 'bg-green-100 text-green-800',
      delivery: 'bg-purple-100 text-purple-800',
      manager: 'bg-red-100 text-red-800',
    };
    return colors[position as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const groupedSchedules = schedules ? groupSchedulesByDate(schedules) : {};

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => {
      const newWeek = new Date(prev);
      newWeek.setDate(prev.getDate() + (direction === 'next' ? 7 : -7));
      return newWeek;
    });
  };

  const goToThisWeek = () => {
    setCurrentWeek(new Date());
  };

  const handlePrintSchedule = async () => {
    try {
      const response = await apiRequest(
        "GET",
        `/api/admin-schedules-print?format=html&startDate=${viewDates.startDate}&endDate=${viewDates.endDate}`
      );

      if (response.ok) {
        const htmlContent = await response.text();

        // Create a new window with the HTML content optimized for printing
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Schedule ${viewDates.startDate} to ${viewDates.endDate}</title>
              <meta charset="utf-8">
              <style>
                @media print {
                  body { margin: 0; }
                  .no-print { display: none; }
                }
                @page {
                  margin: 0.5in;
                  size: A4;
                }
              </style>
            </head>
            <body>
              ${htmlContent}
              <div class="no-print" style="position: fixed; top: 10px; right: 10px; z-index: 1000;">
                <button onclick="window.print()" style="padding: 10px 20px; background: #d73a31; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">Print PDF</button>
                <button onclick="window.close()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin-left: 5px;">Close</button>
              </div>
            </body>
            </html>
          `);
          printWindow.document.close();
        }
      } else {
        console.error('Failed to fetch schedule:', response.status);
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
    }
  };

  const handleScheduleClick = (schedule: any) => {
    setScheduleForm({
      employeeId: schedule.employeeId.toString(),
      scheduleDate: schedule.scheduleDate,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      position: schedule.position,
      isMandatory: schedule.isMandatory,
      notes: schedule.notes || '',
    });
    setEditingScheduleId(schedule.id);
    setIsDialogOpen(true);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Employee Schedule</h2>
            <p className="text-gray-600">Manage work schedules with calendar view</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#d73a31] hover:bg-[#c73128]">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Shift
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingScheduleId ? 'Edit Schedule' : 'Create New Schedule'}</DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Employee</label>
                    <Select 
                      value={scheduleForm.employeeId} 
                      onValueChange={(value) => setScheduleForm(prev => ({ ...prev, employeeId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees?.map((emp: any) => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {emp.firstName} {emp.lastName} ({emp.department || 'N/A'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Date</label>
                    <Input
                      type="date"
                      value={scheduleForm.scheduleDate}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, scheduleDate: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Start Time</label>
                      <Input
                        type="time"
                        value={scheduleForm.startTime}
                        onChange={(e) => setScheduleForm(prev => ({ ...prev, startTime: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">End Time</label>
                      <Input
                        type="time"
                        value={scheduleForm.endTime}
                        onChange={(e) => setScheduleForm(prev => ({ ...prev, endTime: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Position</label>
                    <Select 
                      value={scheduleForm.position} 
                      onValueChange={(value) => setScheduleForm(prev => ({ ...prev, position: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kitchen">Kitchen</SelectItem>
                        <SelectItem value="cashier">Cashier</SelectItem>
                        <SelectItem value="delivery">Delivery</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="mandatory"
                      checked={scheduleForm.isMandatory}
                      onCheckedChange={(checked) => setScheduleForm(prev => ({ ...prev, isMandatory: checked }))}
                    />
                    <label htmlFor="mandatory" className="text-sm font-medium">
                      Mandatory Shift
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                    <Textarea
                      value={scheduleForm.notes}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Any special instructions..."
                      rows={3}
                    />
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">
                      Shift Duration: {calculateShiftHours(scheduleForm.startTime, scheduleForm.endTime)} hours
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        resetForm();
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    {editingScheduleId && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => deleteScheduleMutation.mutate(editingScheduleId)}
                        disabled={deleteScheduleMutation.isPending}
                        className="flex-1"
                      >
                        {deleteScheduleMutation.isPending ? "Deleting..." : "Delete"}
                      </Button>
                    )}
                    <Button
                      type="submit"
                      disabled={createScheduleMutation.isPending || updateScheduleMutation.isPending}
                      className="flex-1 bg-[#d73a31] hover:bg-[#c73128]"
                    >
                      {editingScheduleId 
                        ? (updateScheduleMutation.isPending ? "Updating..." : "Update Schedule")
                        : (createScheduleMutation.isPending ? "Creating..." : "Create Schedule")
                      }
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Weekly Schedule Grid */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateWeek('prev')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h3 className="text-lg font-semibold min-w-[200px] text-center">
                    Week of {new Date(viewDates.startDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })} - {new Date(viewDates.endDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateWeek('next')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToThisWeek}
                >
                  This Week
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintSchedule}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Schedule
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0 sm:p-6">
            {/* Mobile View */}
            <div className="block lg:hidden">
              {/* Week Days Header for Mobile */}
              <div className="bg-gray-50 p-3 mb-4 rounded-lg border">
                <div className="grid grid-cols-7 gap-1 text-center">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, dayIndex) => {
                    const headerDate = createDateFromString(viewDates.startDate);
                    headerDate.setDate(headerDate.getDate() + dayIndex);
                    const isToday = getLocalDateString(new Date()) === getLocalDateString(headerDate);

                    return (
                      <div key={day} className={`py-2 px-1 rounded ${isToday ? 'bg-blue-100 border border-blue-300' : ''}`}>
                        <div className={`text-xs font-medium ${isToday ? 'text-blue-800' : 'text-gray-900'}`}>
                          {day}
                        </div>
                        <div className={`text-xs ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                          {headerDate.getDate()}/{headerDate.getMonth() + 1}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="max-h-[65vh] overflow-y-auto mobile-scroll-container space-y-4">
                {employees?.map((employee: any) => {
                  const employeeSchedules = Array.isArray(schedules) ?
                    schedules.filter((s: any) => s.employeeId === employee.id) : [];
                  const weeklyHours = employeeSchedules.reduce((total: number, schedule: any) => {
                    return total + parseFloat(calculateShiftHours(schedule.startTime, schedule.endTime));
                  }, 0);

                  return (
                    <Card key={employee.id} className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-semibold text-blue-700">
                                {employee.firstName?.[0]}{employee.lastName?.[0]}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900 text-base">
                                {employee.firstName} {employee.lastName}
                              </h4>
                              <p className="text-sm text-gray-500">{employee.department || 'Staff'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className={`
                              ${weeklyHours > 40 ? 'border-orange-300 text-orange-700 bg-orange-50' :
                                weeklyHours > 0 ? 'border-green-300 text-green-700 bg-green-50' :
                                'border-gray-300 text-gray-500 bg-gray-50'}
                            `}>
                              {weeklyHours.toFixed(1)}h
                            </Badge>
                            {weeklyHours > 40 && (
                              <div className="text-xs text-orange-600 mt-1 flex items-center justify-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                OT
                              </div>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0 pb-4">
                        <div className="grid grid-cols-7 gap-1">
                          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, dayIndex) => {
                            const dayDate = createDateFromString(viewDates.startDate);
                            dayDate.setDate(dayDate.getDate() + dayIndex);
                            const dayDateStr = getLocalDateString(dayDate);
                            const daySchedules = employeeSchedules.filter((s: any) => s.scheduleDate === dayDateStr);
                            const isToday = getLocalDateString(new Date()) === dayDateStr;

                            return (
                              <div
                                key={day}
                                className={`
                                  min-h-[80px] p-2 border rounded-lg cursor-pointer transition-all duration-200
                                  ${isToday ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                                  active:scale-95 active:bg-gray-100
                                `}
                                onClick={() => handleDateClick(dayDate)}
                              >
                                {daySchedules.length > 0 ? (
                                  <div className="space-y-1">
                                    {daySchedules.map((schedule: any, index: number) => (
                                      <div
                                        key={schedule.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleScheduleClick(schedule);
                                        }}
                                        className={`
                                          text-xs p-1.5 rounded-md font-medium cursor-pointer transition-all hover:scale-105 touch-manipulation
                                          ${schedule.position === 'kitchen' ? 'bg-blue-500 text-white hover:bg-blue-600' :
                                            schedule.position === 'cashier' ? 'bg-green-500 text-white hover:bg-green-600' :
                                            schedule.position === 'delivery' ? 'bg-purple-500 text-white hover:bg-purple-600' :
                                            'bg-red-500 text-white hover:bg-red-600'}
                                        `}
                                      >
                                        <div className="font-semibold">
                                          {schedule.startTime.slice(0, 5)}
                                        </div>
                                        <div className="text-[10px] opacity-90">
                                          {schedule.endTime.slice(0, 5)}
                                        </div>
                                        <div className="text-[9px] opacity-75 capitalize mt-0.5">
                                          {schedule.position.slice(0, 3)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="h-full flex items-center justify-center">
                                    <span className="text-xs text-gray-400 text-center leading-tight">
                                      OFF
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Desktop/Tablet Grid */}
            <div className="hidden lg:block">
              <div className="overflow-x-auto -mx-4 sm:mx-0 touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full border-collapse border border-gray-200" style={{ minWidth: '1000px' }}>
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 p-3 text-left font-medium text-gray-900 sticky left-0 bg-gray-50 z-10 min-w-[150px]">
                          Employee
                        </th>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, dayIndex) => {
                          const headerDate = createDateFromString(viewDates.startDate);
                          headerDate.setDate(headerDate.getDate() + dayIndex);
                          return (
                            <th key={day} className="border border-gray-200 p-3 text-center font-medium text-gray-900 min-w-[120px]">
                              <div>{day}</div>
                              <div className="text-xs font-normal text-gray-600">
                                {headerDate.getDate()}/{headerDate.getMonth() + 1}
                              </div>
                            </th>
                          );
                        })}
                        <th className="border border-gray-200 p-3 text-center font-medium text-gray-900 min-w-[100px]">
                          Total Hours
                        </th>
                      </tr>
                    </thead>
                <tbody>
                  {employees?.map((employee: any) => {
                    const employeeSchedules = Array.isArray(schedules) ?
                      schedules.filter((s: any) => s.employeeId === employee.id) : [];
                    const weeklyHours = employeeSchedules.reduce((total: number, schedule: any) => {
                      return total + parseFloat(calculateShiftHours(schedule.startTime, schedule.endTime));
                    }, 0);

                    return (
                      <tr key={employee.id} className="hover:bg-gray-50">
                        <td className="border border-gray-200 p-3 font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-700">
                              {employee.firstName?.[0]}{employee.lastName?.[0]}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {employee.firstName} {employee.lastName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {employee.department || 'Staff'}
                              </div>
                            </div>
                          </div>
                        </td>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, dayIndex) => {
                          const date = createDateFromString(viewDates.startDate);
                          date.setDate(date.getDate() + dayIndex);
                          const dateStr = getLocalDateString(date);
                          const daySchedules = employeeSchedules.filter((s: any) => s.scheduleDate === dateStr);

                          return (
                            <td key={day} className="border border-gray-200 p-2 text-center cursor-pointer hover:bg-blue-50" 
                                onClick={() => handleDateClick(date)}>
                              {daySchedules.length > 0 ? (
                                <div className="space-y-1">
                                  {daySchedules.map((schedule: any) => (
                                    <div
                                      key={schedule.id}
                                      className={`
                                        text-xs p-2 rounded-md font-medium cursor-pointer transition-all hover:scale-105 hover:shadow-md
                                        ${schedule.position === 'kitchen' ? 'bg-blue-500 text-white hover:bg-blue-600' :
                                          schedule.position === 'cashier' ? 'bg-green-500 text-white hover:bg-green-600' :
                                          schedule.position === 'delivery' ? 'bg-purple-500 text-white hover:bg-purple-600' :
                                          'bg-red-500 text-white hover:bg-red-600'}
                                      `}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleScheduleClick(schedule);
                                      }}
                                    >
                                      <div>{formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}</div>
                                      <div className="text-[10px] opacity-90 capitalize">{schedule.position}</div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-gray-400 text-sm py-4">OFF</div>
                              )}
                            </td>
                          );
                        })}
                        <td className="border border-gray-200 p-3 text-center">
                          <div className={`font-bold ${weeklyHours > 40 ? 'text-orange-600' : weeklyHours > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                            {weeklyHours.toFixed(1)}h
                          </div>
                          {weeklyHours > 40 && (
                            <div className="text-xs text-orange-600 flex items-center justify-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              OT
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
                </div>
              </div>
            </div>

            {/* Position Legend */}
            <div className="mt-4 flex flex-wrap gap-4 justify-center">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-sm text-gray-600">Kitchen</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm text-gray-600">Cashier</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 rounded"></div>
                <span className="text-sm text-gray-600">Delivery</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-sm text-gray-600">Manager</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Weekly Schedule Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {Array.isArray(schedules) ? schedules.length : 0}
                </div>
                <div className="text-sm text-gray-600">Total Shifts</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {Array.isArray(schedules) ? new Set(schedules.map((s: any) => s.employeeId)).size : 0}
                </div>
                <div className="text-sm text-gray-600">Staff Scheduled</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {Array.isArray(schedules) ? schedules.reduce((total: number, s: any) =>
                    total + parseFloat(calculateShiftHours(s.startTime, s.endTime)), 0
                  ).toFixed(1) : 0}h
                </div>
                <div className="text-sm text-gray-600">Total Hours</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  ${calculateLaborCost().toFixed(0)}
                </div>
                <div className="text-sm text-gray-600">Est. Labor Cost</div>
              </div>
            </div>

            {/* Position Distribution */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Coverage by Position</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['kitchen', 'cashier', 'delivery', 'manager'].map(position => {
                  const positionShifts = Array.isArray(schedules) ?
                    schedules.filter((s: any) => s.position === position) : [];
                  const positionHours = positionShifts.reduce((total: number, s: any) =>
                    total + parseFloat(calculateShiftHours(s.startTime, s.endTime)), 0
                  );
                  
                  return (
                    <div key={position} className="text-center p-3 border rounded-lg">
                      <div className={`
                        text-lg font-bold
                        ${position === 'kitchen' ? 'text-blue-600' :
                          position === 'cashier' ? 'text-green-600' :
                          position === 'delivery' ? 'text-purple-600' :
                          'text-red-600'}
                      `}>
                        {positionShifts.length}
                      </div>
                      <div className="text-xs text-gray-600 capitalize">{position} Shifts</div>
                      <div className="text-xs text-gray-500">{positionHours.toFixed(1)}h</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Warnings & Alerts */}
            {Array.isArray(schedules) && schedules.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Alerts</h4>
                <div className="space-y-2">
                  {/* Overtime Warning */}
                  {employees?.some((emp: any) => {
                    const empSchedules = schedules.filter((s: any) => s.employeeId === emp.id);
                    const hours = empSchedules.reduce((total: number, s: any) =>
                      total + parseFloat(calculateShiftHours(s.startTime, s.endTime)), 0
                    );
                    return hours > 40;
                  }) && (
                    <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="text-sm text-orange-800">
                        Some employees are scheduled for overtime (40+ hours)
                      </span>
                    </div>
                  )}
                  
                  {/* Understaffed Days */}
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].some((day, dayIndex) => {
                    const date = createDateFromString(viewDates.startDate);
                    date.setDate(date.getDate() + dayIndex);
                    const dateStr = getLocalDateString(date);
                    const daySchedules = Array.isArray(schedules) ?
                      schedules.filter((s: any) => s.scheduleDate === dateStr) : [];
                    return daySchedules.length < 2; // Minimum 2 staff per day
                  }) && (
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <Users className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-800">
                        Some days may be understaffed (less than 2 employees scheduled)
                      </span>
                    </div>
                  )}

                  {schedules.length === 0 && (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <Calendar className="h-4 w-4 text-gray-600" />
                      <span className="text-sm text-gray-600">
                        No shifts scheduled for this week. Click on any cell to add shifts.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ScheduleCreator;