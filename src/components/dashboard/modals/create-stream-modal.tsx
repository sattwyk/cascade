'use client';

import { useState } from 'react';

import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AccountState } from '@/lib/enums';

import { useDashboard } from '../dashboard-context';

type Step = 'employee' | 'token' | 'economics' | 'review';

interface CreateStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateStreamModal({ isOpen, onClose }: CreateStreamModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('employee');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedMint, setSelectedMint] = useState('USDC');
  const [hourlyRate, setHourlyRate] = useState('');
  const [initialDeposit, setInitialDeposit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { completeSetupStep, setAccountState } = useDashboard();

  const employees = [
    { id: '1', name: 'Alice Johnson', address: '7xL...abc' },
    { id: '2', name: 'Bob Smith', address: '7xL...def' },
    { id: '3', name: 'Carol Davis', address: '7xL...ghi' },
  ];

  const mints = [
    { id: 'USDC', name: 'USDC', balance: 8200 },
    { id: 'USDT', name: 'USDT', balance: 2500 },
  ];

  const calculateRunway = () => {
    if (!hourlyRate || !initialDeposit) return 0;
    return Math.floor((Number.parseFloat(initialDeposit) / Number.parseFloat(hourlyRate)) * 24);
  };

  const resetForm = () => {
    setCurrentStep('employee');
    setSelectedEmployee('');
    setSelectedMint('USDC');
    setHourlyRate('');
    setInitialDeposit('');
  };

  const handleNext = () => {
    const steps: Step[] = ['employee', 'token', 'economics', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: Step[] = ['employee', 'token', 'economics', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast.success('Stream created successfully!', {
        description: `Payment stream for ${employees.find((e) => e.id === selectedEmployee)?.name} has been created.`,
      });
      setAccountState(AccountState.FIRST_STREAM_CREATED);
      completeSetupStep('streamCreated');
      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to create stream', error);
      toast.error('Failed to create stream', {
        description: 'Please try again or contact support.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (currentStep !== 'employee' || selectedEmployee) {
      toast.info('Stream creation cancelled', {
        description: 'Your progress has been discarded.',
      });
    }
    resetForm();
    onClose();
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 'employee':
        return selectedEmployee !== '';
      case 'token':
        return selectedMint !== '';
      case 'economics':
        return hourlyRate && initialDeposit;
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
          <DialogTitle>Create Payment Stream</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress indicator */}
          <div className="flex gap-2">
            {['employee', 'token', 'economics', 'review'].map((step, index) => (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full ${
                  ['employee', 'token', 'economics', 'review'].indexOf(currentStep) >= index ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Step 1: Employee Selection */}
          {currentStep === 'employee' && (
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold">Select Employee</h3>
                <p className="text-sm text-muted-foreground">Choose an employee or paste their wallet address</p>
              </div>

              <div className="space-y-2">
                {employees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedEmployee(emp.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      selectedEmployee === emp.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <p className="font-medium">{emp.name}</p>
                    <code className="text-xs text-muted-foreground">{emp.address}</code>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Token Selection */}
          {currentStep === 'token' && (
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold">Select Token</h3>
                <p className="text-sm text-muted-foreground">Choose a token for the payment stream</p>
              </div>

              <div className="space-y-2">
                {mints.map((mint) => (
                  <button
                    key={mint.id}
                    onClick={() => setSelectedMint(mint.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      selectedMint === mint.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <p className="font-medium">{mint.name}</p>
                    <Badge variant="outline" className="mt-1">
                      {mint.balance}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Economics */}
          {currentStep === 'economics' && (
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold">Set Economics</h3>
                <p className="text-sm text-muted-foreground">Enter the hourly rate and initial deposit</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hourlyRate">Hourly Rate</Label>
                <Input id="hourlyRate" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="initialDeposit">Initial Deposit</Label>
                <Input id="initialDeposit" value={initialDeposit} onChange={(e) => setInitialDeposit(e.target.value)} />
              </div>

              <div>
                <p className="font-semibold">Runway: {calculateRunway()} hours</p>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 'review' && (
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold">Review</h3>
                <p className="text-sm text-muted-foreground">Please review your payment stream details</p>
              </div>

              <div className="space-y-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Employee</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{employees.find((e) => e.id === selectedEmployee)?.name}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Token</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{mints.find((m) => m.id === selectedMint)?.name}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Economics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>Hourly Rate: {hourlyRate}</p>
                    <p>Initial Deposit: {initialDeposit}</p>
                    <p>Runway: {calculateRunway()} hours</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <Button onClick={handleBack} disabled={currentStep === 'employee' || isSubmitting} className="px-4 py-2">
              Back
            </Button>
            <Button
              onClick={currentStep === 'review' ? handleSubmit : handleNext}
              disabled={!isStepValid() || isSubmitting}
              className="px-4 py-2"
            >
              {currentStep === 'review' ? (isSubmitting ? 'Creating...' : 'Create Stream') : 'Next'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
