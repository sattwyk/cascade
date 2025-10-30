'use client';

import { useCallback, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { CheckCircle2, ChevronRight, Copy } from 'lucide-react';
import { toast } from 'sonner';

import { inviteEmployee } from '@/app/dashboard/actions/employees';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { employmentTypeEnum } from '@/db/schema';
import type { EmployeeSummary } from '@/types/employee';

import { useDashboard } from '../dashboard-context';

type Step = 'profile' | 'settings' | 'review';

type InviteResult = {
  inviteUrl: string;
  inviteToken: string;
  expiresAt: string;
};

type EmploymentTypeValue = (typeof employmentTypeEnum.enumValues)[number];

const EMPLOYMENT_TYPE_OPTIONS: Array<{ value: EmploymentTypeValue; label: string }> = employmentTypeEnum.enumValues.map(
  (value) => ({
    value,
    label: value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
  }),
);

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddEmployeeModal({ isOpen, onClose }: AddEmployeeModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('profile');
  const { completeSetupStep, addEmployee } = useDashboard();
  const router = useRouter();

  // Profile step
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [employmentType, setEmploymentType] = useState<EmploymentTypeValue>('full_time');

  // Settings step
  const [hourlyWage, setHourlyWage] = useState('');
  const [tags, setTags] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);

  const inviteExpiresAt = useMemo(() => (inviteResult ? new Date(inviteResult.expiresAt) : null), [inviteResult]);
  const formattedExpiration = useMemo(() => {
    if (!inviteExpiresAt || Number.isNaN(inviteExpiresAt.getTime())) {
      return null;
    }
    try {
      return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(inviteExpiresAt);
    } catch {
      return inviteExpiresAt.toLocaleString();
    }
  }, [inviteExpiresAt]);

  const resetForm = () => {
    setCurrentStep('profile');
    setName('');
    setEmail('');
    setDepartment('');
    setLocation('');
    setEmploymentType('full_time');
    setHourlyWage('');
    setTags('');
    setInviteResult(null);
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
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await inviteEmployee({
        fullName: name,
        email,
        department,
        location,
        employmentType,
        hourlyRate: hourlyWage,
        tags,
      });

      if (!response.ok) {
        toast.error('Failed to send invitation', {
          description: response.error,
        });
        return;
      }

      setInviteResult(response.data);
      completeSetupStep('employeeAdded');
      const now = new Date().toISOString();
      const parsedTags = tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
      const optimisticEmployee: EmployeeSummary = {
        id: response.data.inviteToken ?? `invite-${Date.now()}`,
        name,
        email,
        status: 'invited',
        department: department || null,
        location: location || null,
        employmentType,
        primaryWallet: null,
        hourlyRateUsd: hourlyWage ? Number.parseFloat(hourlyWage) : null,
        linkedStreams: 0,
        invitedAt: now,
        createdAt: now,
        tags: parsedTags,
      };
      addEmployee(optimisticEmployee);
      router.refresh();
      toast.success('Invitation sent', {
        description: `${email} can now join Cascade.`,
      });
    } catch (error) {
      console.error('Failed to invite employee', error);
      toast.error('Failed to invite employee', {
        description: error instanceof Error ? error.message : 'Please check your information and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!inviteResult && (currentStep !== 'profile' || name)) {
      toast.info('Employee creation cancelled', {
        description: 'Your progress has been discarded.',
      });
    }
    resetForm();
    onClose();
  };

  const handleCopyInvite = useCallback(async () => {
    if (!inviteResult) return;
    try {
      await navigator.clipboard.writeText(inviteResult.inviteUrl);
      toast.success('Invite link copied to clipboard');
    } catch (error) {
      console.error('Failed to copy invite link', error);
      toast.error('Unable to copy invite link automatically', {
        description: 'Copy the link manually from the field below.',
      });
    }
  }, [inviteResult]);

  const isStepValid = () => {
    switch (currentStep) {
      case 'profile':
        return name && email && department && location && employmentType;
      case 'settings':
        return hourlyWage;
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
          <DialogTitle>Add Employee</DialogTitle>
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
                <p className="text-sm text-muted-foreground">Basic information about the employee</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="Engineering"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="San Francisco, CA"
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="employment-type">Employment Type</Label>
                    <Select
                      value={employmentType}
                      onValueChange={(value: EmploymentTypeValue) => setEmploymentType(value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select employment type" />
                      </SelectTrigger>
                      <SelectContent>
                        {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                <p className="text-sm text-muted-foreground">Wage and preferences</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hourly-wage">Hourly Wage (USD)</Label>
                  <Input
                    id="hourly-wage"
                    type="number"
                    value={hourlyWage}
                    onChange={(e) => setHourlyWage(e.target.value)}
                    placeholder="50.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="Senior, Backend, Full-time"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 'review' && (
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold">Review & Confirm</h3>
                <p className="text-sm text-muted-foreground">Verify all details before adding the employee</p>
              </div>

              <Card className="bg-muted/50">
                <CardContent className="space-y-3 pt-6">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{name || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium">{email || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Department</span>
                    <span className="font-medium">{department || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Employment Type</span>
                    <span className="font-medium">
                      {EMPLOYMENT_TYPE_OPTIONS.find((option) => option.value === employmentType)?.label ?? '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-medium">{location || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hourly Wage</span>
                    <span className="font-medium">{hourlyWage ? `$${hourlyWage}` : 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tags</span>
                    <span className="font-medium">{tags || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <span className="text-muted-foreground">Status</span>
                    <Badge
                      className={
                        inviteResult
                          ? 'border-blue-200 bg-blue-100 text-blue-700'
                          : 'border-emerald-200 bg-emerald-100 text-emerald-700'
                      }
                    >
                      {inviteResult ? 'Invited' : 'Ready to invite'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {inviteResult && (
                <Card>
                  <CardContent className="space-y-4 pt-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                      <div>
                        <p className="font-semibold text-foreground">Invitation sent</p>
                        <p className="text-sm text-muted-foreground">
                          We emailed <span className="font-medium text-foreground">{email}</span>. The link expires{' '}
                          {formattedExpiration ?? 'soon'}.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        value={inviteResult.inviteUrl}
                        readOnly
                        className="font-mono text-xs sm:flex-1"
                        aria-label="Invitation link"
                      />
                      <Button type="button" variant="outline" onClick={handleCopyInvite} className="sm:w-auto">
                        <Copy className="mr-2 h-4 w-4" />
                        Copy link
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 border-t border-border pt-6">
            {inviteResult ? (
              <>
                <Button variant="outline" onClick={handleClose} className="flex-1 bg-transparent">
                  Close
                </Button>
                <Button type="button" onClick={resetForm} className="flex-1 gap-2">
                  Invite another
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={currentStep === 'profile' ? handleClose : handleBack}
                  className="flex-1 bg-transparent"
                  disabled={isSubmitting}
                >
                  {currentStep === 'profile' ? 'Cancel' : 'Back'}
                </Button>
                <Button
                  onClick={currentStep === 'review' ? handleSubmit : handleNext}
                  disabled={!isStepValid() || isSubmitting}
                  className="flex-1 gap-2"
                >
                  {isSubmitting ? 'Sending...' : currentStep === 'review' ? 'Send invite' : 'Next'}
                  {!isSubmitting && currentStep !== 'review' && <ChevronRight className="h-4 w-4" />}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
