'use client';

import { formatDistanceToNow } from 'date-fns';
import { Mail, MapPin, SirenIcon as StreamIcon, Tag, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import type { EmployeeStatus, EmployeeSummary } from '@/types/employee';

import { useDashboard } from '../dashboard-context';

interface EmployeeDetailPanelProps {
  employee: EmployeeSummary | null;
  onClose: () => void;
  isOpen: boolean;
}

function getStatusColor(status: EmployeeStatus) {
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
}

function formatStatusLabel(status: EmployeeStatus) {
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
}

function formatEmploymentType(value: string | null) {
  if (!value) return '—';
  return value
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export function EmployeeDetailPanel({ employee, onClose, isOpen }: EmployeeDetailPanelProps) {
  const isMobile = useIsMobile();
  const { openViewStreamsModal, openEditEmployeeModal, openArchiveEmployeeModal, openCreateStreamModal } =
    useDashboard();

  const formattedStatus = employee ? getStatusColor(employee.status) : '';
  let invitedLabel: string | null = null;
  if (employee?.invitedAt) {
    try {
      invitedLabel = formatDistanceToNow(new Date(employee.invitedAt), { addSuffix: true });
    } catch {
      invitedLabel = null;
    }
  }

  const handleSelectForAction = (action: (selectedEmployee: EmployeeSummary) => void) => {
    if (!employee) return;
    action(employee);
  };

  if (!employee) {
    return null;
  }

  return (
    <Drawer
      direction={isMobile ? undefined : 'right'}
      modal={false}
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DrawerContent
        className={`max-h-full ${isMobile ? '' : 'fixed top-0 right-0 bottom-0 w-96 rounded-none border-l'}`}
        style={!isMobile ? { left: 'auto', right: 0, top: 0, bottom: 0, borderRadius: 0 } : {}}
      >
        <div className="absolute top-4 right-4 z-10">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className={`overflow-y-auto ${isMobile ? 'px-4 pt-12 pb-6' : 'px-6 pt-12 pb-6'}`}>
          <div className="space-y-4">
            <div>
              <DrawerTitle className="text-lg font-bold">{employee.name}</DrawerTitle>
              <p className="mt-1 text-xs text-muted-foreground">{employee.email ?? '—'}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className={formattedStatus} variant="secondary">
                {formatStatusLabel(employee.status)}
              </Badge>
              {invitedLabel && employee.status === 'invited' ? (
                <span className="text-xs text-muted-foreground">Invited {invitedLabel}</span>
              ) : null}
            </div>

            <div className="space-y-3 rounded-lg bg-muted/50 p-4">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Contact Information</p>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="truncate text-sm font-medium">{employee.email ?? '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="text-sm font-medium">{employee.location ?? '—'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-lg bg-muted/50 p-4">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Employment Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Department</p>
                  <p className="text-sm font-medium">{employee.department ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="text-sm font-medium">{formatEmploymentType(employee.employmentType)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Hourly Rate</p>
                  <p className="text-lg font-bold">
                    {employee.hourlyRateUsd != null ? `$${employee.hourlyRateUsd.toFixed(2)}/hr` : '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-lg bg-muted/50 p-4">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Wallet Information</p>
              <div className="space-y-2">
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Primary Wallet</p>
                  <code className="block truncate rounded border bg-background p-2 font-mono text-xs">
                    {employee.primaryWallet ?? '—'}
                  </code>
                </div>
              </div>
            </div>

            {employee.tags.length > 0 && (
              <div className="space-y-3 rounded-lg bg-muted/50 p-4">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {employee.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      <Tag className="mr-1 h-3 w-3" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3 rounded-lg bg-muted/50 p-4">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Linked Streams</p>
              <div className="flex items-center gap-2">
                <StreamIcon className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {employee.linkedStreams > 0 ? `${employee.linkedStreams} active stream(s)` : 'No active streams yet'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => handleSelectForAction(openViewStreamsModal)}>
                  View Streams
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleSelectForAction(openEditEmployeeModal)}>
                  Edit Details
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleSelectForAction((selectedEmployee) =>
                      openCreateStreamModal({ employeeId: selectedEmployee.id }),
                    )
                  }
                >
                  Create Stream
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleSelectForAction(openArchiveEmployeeModal)}>
                  Archive Employee
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
