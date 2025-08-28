import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Clock, Users, TrendingUp, Download, Calendar, AlertTriangle } from "lucide-react";

interface PayrollDashboardProps {
  className?: string;
}

const PayrollDashboard: React.FC<PayrollDashboardProps> = ({ className }) => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 weeks ago
    endDate: new Date().toISOString().split('T')[0], // today
  });

  // Get payroll data
  const { data: payrollData, isLoading } = useQuery({
    queryKey: ["/api/admin/payroll", dateRange],
    queryFn: async () => {
      const response = await fetch(`/api/admin/payroll?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`, {
        credentials: 'include'
      });
      return response.json();
    },
  });

  // Get schedule alerts
  const { data: alerts } = useQuery({
    queryKey: ["/api/admin/alerts"],
    queryFn: async () => {
      const response = await fetch('/api/admin/alerts?unreadOnly=true', {
        credentials: 'include'
      });
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleDateRangeChange = (field: 'startDate' | 'endDate', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const exportPayrollData = () => {
    if (!payrollData) return;
    
    const csvContent = [
      ['Employee', 'Department', 'Total Hours', 'Regular Hours', 'Overtime Hours', 'Hourly Rate', 'Regular Pay', 'Overtime Pay', 'Total Pay'].join(','),
      ...payrollData.employees.map((emp: any) => [
        `"${emp.firstName} ${emp.lastName}"`,
        emp.department || 'N/A',
        emp.totalHours,
        emp.regularHours,
        emp.overtimeHours,
        emp.hourlyRate,
        emp.regularPay,
        emp.overtimePay,
        emp.totalPay
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const totals = payrollData?.totals || {};
  const employees = payrollData?.employees || [];

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Payroll Dashboard</h2>
            <p className="text-gray-600">
              {new Date(dateRange.startDate).toLocaleDateString()} - {new Date(dateRange.endDate).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">From:</label>
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                className="w-auto"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">To:</label>
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                className="w-auto"
              />
            </div>
            <Button onClick={exportPayrollData} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {alerts && alerts.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <AlertTriangle className="h-5 w-5" />
                Recent Alerts ({alerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alerts.slice(0, 5).map((alert: any) => (
                  <div key={alert.id} className="flex items-center justify-between p-2 bg-white rounded border">
                    <div>
                      <p className="text-sm font-medium">{alert.message}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(alert.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={
                      alert.alertType === 'late_clock_in' ? 'destructive' :
                      alert.alertType === 'overtime' ? 'default' : 'secondary'
                    }>
                      {alert.alertType.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Hours</p>
                  <p className="text-2xl font-bold">{totals.totalHours || '0'}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Employees</p>
                  <p className="text-2xl font-bold">{employees.length}</p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Regular Pay</p>
                  <p className="text-2xl font-bold">${totals.totalRegularPay || '0'}</p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Payroll</p>
                  <p className="text-2xl font-bold text-[#d73a31]">${totals.totalPay || '0'}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-[#d73a31]" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Employee Details Table */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Payroll Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Total Hours</TableHead>
                    <TableHead className="text-right">Regular Hours</TableHead>
                    <TableHead className="text-right">OT Hours</TableHead>
                    <TableHead className="text-right">Hourly Rate</TableHead>
                    <TableHead className="text-right">Regular Pay</TableHead>
                    <TableHead className="text-right">OT Pay</TableHead>
                    <TableHead className="text-right">Total Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee: any) => (
                    <TableRow key={employee.employeeId}>
                      <TableCell className="font-medium">
                        {employee.firstName} {employee.lastName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {employee.department || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{employee.totalHours}</TableCell>
                      <TableCell className="text-right">{employee.regularHours}</TableCell>
                      <TableCell className="text-right">
                        {parseFloat(employee.overtimeHours) > 0 ? (
                          <span className="text-orange-600 font-medium">{employee.overtimeHours}</span>
                        ) : (
                          employee.overtimeHours
                        )}
                      </TableCell>
                      <TableCell className="text-right">${employee.hourlyRate}</TableCell>
                      <TableCell className="text-right">${employee.regularPay}</TableCell>
                      <TableCell className="text-right">
                        {parseFloat(employee.overtimePay) > 0 ? (
                          <span className="text-orange-600 font-medium">${employee.overtimePay}</span>
                        ) : (
                          `$${employee.overtimePay}`
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold">${employee.totalPay}</TableCell>
                    </TableRow>
                  ))}
                  {employees.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                        No employee time entries found for the selected date range.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PayrollDashboard;