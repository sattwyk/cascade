'use client';

import { useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useWalletUi, useWalletUiSigner, type UiWalletAccount } from '@wallet-ui/react';
import type { Address } from 'gill';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGetTokenAccountsQuery } from '@/features/account/data-access/use-get-token-accounts-query';
import { getErrorMessage } from '@/features/cascade/data-access/derive-cascade-pdas';
import { useCreateStreamMutation } from '@/features/cascade/data-access/use-create-stream-mutation';
import { useDashboardEmployeesQuery } from '@/features/dashboard/data-access/use-dashboard-employees-query';
import { AccountState } from '@/lib/enums';
import { ellipsify } from '@/lib/utils';

import { useDashboard } from '../dashboard-context';

type Step = 'employee' | 'token' | 'economics' | 'review';

interface CreateStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ParsedTokenAccountRaw = {
  pubkey: string;
  account?: {
    data?: {
      parsed?: {
        info?: {
          mint?: string;
          tokenAmount?: {
            amount?: string;
            decimals?: number;
            uiAmount?: number | null;
            uiAmountString?: string | null;
          };
        };
      };
    };
  };
};

type TokenAccountOption = {
  address: string;
  mint: string;
  balance: number;
};

const TOKEN_FORMATTER = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const KNOWN_MINT_LABELS: Record<string, string> = {
  So11111111111111111111111111111111111111112: 'wSOL',
};

function formatTokenAmount(amount: number) {
  return TOKEN_FORMATTER.format(amount);
}

function getMintLabel(mint: string) {
  if (!mint) return 'Unknown mint';
  return KNOWN_MINT_LABELS[mint] ?? ellipsify(mint, 4);
}

export function CreateStreamModal({ isOpen, onClose }: CreateStreamModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('employee');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [employeeAddressOverride, setEmployeeAddressOverride] = useState('');
  const [selectedTokenAccount, setSelectedTokenAccount] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [initialDeposit, setInitialDeposit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const router = useRouter();
  const { completeSetupStep, setAccountState, selectedEmployee, setSelectedEmployee } = useDashboard();
  const { account } = useWalletUi();
  const signer = useWalletUiSigner({ account });
  const createStreamMutation = useCreateStreamMutation({ account: account as UiWalletAccount });

  const employerAddress = useMemo<Address | null>(() => {
    if (signer?.address) return signer.address as Address;
    if (account?.address) return account.address as Address;
    return null;
  }, [account?.address, signer?.address]);

  const employeesQuery = useDashboardEmployeesQuery({ enabled: isOpen });
  const employeesList = useMemo(() => employeesQuery.data ?? [], [employeesQuery.data]);
  const tokenAccountsQuery = useGetTokenAccountsQuery({
    address: employerAddress ?? ('11111111111111111111111111111111' as Address),
    enabled: isOpen && Boolean(employerAddress),
  });

  const employeesError = (employeesQuery.error ?? null) as Error | null;

  const employeeOptions = useMemo(() => {
    return employeesList
      .filter((employee) => Boolean(employee.primaryWallet))
      .map((employee) => ({
        id: employee.id,
        name: employee.name,
        wallet: employee.primaryWallet ?? '',
        email: employee.email,
      }));
  }, [employeesList]);

  const selectedEmployeeRecord = useMemo(
    () => employeesList.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [employeesList, selectedEmployeeId],
  );

  const tokenAccountOptions = useMemo(() => {
    if (!tokenAccountsQuery.data) return [] as TokenAccountOption[];

    return (tokenAccountsQuery.data as Array<ParsedTokenAccountRaw>).flatMap((entry) => {
      const info = entry.account?.data?.parsed?.info;
      if (!info?.mint || !info?.tokenAmount) return [];

      const decimals = info.tokenAmount.decimals ?? 0;
      const uiAmountString =
        info.tokenAmount.uiAmountString ??
        (info.tokenAmount.uiAmount != null ? info.tokenAmount.uiAmount.toString() : undefined);
      const fallbackAmount = info.tokenAmount.amount ? Number(info.tokenAmount.amount) / Math.pow(10, decimals) : 0;
      const parsedAmount = uiAmountString ? Number.parseFloat(uiAmountString) : fallbackAmount;

      if (!Number.isFinite(parsedAmount)) return [];

      return [
        {
          address: entry.pubkey,
          mint: info.mint,
          balance: parsedAmount,
        },
      ];
    });
  }, [tokenAccountsQuery.data]);

  const selectedEmployeeOption = useMemo(
    () => employeeOptions.find((option) => option.id === selectedEmployeeId) ?? null,
    [employeeOptions, selectedEmployeeId],
  );

  const selectedTokenAccountOption = useMemo(
    () => tokenAccountOptions.find((option) => option.address === selectedTokenAccount) ?? null,
    [selectedTokenAccount, tokenAccountOptions],
  );

  const selectedMint = selectedTokenAccountOption?.mint ?? '';
  const tokenAccountsError = (tokenAccountsQuery.error ?? null) as Error | null;

  const effectiveEmployeeAddress = employeeAddressOverride || selectedEmployeeOption?.wallet || '';

  useEffect(() => {
    if (!isOpen) return;
    if (selectedEmployee?.id) {
      const existsInOptions = employeeOptions.some((employee) => employee.id === selectedEmployee.id);
      if (existsInOptions) {
        setSelectedEmployeeId(selectedEmployee.id);
        setEmployeeAddressOverride('');
      } else if (selectedEmployee.primaryWallet) {
        setSelectedEmployeeId('');
        setEmployeeAddressOverride(selectedEmployee.primaryWallet);
      }
    }
  }, [employeeOptions, isOpen, selectedEmployee]);

  useEffect(() => {
    if (!isOpen) return;
    if (selectedEmployeeId) {
      const existsInOptions = employeeOptions.some((employee) => employee.id === selectedEmployeeId);
      if (!existsInOptions) {
        const fallbackId = employeeOptions[0]?.id ?? '';
        setSelectedEmployeeId(fallbackId);
        if (fallbackId) {
          const fallbackRecord = employeesList.find((employee) => employee.id === fallbackId) ?? null;
          setSelectedEmployee(fallbackRecord);
          setEmployeeAddressOverride('');
        }
      }
    } else if (!employeeAddressOverride && employeeOptions.length > 0) {
      const fallbackId = employeeOptions[0]?.id ?? '';
      setSelectedEmployeeId(fallbackId);
      const fallbackRecord = employeesList.find((employee) => employee.id === fallbackId) ?? null;
      setSelectedEmployee(fallbackRecord);
    }
  }, [employeeAddressOverride, employeeOptions, employeesList, isOpen, selectedEmployeeId, setSelectedEmployee]);

  useEffect(() => {
    if (!isOpen) return;
    if (!selectedTokenAccount && tokenAccountOptions.length > 0) {
      setSelectedTokenAccount(tokenAccountOptions[0]?.address ?? '');
    }
  }, [isOpen, selectedTokenAccount, tokenAccountOptions]);

  useEffect(() => {
    if (!isOpen) return;
    if (employeeAddressOverride) {
      setSelectedEmployee(null);
      return;
    }
    setSelectedEmployee(selectedEmployeeRecord);
  }, [employeeAddressOverride, isOpen, selectedEmployeeRecord, setSelectedEmployee]);

  const calculateRunway = () => {
    if (!hourlyRate || !initialDeposit) return 0;
    return Math.floor((Number.parseFloat(initialDeposit) / Number.parseFloat(hourlyRate)) * 24);
  };

  const resetForm = () => {
    setCurrentStep('employee');
    setSelectedEmployeeId('');
    setEmployeeAddressOverride('');
    setSelectedTokenAccount('');
    setHourlyRate('');
    setInitialDeposit('');
    setSubmissionError(null);
    createStreamMutation.reset();
    setSelectedEmployee(null);
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
    if (!account?.address) {
      toast.error('Connect your employer wallet', {
        description: 'Link your treasury wallet before creating a stream.',
      });
      return;
    }

    if (!effectiveEmployeeAddress) {
      toast.error('Select an employee', {
        description: 'Choose an employee with a wallet address or provide one manually.',
      });
      return;
    }

    if (!selectedTokenAccountOption) {
      toast.error('Select a token account', {
        description: 'Choose a funded token account for the stream deposit.',
      });
      return;
    }

    const parsedHourlyRate = Number.parseFloat(hourlyRate || '0');
    const parsedDeposit = Number.parseFloat(initialDeposit || '0');

    if (!Number.isFinite(parsedHourlyRate) || parsedHourlyRate <= 0) {
      toast.error('Invalid hourly rate', {
        description: 'Enter an hourly rate greater than zero.',
      });
      return;
    }

    if (!Number.isFinite(parsedDeposit) || parsedDeposit <= 0) {
      toast.error('Invalid deposit amount', {
        description: 'Enter an initial deposit greater than zero.',
      });
      return;
    }

    setSubmissionError(null);
    setIsSubmitting(true);
    try {
      await createStreamMutation.mutateAsync({
        employee: effectiveEmployeeAddress as Address,
        mint: selectedTokenAccountOption.mint as Address,
        employerTokenAccount: selectedTokenAccountOption.address as Address,
        hourlyRate: parsedHourlyRate,
        totalDeposit: parsedDeposit,
      });
      toast.success('Stream created successfully!', {
        description: `Payment stream for ${selectedEmployeeOption?.name ?? ellipsify(effectiveEmployeeAddress, 4)} has been created.`,
      });
      setAccountState(AccountState.FIRST_STREAM_CREATED);
      completeSetupStep('streamCreated');
      router.refresh();
      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to create stream', error);
      const message = getErrorMessage(error);
      setSubmissionError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (currentStep !== 'employee' || selectedEmployeeId || employeeAddressOverride) {
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
        return Boolean(effectiveEmployeeAddress) && !employeesQuery.isLoading;
      case 'token':
        return Boolean(selectedTokenAccount) && !tokenAccountsQuery.isLoading && !tokenAccountsError;
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

              {employeesError ? (
                <p className="text-sm text-destructive">{employeesError.message}</p>
              ) : employeesQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading employees…</p>
              ) : employeeOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No employees with connected wallets found.</p>
              ) : (
                <div className="space-y-2">
                  {employeeOptions.map((emp) => (
                    <button
                      key={emp.id}
                      onClick={() => {
                        setSelectedEmployeeId(emp.id);
                        setEmployeeAddressOverride('');
                        const employeeRecord = employeesList.find((employee) => employee.id === emp.id) ?? null;
                        setSelectedEmployee(employeeRecord);
                      }}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        selectedEmployeeId === emp.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <p className="font-medium">{emp.name}</p>
                      <code className="text-xs text-muted-foreground">{ellipsify(emp.wallet, 6)}</code>
                      {emp.email ? <p className="mt-1 text-xs text-muted-foreground">{emp.email}</p> : null}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="employeeAddress">Wallet address override</Label>
                <Input
                  id="employeeAddress"
                  placeholder="Enter wallet address"
                  value={employeeAddressOverride}
                  onChange={(event) => setEmployeeAddressOverride(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Use this field if the employee list is empty or you need to stream to an address directly.
                </p>
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

              {tokenAccountsError ? (
                <p className="text-sm text-destructive">{tokenAccountsError.message}</p>
              ) : tokenAccountsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading token accounts…</p>
              ) : tokenAccountOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No token accounts found for the connected employer wallet. Fund an account before creating a stream.
                </p>
              ) : (
                <div className="space-y-2">
                  {tokenAccountOptions.map((accountOption) => (
                    <button
                      key={accountOption.address}
                      onClick={() => setSelectedTokenAccount(accountOption.address)}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        selectedTokenAccount === accountOption.address
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{getMintLabel(accountOption.mint)}</p>
                          <code className="text-xs text-muted-foreground">{ellipsify(accountOption.address, 6)}</code>
                        </div>
                        <Badge variant="outline">{formatTokenAmount(accountOption.balance)}</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
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
                    <p>{selectedEmployeeOption?.name ?? ellipsify(effectiveEmployeeAddress, 6)}</p>
                    <code className="text-xs text-muted-foreground">{ellipsify(effectiveEmployeeAddress, 6)}</code>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Token</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{getMintLabel(selectedMint)}</p>
                    <code className="text-xs text-muted-foreground">
                      {ellipsify(selectedTokenAccountOption?.address ?? '', 6)}
                    </code>
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

                {submissionError ? (
                  <Card>
                    <CardContent>
                      <p className="text-sm text-destructive">{submissionError}</p>
                    </CardContent>
                  </Card>
                ) : null}
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
