'use client';

import { useMemo, useReducer } from 'react';

import { useRouter } from 'next/navigation';

import { useWalletUi, type UiWalletAccount } from '@wallet-ui/react';
import type { Address } from 'gill';
import { toast } from 'sonner';

import { AccountState } from '@/core/enums';
import { resolveMintDisplay } from '@/core/solana/token-helpers';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/core/ui/dialog';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import { ellipsify } from '@/core/utils';
import { useGetTokenAccountsQuery } from '@/features/account/client/queries/use-get-token-accounts-query';
import { useDashboardEmployeesQuery } from '@/features/employees/client/queries/use-dashboard-employees-query';
import { useDashboard } from '@/features/organization/components/layout/employer-dashboard-context';
import { useCreateStreamMutation } from '@/features/streams/client/mutations/use-create-stream-mutation';
import { getErrorMessage } from '@/features/streams/client/utils/derive-cascade-pdas';
import { SUPPORTED_STABLECOIN_DECIMALS } from '@/features/streams/client/utils/mint-decimals';

type Step = 'employee' | 'token' | 'economics' | 'review';
const STREAM_STEPS: Step[] = ['employee', 'token', 'economics', 'review'];

interface CreateStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmployeeId?: string;
}

type CreateStreamModalState = {
  currentStep: Step;
  selectedEmployeeId: string;
  employeeAddressOverride: string;
  selectedTokenAccount: string;
  hourlyRate: string;
  initialDeposit: string;
  isSubmitting: boolean;
  submissionError: string | null;
};

type CreateStreamModalAction =
  | { type: 'patch'; patch: Partial<CreateStreamModalState> }
  | { type: 'reset' }
  | { type: 'next-step' }
  | { type: 'previous-step' };

function createInitialCreateStreamModalState(initialEmployeeId?: string): CreateStreamModalState {
  return {
    currentStep: 'employee',
    selectedEmployeeId: initialEmployeeId ?? '',
    employeeAddressOverride: '',
    selectedTokenAccount: '',
    hourlyRate: '',
    initialDeposit: '',
    isSubmitting: false,
    submissionError: null,
  };
}

function createStreamModalReducer(
  state: CreateStreamModalState,
  action: CreateStreamModalAction,
): CreateStreamModalState {
  switch (action.type) {
    case 'patch':
      return { ...state, ...action.patch };
    case 'reset':
      return {
        ...state,
        currentStep: 'employee',
        selectedEmployeeId: '',
        employeeAddressOverride: '',
        selectedTokenAccount: '',
        hourlyRate: '',
        initialDeposit: '',
        isSubmitting: false,
        submissionError: null,
      };
    case 'next-step': {
      const currentIndex = STREAM_STEPS.indexOf(state.currentStep);
      if (currentIndex >= STREAM_STEPS.length - 1) return state;
      return { ...state, currentStep: STREAM_STEPS[currentIndex + 1] };
    }
    case 'previous-step': {
      const currentIndex = STREAM_STEPS.indexOf(state.currentStep);
      if (currentIndex <= 0) return state;
      return { ...state, currentStep: STREAM_STEPS[currentIndex - 1] };
    }
    default:
      return state;
  }
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
  decimals: number;
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

type EmployeeOption = {
  id: string;
  name: string;
  wallet: string;
  email: string | null;
};

type EconomicsSummary = {
  rate: number;
  deposit: number;
  validRate: boolean;
  validDeposit: boolean;
  spendPerDay: number | null;
  spendPerWeek: number | null;
  spendPerMonth: number | null;
  coverageHours: number | null;
  coverageDays: number | null;
};

function buildEmployeeOptions(
  employees: Array<{ id: string; name: string; primaryWallet: string | null; email: string | null }>,
): EmployeeOption[] {
  return employees
    .filter((employee) => Boolean(employee.primaryWallet))
    .map((employee) => ({
      id: employee.id,
      name: employee.name,
      wallet: employee.primaryWallet ?? '',
      email: employee.email ?? null,
    }));
}

function buildTokenAccountOptions(rawTokenAccounts: unknown): TokenAccountOption[] {
  if (!rawTokenAccounts) return [];
  return (rawTokenAccounts as Array<ParsedTokenAccountRaw>).flatMap((entry) => {
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
        decimals,
      },
    ];
  });
}

function buildEconomicsSummary(hourlyRate: string, initialDeposit: string): EconomicsSummary {
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
}

function isCreateStreamStepValid({
  currentStep,
  effectiveEmployeeAddress,
  isEmployeesLoading,
  selectedTokenAccountOption,
  isTokenAccountsLoading,
  tokenAccountsError,
  economicsSummary,
}: {
  currentStep: Step;
  effectiveEmployeeAddress: string;
  isEmployeesLoading: boolean;
  selectedTokenAccountOption: TokenAccountOption | null;
  isTokenAccountsLoading: boolean;
  tokenAccountsError: Error | null;
  economicsSummary: EconomicsSummary;
}) {
  switch (currentStep) {
    case 'employee':
      return Boolean(effectiveEmployeeAddress) && !isEmployeesLoading;
    case 'token':
      return Boolean(selectedTokenAccountOption) && !isTokenAccountsLoading && !tokenAccountsError;
    case 'economics':
      return economicsSummary.validRate && economicsSummary.validDeposit;
    case 'review':
      return true;
    default:
      return false;
  }
}

function CreateStreamStepProgress({ currentStep }: { currentStep: Step }) {
  return (
    <div className="flex gap-2">
      {STREAM_STEPS.map((step, index) => (
        <div
          key={step}
          className={`h-1 flex-1 rounded-full ${STREAM_STEPS.indexOf(currentStep) >= index ? 'bg-primary' : 'bg-muted'}`}
        />
      ))}
    </div>
  );
}

function EmployeeSelectionStep({
  employeesError,
  isEmployeesLoading,
  employeeOptions,
  resolvedSelectedEmployeeId,
  employeeAddressOverride,
  onSelectEmployee,
  onEmployeeAddressOverrideChange,
}: {
  employeesError: Error | null;
  isEmployeesLoading: boolean;
  employeeOptions: EmployeeOption[];
  resolvedSelectedEmployeeId: string;
  employeeAddressOverride: string;
  onSelectEmployee: (id: string) => void;
  onEmployeeAddressOverrideChange: (value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 font-semibold">Choose Recipient</h3>
        <p className="text-sm text-muted-foreground">Select an employee or paste a wallet address.</p>
      </div>

      {employeesError ? (
        <p className="text-sm text-destructive">{employeesError.message}</p>
      ) : isEmployeesLoading ? (
        <p className="text-sm text-muted-foreground">Loading employees…</p>
      ) : employeeOptions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No employees with connected wallets found.</p>
      ) : (
        <div className="space-y-2">
          {employeeOptions.map((emp) => (
            <button
              key={emp.id}
              onClick={() => onSelectEmployee(emp.id)}
              className={`w-full rounded-lg border p-3 text-left transition-colors ${
                resolvedSelectedEmployeeId === emp.id
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
        <Label htmlFor="employeeAddress">Wallet address (optional)</Label>
        <Input
          id="employeeAddress"
          placeholder="Enter wallet address"
          value={employeeAddressOverride}
          onChange={(event) => onEmployeeAddressOverrideChange(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">Use this if the person is not listed above.</p>
      </div>
    </div>
  );
}

function TokenSelectionStep({
  tokenAccountsError,
  isTokenAccountsLoading,
  tokenAccountOptions,
  resolvedSelectedTokenAccount,
  onSelectTokenAccount,
}: {
  tokenAccountsError: Error | null;
  isTokenAccountsLoading: boolean;
  tokenAccountOptions: TokenAccountOption[];
  resolvedSelectedTokenAccount: string;
  onSelectTokenAccount: (tokenAccountAddress: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 font-semibold">Select Token</h3>
        <p className="text-sm text-muted-foreground">Choose which token to pay with.</p>
      </div>

      {tokenAccountsError ? (
        <p className="text-sm text-destructive">{tokenAccountsError.message}</p>
      ) : isTokenAccountsLoading ? (
        <p className="text-sm text-muted-foreground">Loading token accounts…</p>
      ) : tokenAccountOptions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No token account found for this wallet. Top up your wallet first, then come back and continue.
        </p>
      ) : (
        <div className="space-y-2">
          {tokenAccountOptions.map((accountOption) => {
            const mintDisplay = resolveMintDisplay(accountOption.mint);
            return (
              <button
                key={accountOption.address}
                onClick={() => onSelectTokenAccount(accountOption.address)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  resolvedSelectedTokenAccount === accountOption.address
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
                      <code className="text-xs text-muted-foreground">Decimals {accountOption.decimals}</code>
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
  );
}

function EconomicsStep({
  hourlyRate,
  initialDeposit,
  onHourlyRateChange,
  onInitialDepositChange,
  isGenericTokenSymbol,
  tokenSymbol,
  tokenDetail,
  dailySpendDisplay,
  weeklySpendDisplay,
  monthlySpendDisplay,
  runwayHoursDisplay,
  runwayDaysDisplay,
}: {
  hourlyRate: string;
  initialDeposit: string;
  onHourlyRateChange: (value: string) => void;
  onInitialDepositChange: (value: string) => void;
  isGenericTokenSymbol: boolean;
  tokenSymbol: string;
  tokenDetail: string | null;
  dailySpendDisplay: string | null;
  weeklySpendDisplay: string | null;
  monthlySpendDisplay: string | null;
  runwayHoursDisplay: string | null;
  runwayDaysDisplay: string | null;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 font-semibold">Set Pay & Budget</h3>
        <p className="text-sm text-muted-foreground">Enter the hourly pay rate and starting balance.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="hourlyRate">Hourly pay rate</Label>
        <Input
          id="hourlyRate"
          type="number"
          min="0"
          step="0.000001"
          placeholder={`0.${'0'.repeat(AMOUNT_DECIMALS)}`}
          value={hourlyRate}
          onChange={(e) => onHourlyRateChange(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="initialDeposit">Starting balance</Label>
        <Input
          id="initialDeposit"
          type="number"
          min="0"
          step="0.000001"
          placeholder={`0.${'0'.repeat(AMOUNT_DECIMALS)}`}
          value={initialDeposit}
          onChange={(e) => onInitialDepositChange(e.target.value)}
        />
      </div>

      <div className="rounded-xl border border-dashed border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">How this works</p>
        <div className="mt-3 flex flex-col gap-2 text-xs leading-relaxed sm:flex-row sm:items-start sm:gap-6">
          <div className="flex-1">
            <span className="font-medium text-foreground">Hourly pay rate</span> is how much the employee earns per hour
            in {isGenericTokenSymbol ? 'your token' : tokenSymbol}.
          </div>
          <div className="flex-1">
            <span className="font-medium text-foreground">Starting balance ÷ hourly pay rate</span> tells you how long
            the stream will run before you need to top it up.
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-xl border bg-background/80 p-4 shadow-sm">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Daily payout</p>
          <div>
            <p className="text-2xl font-semibold text-foreground">{dailySpendDisplay ? dailySpendDisplay : '—'}</p>
            <p className="text-xs text-muted-foreground">
              {tokenSymbol}
              {tokenDetail ? (
                <code className="ml-1 rounded bg-muted px-1 py-px text-[10px] text-muted-foreground">
                  Mint {tokenDetail}
                </code>
              ) : null}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">Estimated amount paid over 24 hours.</p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl border bg-background/80 p-4 shadow-sm">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Weekly payout</p>
          <p className="text-2xl font-semibold text-foreground">{weeklySpendDisplay ? weeklySpendDisplay : '—'}</p>
          <p className="text-xs text-muted-foreground">Estimated amount paid over 7 days.</p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl border bg-background/80 p-4 shadow-sm">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Monthly payout</p>
          <p className="text-2xl font-semibold text-foreground">{monthlySpendDisplay ? monthlySpendDisplay : '—'}</p>
          <p className="text-xs text-muted-foreground">Estimated amount paid over 30 days.</p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl border bg-background/80 p-4 shadow-sm">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">How long balance lasts</p>
          <p className="text-2xl font-semibold text-foreground">
            {runwayHoursDisplay ? `${runwayHoursDisplay}h${runwayDaysDisplay ? ` · ${runwayDaysDisplay}d` : ''}` : '—'}
          </p>
          <p className="text-xs text-muted-foreground">Top up before this time runs out.</p>
        </div>
      </div>
    </div>
  );
}

function ReviewStep({
  selectedEmployeeOption,
  effectiveEmployeeAddress,
  tokenSymbol,
  tokenDetail,
  selectedTokenAccountOption,
  economicsSummary,
  weeklySpendDisplay,
  monthlySpendDisplay,
  runwayHoursDisplay,
  runwayDaysDisplay,
  submissionError,
}: {
  selectedEmployeeOption: EmployeeOption | null;
  effectiveEmployeeAddress: string;
  tokenSymbol: string;
  tokenDetail: string | null;
  selectedTokenAccountOption: TokenAccountOption | null;
  economicsSummary: EconomicsSummary;
  weeklySpendDisplay: string | null;
  monthlySpendDisplay: string | null;
  runwayHoursDisplay: string | null;
  runwayDaysDisplay: string | null;
  submissionError: string | null;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 font-semibold">Review</h3>
        <p className="text-sm text-muted-foreground">Double-check these details before you create the stream.</p>
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
            <CardTitle>Pay & Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Hourly pay rate:{' '}
              {economicsSummary.validRate ? `${formatTokenAmount(economicsSummary.rate)} ${tokenSymbol}/hour` : '—'}
            </p>
            <p>
              Weekly payout:{' '}
              {economicsSummary.validRate && weeklySpendDisplay ? `${weeklySpendDisplay} ${tokenSymbol}/week` : '—'}
            </p>
            <p>
              Monthly payout:{' '}
              {economicsSummary.validRate && monthlySpendDisplay ? `${monthlySpendDisplay} ${tokenSymbol}/month` : '—'}
            </p>
            <p>
              Starting balance:{' '}
              {economicsSummary.validDeposit ? `${formatTokenAmount(economicsSummary.deposit)} ${tokenSymbol}` : '—'}
            </p>
            <p>
              Estimated runway:{' '}
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
  );
}

function StepActions({
  currentStep,
  isSubmitting,
  isStepValid,
  onBack,
  onNext,
  onSubmit,
}: {
  currentStep: Step;
  isSubmitting: boolean;
  isStepValid: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex justify-between">
      <Button onClick={onBack} disabled={currentStep === 'employee' || isSubmitting} className="px-4 py-2">
        Back
      </Button>
      <Button
        onClick={currentStep === 'review' ? onSubmit : onNext}
        disabled={!isStepValid || isSubmitting}
        className="px-4 py-2"
      >
        {currentStep === 'review' ? (isSubmitting ? 'Creating stream...' : 'Create stream') : 'Next'}
      </Button>
    </div>
  );
}

export function CreateStreamModal({ isOpen, onClose, initialEmployeeId }: CreateStreamModalProps) {
  const { account, cluster } = useWalletUi();
  const clusterId = cluster?.id ?? 'devnet';

  if (!account) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Payment Stream</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Connect your employer wallet to create a stream.</p>
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <CreateStreamModalContent
      isOpen={isOpen}
      onClose={onClose}
      initialEmployeeId={initialEmployeeId}
      account={account}
      clusterId={clusterId}
    />
  );
}

function CreateStreamModalContent({
  isOpen,
  onClose,
  initialEmployeeId,
  account,
  clusterId,
}: CreateStreamModalContentProps) {
  const [modalState, dispatchModal] = useReducer(
    createStreamModalReducer,
    initialEmployeeId,
    createInitialCreateStreamModalState,
  );
  const {
    currentStep,
    selectedEmployeeId,
    employeeAddressOverride,
    selectedTokenAccount,
    hourlyRate,
    initialDeposit,
    isSubmitting,
    submissionError,
  } = modalState;
  const router = useRouter();
  const { completeSetupStep, setAccountState } = useDashboard();
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

  const employeeOptions = useMemo(
    () =>
      buildEmployeeOptions(
        (employeesQuery.data ?? []) as Array<{
          id: string;
          name: string;
          primaryWallet: string | null;
          email: string | null;
        }>,
      ),
    [employeesQuery.data],
  );
  const tokenAccountOptions = useMemo(
    () => buildTokenAccountOptions(tokenAccountsQuery.data),
    [tokenAccountsQuery.data],
  );

  const resolvedSelectedEmployeeId = selectedEmployeeId || initialEmployeeId || employeeOptions[0]?.id || '';
  const resolvedSelectedTokenAccount = selectedTokenAccount || tokenAccountOptions[0]?.address || '';

  const selectedEmployeeOption = useMemo(
    () => employeeOptions.find((option) => option.id === resolvedSelectedEmployeeId) ?? null,
    [employeeOptions, resolvedSelectedEmployeeId],
  );

  const selectedTokenAccountOption = useMemo(
    () => tokenAccountOptions.find((option) => option.address === resolvedSelectedTokenAccount) ?? null,
    [resolvedSelectedTokenAccount, tokenAccountOptions],
  );

  const selectedMint = selectedTokenAccountOption?.mint ?? '';
  const { symbol: tokenSymbol, detail: tokenDetail } = useMemo(() => resolveMintDisplay(selectedMint), [selectedMint]);
  const isGenericTokenSymbol = tokenSymbol.toLowerCase() === 'spl token' || tokenSymbol.toLowerCase() === 'token';
  const tokenAccountsError = (tokenAccountsQuery.error ?? null) as Error | null;

  const effectiveEmployeeAddress = employeeAddressOverride || selectedEmployeeOption?.wallet || '';

  const economicsSummary = useMemo(
    () => buildEconomicsSummary(hourlyRate, initialDeposit),
    [hourlyRate, initialDeposit],
  );

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
    dispatchModal({ type: 'reset' });
    createStreamMutation.reset();
  };

  const handleNext = () => {
    dispatchModal({ type: 'next-step' });
  };

  const handleBack = () => {
    dispatchModal({ type: 'previous-step' });
  };

  const handleSubmit = () => {
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
        description: 'Choose the token account you want to pay from.',
      });
      return;
    }

    if (selectedTokenAccountOption.decimals !== SUPPORTED_STABLECOIN_DECIMALS) {
      toast.error('Unsupported token mint', {
        description: `Cascade supports ${SUPPORTED_STABLECOIN_DECIMALS}-decimal stablecoin mints. Selected token has ${selectedTokenAccountOption.decimals} decimals.`,
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

    dispatchModal({ type: 'patch', patch: { submissionError: null, isSubmitting: true } });
    void createStreamMutation
      .mutateAsync({
        employee: effectiveEmployeeAddress as Address,
        employeeId: resolvedSelectedEmployeeId || undefined,
        mint: selectedTokenAccountOption.mint as Address,
        employerTokenAccount: selectedTokenAccountOption.address as Address,
        hourlyRate: economicsSummary.rate,
        totalDeposit: economicsSummary.deposit,
        cluster: clusterId as 'devnet' | 'testnet' | 'mainnet' | 'localnet' | 'custom',
      })
      .then(() => {
        toast.success('Stream created successfully!', {
          description: `Started a payment stream for ${selectedEmployeeOption?.name ?? ellipsify(effectiveEmployeeAddress, 4)}.`,
        });
        setAccountState(AccountState.FIRST_STREAM_CREATED);
        completeSetupStep('streamCreated');
        router.refresh();
        resetForm();
        onClose();
      })
      .catch((error) => {
        console.error('Failed to create stream', error);
        const message = getErrorMessage(error);
        dispatchModal({ type: 'patch', patch: { submissionError: message } });
      })
      .finally(() => {
        dispatchModal({ type: 'patch', patch: { isSubmitting: false } });
      });
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

  const isStepValid = isCreateStreamStepValid({
    currentStep,
    effectiveEmployeeAddress,
    isEmployeesLoading: employeesQuery.isLoading,
    selectedTokenAccountOption,
    isTokenAccountsLoading: tokenAccountsQuery.isLoading,
    tokenAccountsError,
    economicsSummary,
  });

  const handleSelectEmployee = (id: string) => {
    dispatchModal({
      type: 'patch',
      patch: { selectedEmployeeId: id, employeeAddressOverride: '' },
    });
  };

  const handleEmployeeAddressOverrideChange = (value: string) => {
    dispatchModal({ type: 'patch', patch: { employeeAddressOverride: value } });
  };

  const handleSelectTokenAccount = (tokenAccountAddress: string) => {
    dispatchModal({ type: 'patch', patch: { selectedTokenAccount: tokenAccountAddress } });
  };

  const handleHourlyRateChange = (value: string) => {
    dispatchModal({ type: 'patch', patch: { hourlyRate: value } });
  };

  const handleInitialDepositChange = (value: string) => {
    dispatchModal({ type: 'patch', patch: { initialDeposit: value } });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Payment Stream</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <CreateStreamStepProgress currentStep={currentStep} />
          {currentStep === 'employee' && (
            <EmployeeSelectionStep
              employeesError={employeesError}
              isEmployeesLoading={employeesQuery.isLoading}
              employeeOptions={employeeOptions}
              resolvedSelectedEmployeeId={resolvedSelectedEmployeeId}
              employeeAddressOverride={employeeAddressOverride}
              onSelectEmployee={handleSelectEmployee}
              onEmployeeAddressOverrideChange={handleEmployeeAddressOverrideChange}
            />
          )}
          {currentStep === 'token' && (
            <TokenSelectionStep
              tokenAccountsError={tokenAccountsError}
              isTokenAccountsLoading={tokenAccountsQuery.isLoading}
              tokenAccountOptions={tokenAccountOptions}
              resolvedSelectedTokenAccount={resolvedSelectedTokenAccount}
              onSelectTokenAccount={handleSelectTokenAccount}
            />
          )}
          {currentStep === 'economics' && (
            <EconomicsStep
              hourlyRate={hourlyRate}
              initialDeposit={initialDeposit}
              onHourlyRateChange={handleHourlyRateChange}
              onInitialDepositChange={handleInitialDepositChange}
              isGenericTokenSymbol={isGenericTokenSymbol}
              tokenSymbol={tokenSymbol}
              tokenDetail={tokenDetail ?? null}
              dailySpendDisplay={dailySpendDisplay}
              weeklySpendDisplay={weeklySpendDisplay}
              monthlySpendDisplay={monthlySpendDisplay}
              runwayHoursDisplay={runwayHoursDisplay}
              runwayDaysDisplay={runwayDaysDisplay}
            />
          )}
          {currentStep === 'review' && (
            <ReviewStep
              selectedEmployeeOption={selectedEmployeeOption}
              effectiveEmployeeAddress={effectiveEmployeeAddress}
              tokenSymbol={tokenSymbol}
              tokenDetail={tokenDetail ?? null}
              selectedTokenAccountOption={selectedTokenAccountOption}
              economicsSummary={economicsSummary}
              weeklySpendDisplay={weeklySpendDisplay}
              monthlySpendDisplay={monthlySpendDisplay}
              runwayHoursDisplay={runwayHoursDisplay}
              runwayDaysDisplay={runwayDaysDisplay}
              submissionError={submissionError}
            />
          )}

          <StepActions
            currentStep={currentStep}
            isSubmitting={isSubmitting}
            isStepValid={isStepValid}
            onBack={handleBack}
            onNext={handleNext}
            onSubmit={handleSubmit}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
