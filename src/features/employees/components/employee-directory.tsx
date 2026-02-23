'use client';

import { useMemo, useState } from 'react';

import { formatDistanceToNow } from 'date-fns';
import { Filter, Plus, Search } from 'lucide-react';

import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/core/ui/dropdown-menu';
import { EmptyState } from '@/core/ui/empty-state';
import { Input } from '@/core/ui/input';
import type { EmployeeSummary } from '@/types/employee';

interface EmployeeDirectoryProps {
  filterStatus: 'all' | 'ready' | 'draft' | 'invited' | 'archived';
  onFilterChange: (status: 'all' | 'ready' | 'draft' | 'invited' | 'archived') => void;
  onSelectEmployee: (employee: EmployeeSummary) => void;
  selectedEmployeeId: string | null;
  employees: EmployeeSummary[];
  onInviteEmployee: () => void;
}

export function EmployeeDirectory({
  filterStatus,
  onFilterChange,
  onSelectEmployee,
  selectedEmployeeId,
  employees,
  onInviteEmployee,
}: EmployeeDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEmployees = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return employees.filter((employee) => {
      if (filterStatus !== 'all' && employee.status !== filterStatus) return false;

      if (!normalizedQuery) return true;

      const haystacks = [
        employee.name,
        employee.email,
        employee.primaryWallet,
        employee.department,
        employee.location,
        employee.employmentType,
      ]
        .filter(Boolean)
        .map((value) => value!.toLowerCase());

      return haystacks.some((haystack) => haystack.includes(normalizedQuery));
    });
  }, [employees, filterStatus, searchQuery]);

  const getStatusColor = (status: EmployeeSummary['status']) => {
    switch (status) {
      case 'ready':
        return 'bg-emerald-500/10 text-emerald-700';
      case 'draft':
        return 'bg-amber-500/10 text-amber-700';
      case 'invited':
        return 'bg-blue-500/10 text-blue-700';
      case 'archived':
        return 'bg-gray-500/10 text-gray-700';
      default:
        return 'bg-gray-500/10 text-gray-700';
    }
  };

  const getStatusLabel = (status: EmployeeSummary['status']) => {
    switch (status) {
      case 'ready':
        return 'Ready';
      case 'draft':
        return 'Draft';
      case 'invited':
        return 'Invited';
      case 'archived':
        return 'Archived';
      default:
        return status;
    }
  };

  const getEmploymentTypeLabel = (employmentType: EmployeeSummary['employmentType']) => {
    if (!employmentType) return '—';
    return employmentType
      .split('_')
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle>Employee Directory</CardTitle>
          <div className="flex gap-2">
            <div className="relative flex-1 md:flex-none">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onFilterChange('all')}>
                  All {filterStatus === 'all' && '✓'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFilterChange('ready')}>
                  Ready {filterStatus === 'ready' && '✓'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFilterChange('draft')}>
                  Draft {filterStatus === 'draft' && '✓'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFilterChange('invited')}>
                  Invited {filterStatus === 'invited' && '✓'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFilterChange('archived')}>
                  Archived {filterStatus === 'archived' && '✓'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredEmployees.length === 0 ? (
          <EmptyState
            icon={<Plus className="h-12 w-12 text-muted-foreground" />}
            title="No employees found"
            description={
              filterStatus === 'all'
                ? 'Invite your first employee to get started'
                : `No ${filterStatus} employees at the moment`
            }
            action={
              filterStatus === 'all'
                ? {
                    label: 'Invite Employee',
                    onClick: onInviteEmployee,
                  }
                : undefined
            }
          />
        ) : (
          <div className="space-y-2">
            {filteredEmployees.map((employee) => (
              <button
                key={employee.id}
                onClick={() => onSelectEmployee(employee)}
                className={`w-full rounded-lg border p-4 text-left transition-colors ${
                  selectedEmployeeId === employee.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="truncate font-semibold">{employee.name}</h3>
                      <Badge className={getStatusColor(employee.status)} variant="secondary">
                        {getStatusLabel(employee.status)}
                      </Badge>
                      {employee.status === 'invited' && employee.invitedAt ? (
                        <span className="text-xs text-muted-foreground">
                          Invited {formatDistanceToNow(new Date(employee.invitedAt), { addSuffix: true })}
                        </span>
                      ) : null}
                    </div>
                    <p className="mb-3 text-sm text-muted-foreground">{employee.email ?? 'No email on file'}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Department</p>
                        <p className="font-medium">{employee.department ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Location</p>
                        <p className="font-medium">{employee.location ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Hourly Wage</p>
                        <p className="font-medium">
                          {employee.hourlyRateUsd != null ? `$${employee.hourlyRateUsd.toFixed(2)}` : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Linked Streams</p>
                        <p className="font-medium">{employee.linkedStreams}</p>
                      </div>
                      <div className="md:col-span-4 lg:col-span-1">
                        <p className="text-xs text-muted-foreground">Employment Type</p>
                        <p className="font-medium">{getEmploymentTypeLabel(employee.employmentType)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
