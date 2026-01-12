'use client';

import { useEffect, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

import { updateDashboardEmployee } from '@/app/dashboard/actions/employees';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInvalidateDashboardEmployeesQuery } from '@/features/dashboard/data-access/use-invalidate-dashboard-employees-query';
import type { EmployeeSummary } from '@/types/employee';

import { useDashboard } from '../dashboard-context';

type Step = 'profile' | 'settings' | 'review';

const EMPLOYMENT_TYPE_VALUES = ['full_time', 'part_time', 'contract', 'temporary', 'intern', 'other'] as const;

function normalizeEmploymentTypeInput(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  return EMPLOYMENT_TYPE_VALUES.includes(normalized as (typeof EMPLOYMENT_TYPE_VALUES)[number]) ? normalized : null;
}

function parseTagsInput(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employee: EmployeeSummary | null;
}

export function EditEmployeeModal({ isOpen, onClose, employeeId, employee }: EditEmployeeModalProps) {
  const { setSelectedEmployee } = useDashboard();
  const invalidateDashboardEmployeesQuery = useInvalidateDashboardEmployeesQuery();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState<Step>('profile');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [primaryWallet, setPrimaryWallet] = useState('');
  const [hourlyWage, setHourlyWage] = useState('');
  const [tags, setTags] = useState('');

  const hydrateFromEmployee = (source: EmployeeSummary | null) => {
    if (!source) {
      setName('');
      setEmail('');
      setDepartment('');
      setLocation('');
      setEmploymentType('');
      setPrimaryWallet('');
      setHourlyWage('');
      setTags('');
      return;
    }

    setName(source.name ?? '');
    setEmail(source.email ?? '');
    setDepartment(source.department ?? '');
    setLocation(source.location ?? '');
    setEmploymentType(
      source.employmentType
        ? source.employmentType
            .split('_')
            .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
            .join(' ')
        : '',
    );
    setPrimaryWallet(source.primaryWallet ?? '');
    setHourlyWage(source.hourlyRateUsd != null ? source.hourlyRateUsd.toString() : '');
    setTags(source.tags.join(', '));
  };

  useEffect(() => {
    if (!isOpen) return;
    hydrateFromEmployee(employee);
    setCurrentStep('profile');
  }, [employee, isOpen]);

  if (!employee) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Select an employee from the directory to edit their details.</p>
        </DialogContent>
      </Dialog>
    );
  }

  const resetForm = (nextEmployee?: EmployeeSummary | null) => {
    hydrateFromEmployee(nextEmployee ?? employee);
    setCurrentStep('profile');
  };

  const handleNext = () => {
    const steps: Step[] = ['profile', 'settings', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: Step[] = ['profile', 'settings', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    if (!name || !email || !department || !location || !hourlyWage) {
      toast.error('Missing required fields', {
        description: 'Please fill in all required fields.',
      });
      return;
    }

    if (!employeeId) {
      toast.error('Missing employee record', {
        description: 'Please re-select the employee and try again.',
      });
      return;
    }

    const normalizedEmploymentType = normalizeEmploymentTypeInput(employmentType);
    if (!normalizedEmploymentType) {
      toast.error('Invalid employment type', {
        description: 'Use one of: Full Time, Part Time, Contract, Temporary, Intern, Other.',
      });
      return;
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim();
    const normalizedDepartment = department.trim();
    const normalizedLocation = location.trim();
    const normalizedPrimaryWallet = primaryWallet.trim();

    if (
      !normalizedName ||
      !normalizedEmail ||
      !normalizedDepartment ||
      !normalizedLocation ||
      !normalizedPrimaryWallet
    ) {
      toast.error('Missing required fields', {
        description: 'Please fill in all required fields.',
      });
      return;
    }

    const parsedHourlyRate = Number.parseFloat(hourlyWage);
    if (!Number.isFinite(parsedHourlyRate) || parsedHourlyRate < 0) {
      toast.error('Invalid hourly wage', {
        description: 'Enter a valid hourly wage amount.',
      });
      return;
    }

    const payload = {
      employeeId,
      fullName: normalizedName,
      email: normalizedEmail,
      department: normalizedDepartment,
      location: normalizedLocation,
      employmentType: normalizedEmploymentType,
      primaryWallet: normalizedPrimaryWallet,
      hourlyRate: parsedHourlyRate,
      tags: parseTagsInput(tags),
    };

    setIsSubmitting(true);
    try {
      const result = await updateDashboardEmployee(payload);
      if (!result.ok) {
        toast.error('Failed to update employee', {
          description: result.error ?? 'Please try again or contact support.',
        });
        return;
      }

      if (employee) {
        const updatedEmployee: EmployeeSummary = {
          ...employee,
          name: payload.fullName,
          email: payload.email,
          department: payload.department,
          location: payload.location,
          employmentType: payload.employmentType,
          primaryWallet: payload.primaryWallet,
          hourlyRateUsd: payload.hourlyRate,
          tags: payload.tags,
        };
        setSelectedEmployee(updatedEmployee);
        resetForm(updatedEmployee);
      }

      invalidateDashboardEmployeesQuery();
      queryClient.invalidateQueries({ queryKey: ['dashboard-activity'] });

      toast.success('Employee updated successfully!', {
        description: `${payload.fullName || employee?.name || 'Employee'} (ID: ${employeeId}) has been updated.`,
      });
      onClose();
    } catch (error) {
      console.error('Failed to update employee', { employeeId, error });
      toast.error('Failed to update employee', {
        description: 'Please try again or contact support.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (currentStep !== 'profile') {
      toast.info('Edit cancelled', {
        description: 'Your changes have been discarded.',
      });
    }
    resetForm();
    onClose();
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 'profile':
        return name && email && department && location && employmentType;
      case 'settings':
        return hourlyWage && primaryWallet;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress indicator */}
          <div className="flex gap-2">
            {['profile', 'settings', 'review'].map((step, index) => (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full ${
                  ['profile', 'settings', 'review'].indexOf(currentStep) >= index ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Step 1: Profile */}
          {currentStep === 'profile' && (
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold">Employee Profile</h3>
                <p className="text-sm text-muted-foreground">Update employee information</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input id="department" value={department} onChange={(e) => setDepartment(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="employment-type">Employment Type</Label>
                    <Input
                      id="employment-type"
                      value={employmentType}
                      onChange={(e) => setEmploymentType(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Settings */}
          {currentStep === 'settings' && (
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold">Employment Settings</h3>
                <p className="text-sm text-muted-foreground">Update wage and preferences</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hourly-wage">Hourly Wage (USD)</Label>
                  <Input
                    id="hourly-wage"
                    type="number"
                    value={hourlyWage}
                    onChange={(e) => setHourlyWage(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primary-wallet">Primary Wallet</Label>
                  <Input
                    id="primary-wallet"
                    value={primaryWallet}
                    onChange={(e) => setPrimaryWallet(e.target.value)}
                    placeholder="Employee payout wallet"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 'review' && (
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold">Review & Confirm</h3>
                <p className="text-sm text-muted-foreground">Verify all changes before saving</p>
              </div>

              <Card className="bg-muted/50">
                <CardContent className="space-y-3 pt-6">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium">{email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Department</span>
                    <span className="font-medium">{department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Employment Type</span>
                    <span className="font-medium">{employmentType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Primary Wallet</span>
                    <span className="font-mono text-xs">{primaryWallet || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hourly Wage</span>
                    <span className="font-medium">{hourlyWage ? `$${hourlyWage}` : '—'}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 border-t border-border pt-6">
            <Button
              variant="outline"
              onClick={currentStep === 'profile' ? handleClose : handleBack}
              className="flex-1 bg-transparent"
            >
              {currentStep === 'profile' ? 'Cancel' : 'Back'}
            </Button>
            <Button
              onClick={currentStep === 'review' ? handleSubmit : handleNext}
              disabled={!isStepValid() || isSubmitting}
              className="flex-1 gap-2"
            >
              {isSubmitting ? 'Saving...' : currentStep === 'review' ? 'Save Changes' : 'Next'}
              {!isSubmitting && currentStep !== 'review' && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
