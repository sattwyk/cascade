'use client';

import { useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useWalletUi, type UiWalletAccount } from '@wallet-ui/react';
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
import { resolveMintDisplay } from '@/lib/solana/token-helpers';
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
  maximumFractionDigits: 6,
});

const HOURS_FORMATTER = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const DAYS_FORMATTER = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatTokenAmount(amount: number) {
  return TOKEN_FORMATTER.format(amount);
}

const AMOUNT_DECIMALS = 6;

type CreateStreamModalContentProps = CreateStreamModalProps & {
  account: UiWalletAccount;
  clusterId: string;
};

export function CreateStreamModal({ isOpen, onClose }: CreateStreamModalProps) {
  const { account, cluster } = useWalletUi();
  const clusterId = cluster?.id ?? 'devnet';

  if (!account) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Payment Stream</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Connect an employer wallet to create a payment stream.</p>
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return <CreateStreamModalContent isOpen={isOpen} onClose={onClose} account={account} clusterId={clusterId} />;
}

function CreateStreamModalContent({ isOpen, onClose, account, clusterId }: CreateStreamModalContentProps) {
  const [currentStep, setCurrentStep] = useState<Step>('employee');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [employeeAddressOverride, setEmployeeAddressOverride] = useState('');
  const [selectedTokenAccount, setSelectedTokenAccount] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [initialDeposit, setInitialDeposit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const router = useRouter();
  const { completeSetupStep, setAccountState, selectedEmployee } = useDashboard();
  const createStreamMutation = useCreateStreamMutation({ account });

  const employerAddress = useMemo<Address | null>(() => {
    if (account?.address) return account.address as Address;
    return null;
  }, [account?.address]);

  const employeesQuery = useDashboardEmployeesQuery({ enabled: isOpen });
  const tokenAccountsQuery = useGetTokenAccountsQuery({
    address: employerAddress ?? ('11111111111111111111111111111111' as Address),
    enabled: isOpen && Boolean(employerAddress),
  });

  const employeesError = (employeesQuery.error ?? null) as Error | null;

  const employeeOptions = useMemo(() => {
    const list = employeesQuery.data ?? [];
    return list
      .filter((employee) => Boolean(employee.primaryWallet))
      .map((employee) => ({
        id: employee.id,
        name: employee.name,
        wallet: employee.primaryWallet ?? '',
        email: employee.email,
      }));
  }, [employeesQuery.data]);

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
  const { symbol: tokenSymbol, detail: tokenDetail } = useMemo(() => resolveMintDisplay(selectedMint), [selectedMint]);
  const isGenericTokenSymbol = tokenSymbol.toLowerCase() === 'spl token' || tokenSymbol.toLowerCase() === 'token';
  const tokenAccountsError = (tokenAccountsQuery.error ?? null) as Error | null;

  const effectiveEmployeeAddress = employeeAddressOverride || selectedEmployeeOption?.wallet || '';

  useEffect(() => {
    if (!isOpen) return;
    if (selectedEmployee?.id) {
      setSelectedEmployeeId(selectedEmployee.id);
      setEmployeeAddressOverride('');
    }
  }, [isOpen, selectedEmployee]);

  useEffect(() => {
    if (!isOpen) return;
    if (!selectedEmployeeId && employeeOptions.length > 0) {
      setSelectedEmployeeId(employeeOptions[0]?.id ?? '');
    }
  }, [employeeOptions, isOpen, selectedEmployeeId]);

  useEffect(() => {
    if (!isOpen) return;
    if (!selectedTokenAccount && tokenAccountOptions.length > 0) {
      setSelectedTokenAccount(tokenAccountOptions[0]?.address ?? '');
    }
  }, [isOpen, selectedTokenAccount, tokenAccountOptions]);

  const economicsSummary = useMemo(() => {
    const parsedRate = Number.parseFloat(hourlyRate);
    const parsedDeposit = Number.parseFloat(initialDeposit);
    const roundedRate = Number.isFinite(parsedRate) ? Number(parsedRate.toFixed(AMOUNT_DECIMALS)) : NaN;
    const roundedDeposit = Number.isFinite(parsedDeposit) ? Number(parsedDeposit.toFixed(AMOUNT_DECIMALS)) : NaN;

    const validRate = Number.isFinite(roundedRate) && roundedRate > 0;
    const validDeposit = Number.isFinite(roundedDeposit) && roundedDeposit > 0;

    const spendPerDay = validRate ? roundedRate * 24 : null;
    const spendPerWeek = spendPerDay != null ? spendPerDay * 7 : null;
    const spendPerMonth = spendPerDay != null ? spendPerDay * 30 : null;
    const coverageHours = validRate && validDeposit ? roundedDeposit / roundedRate : null;
    const coverageDays = coverageHours != null ? coverageHours / 24 : null;

    return {
      rate: validRate ? roundedRate : 0,
      deposit: validDeposit ? roundedDeposit : 0,
      validRate,
      validDeposit,
      spendPerDay,
      spendPerWeek,
      spendPerMonth,
      coverageHours,
      coverageDays,
    };
  }, [hourlyRate, initialDeposit]);

  const runwayHoursDisplay =
    economicsSummary.coverageHours != null && Number.isFinite(economicsSummary.coverageHours)
      ? HOURS_FORMATTER.format(economicsSummary.coverageHours)
      : null;
  const runwayDaysDisplay =
    economicsSummary.coverageDays != null && Number.isFinite(economicsSummary.coverageDays)
      ? DAYS_FORMATTER.format(economicsSummary.coverageDays)
      : null;
  const dailySpendDisplay =
    economicsSummary.spendPerDay != null && Number.isFinite(economicsSummary.spendPerDay)
      ? formatTokenAmount(economicsSummary.spendPerDay)
      : null;
  const weeklySpendDisplay =
    economicsSummary.spendPerWeek != null && Number.isFinite(economicsSummary.spendPerWeek)
      ? formatTokenAmount(economicsSummary.spendPerWeek)
      : null;
  const monthlySpendDisplay =
    economicsSummary.spendPerMonth != null && Number.isFinite(economicsSummary.spendPerMonth)
      ? formatTokenAmount(economicsSummary.spendPerMonth)
      : null;

  const resetForm = () => {
    setCurrentStep('employee');
    setSelectedEmployeeId('');
    setEmployeeAddressOverride('');
    setSelectedTokenAccount('');
    setHourlyRate('');
    setInitialDeposit('');
    setSubmissionError(null);
    createStreamMutation.reset();
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

    if (!economicsSummary.validRate) {
      toast.error('Invalid hourly rate', {
        description: 'Enter an hourly rate greater than zero.',
      });
      return;
    }

    if (!economicsSummary.validDeposit) {
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
        employeeId: selectedEmployeeId || undefined,
        mint: selectedTokenAccountOption.mint as Address,
        employerTokenAccount: selectedTokenAccountOption.address as Address,
        hourlyRate: economicsSummary.rate,
        totalDeposit: economicsSummary.deposit,
        cluster: clusterId as 'devnet' | 'testnet' | 'mainnet' | 'localnet' | 'custom',
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
        return economicsSummary.validRate && economicsSummary.validDeposit;
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
                  {tokenAccountOptions.map((accountOption) => {
                    const mintDisplay = resolveMintDisplay(accountOption.mint);

                    return (
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
                          <div className="space-y-1">
                            <p className="font-medium">{mintDisplay.symbol}</p>
                            <div className="flex items-center gap-2">
                              {mintDisplay.detail ? (
                                <code className="text-xs text-muted-foreground">Mint {mintDisplay.detail}</code>
                              ) : null}
                              <code className="text-xs text-muted-foreground">
                                Account {ellipsify(accountOption.address, 4)}
                              </code>
                            </div>
                          </div>
                          <Badge variant="outline">{formatTokenAmount(accountOption.balance)}</Badge>
                        </div>
                      </button>
                    );
                  })}
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
                <Input
                  id="hourlyRate"
                  type="number"
                  min="0"
                  step="0.000001"
                  placeholder={`0.${'0'.repeat(AMOUNT_DECIMALS)}`}
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="initialDeposit">Initial Deposit</Label>
                <Input
                  id="initialDeposit"
                  type="number"
                  min="0"
                  step="0.000001"
                  placeholder={`0.${'0'.repeat(AMOUNT_DECIMALS)}`}
                  value={initialDeposit}
                  onChange={(e) => setInitialDeposit(e.target.value)}
                />
              </div>

              <div className="rounded-xl border border-dashed border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Quick math</p>
                <div className="mt-3 flex flex-col gap-2 text-xs leading-relaxed sm:flex-row sm:items-start sm:gap-6">
                  <div className="flex-1">
                    <span className="font-medium text-foreground">Hourly rate</span> controls the continuous trickle of{' '}
                    {isGenericTokenSymbol ? 'your token' : tokenSymbol}. Enter a number to reveal the spend cards below.
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-foreground">Deposit ÷ hourly rate</span> shows how long the stream
                    stays funded before another top up is needed.
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2 rounded-xl border bg-background/80 p-4 shadow-sm">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Daily Spend</p>
                  <div>
                    <p className="text-2xl font-semibold text-foreground">
                      {dailySpendDisplay ? dailySpendDisplay : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tokenSymbol}
                      {tokenDetail ? (
                        <code className="ml-1 rounded bg-muted px-1 py-px text-[10px] text-muted-foreground">
                          Mint {tokenDetail}
                        </code>
                      ) : null}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">Autostreamed every 24 hours.</p>
                </div>
                <div className="flex flex-col gap-2 rounded-xl border bg-background/80 p-4 shadow-sm">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Weekly Spend</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {weeklySpendDisplay ? weeklySpendDisplay : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">Seven days of continuous payout.</p>
                </div>
                <div className="flex flex-col gap-2 rounded-xl border bg-background/80 p-4 shadow-sm">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Monthly Spend</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {monthlySpendDisplay ? monthlySpendDisplay : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">Roughly thirty streaming days.</p>
                </div>
                <div className="flex flex-col gap-2 rounded-xl border bg-background/80 p-4 shadow-sm">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Funded Runway</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {runwayHoursDisplay
                      ? `${runwayHoursDisplay}h${runwayDaysDisplay ? ` · ${runwayDaysDisplay}d` : ''}`
                      : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">Top up before this window closes.</p>
                </div>
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
                    <p>{tokenSymbol}</p>
                    {tokenDetail ? <code className="text-xs text-muted-foreground">Mint {tokenDetail}</code> : null}
                    <code className="mt-1 block text-xs text-muted-foreground">
                      Account {ellipsify(selectedTokenAccountOption?.address ?? '', 6)}
                    </code>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Economics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>
                      Hourly Rate:{' '}
                      {economicsSummary.validRate
                        ? `${formatTokenAmount(economicsSummary.rate)} ${tokenSymbol}/hour`
                        : '—'}
                    </p>
                    <p>
                      Weekly Spend:{' '}
                      {economicsSummary.validRate && weeklySpendDisplay
                        ? `${weeklySpendDisplay} ${tokenSymbol}/week`
                        : '—'}
                    </p>
                    <p>
                      Monthly Spend:{' '}
                      {economicsSummary.validRate && monthlySpendDisplay
                        ? `${monthlySpendDisplay} ${tokenSymbol}/month`
                        : '—'}
                    </p>
                    <p>
                      Initial Deposit:{' '}
                      {economicsSummary.validDeposit
                        ? `${formatTokenAmount(economicsSummary.deposit)} ${tokenSymbol}`
                        : '—'}
                    </p>
                    <p>
                      Runway:{' '}
                      {economicsSummary.validRate && economicsSummary.validDeposit && runwayHoursDisplay
                        ? `${runwayHoursDisplay} hours${runwayDaysDisplay ? ` (${runwayDaysDisplay} days)` : ''}`
                        : '—'}
                    </p>
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
