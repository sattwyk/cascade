'use client';

import React, { memo, useCallback, useMemo, useTransition } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { ellipsify, useWalletUi } from '@wallet-ui/react';
import { formatInTimeZone } from 'date-fns-tz';
import { Check, ChevronsUpDown, Circle, type LucideProps } from 'lucide-react';
import {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
  useFormState,
  useWatch,
  type SubmitHandler,
  type UseFormReturn,
} from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { EURCIcon, USDCIcon, USDTIcon } from '@/components/icons';
import { AccountState } from '@/core/enums';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import { Checkbox } from '@/core/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/core/ui/command';
import { Input } from '@/core/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/core/ui/input-otp';
import { Label } from '@/core/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/ui/popover';
import { cn } from '@/core/utils';
import { WalletDrawer } from '@/features/onboarding/components/wallet-picker';
import { OnboardingFormSchema, type OnboardingFormData } from '@/features/onboarding/schema';
import {
  completeEmployerOnboarding,
  requestOnboardingVerification,
  verifyOnboardingCode,
} from '@/features/onboarding/server/actions/onboarding';
import { useDashboard } from '@/features/organization/components/layout/employer-dashboard-context';

// ----------------------------
// Types & constants
// ----------------------------

const FALLBACK_TIMEZONES = [
  'Pacific/Midway',
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
] as const;

function parseOffsetToMinutes(offset: string) {
  const match = offset.match(/^([+-])?(\d{2}):(\d{2})$/);
  if (!match) return 0;
  const [, signSymbol = '+', hoursStr, minutesStr] = match;
  const sign = signSymbol === '-' ? -1 : 1;
  const hours = Number.parseInt(hoursStr, 10);
  const minutes = Number.parseInt(minutesStr, 10);
  return sign * (hours * 60 + minutes);
}

export type TimezoneOption = {
  value: string;
  label: string;
  offsetMinutes: number;
};

type SectionId = 'wallet' | 'organization' | 'token' | 'compliance';

const TOKEN_OPTIONS: Array<{
  id: string;
  name: string;
  description: string;
  Icon: React.ComponentType<LucideProps>;
  disabled?: boolean;
}> = [
  { id: 'USDC', name: 'USDC', description: 'USD Coin · Recommended', Icon: USDCIcon },
  { id: 'USDT', name: 'USDT', description: 'Coming soon', Icon: USDTIcon, disabled: true },
  { id: 'EURC', name: 'EURC', description: 'Coming soon', Icon: EURCIcon, disabled: true },
];

// ----------------------------
// Timezone utilities (pure, memoizable)
// ----------------------------

function buildTimezoneOptions(resolvedTimezone: string | undefined, now: Date): TimezoneOption[] {
  const zones =
    typeof (Intl as { supportedValuesOf?: (type: string) => string[] }).supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('timeZone')
      : [...FALLBACK_TIMEZONES];

  const seen = new Set<string>();
  const options: TimezoneOption[] = [];

  zones.forEach((zone) => {
    if (seen.has(zone)) return;
    seen.add(zone);
    try {
      const offset = formatInTimeZone(now, zone, 'XXX');
      const displayName = zone.replace(/_/g, ' ');
      options.push({
        value: zone,
        label: `${displayName} (GMT${offset})`,
        offsetMinutes: parseOffsetToMinutes(offset),
      });
    } catch {
      /* ignore */
    }
  });

  if (resolvedTimezone && !options.some((o) => o.value === resolvedTimezone)) {
    try {
      const offset = formatInTimeZone(now, resolvedTimezone, 'XXX');
      const displayName = resolvedTimezone.replace(/_/g, ' ');
      options.push({
        value: resolvedTimezone,
        label: `${displayName} (GMT${offset})`,
        offsetMinutes: parseOffsetToMinutes(offset),
      });
    } catch {
      /* ignore */
    }
  }

  return options.sort((a, b) => a.offsetMinutes - b.offsetMinutes || a.value.localeCompare(b.value));
}

// ----------------------------
// Small, memo-friendly building blocks
// ----------------------------

const TimezoneSelect = memo(function TimezoneSelect({ options }: { options: TimezoneOption[] }) {
  const { control } = useFormContext<OnboardingFormData>();
  const [open, setOpen] = React.useState(false);
  const timezoneListId = React.useId();

  return (
    <Controller
      name="timezone"
      control={control}
      render={({ field, fieldState }) => (
        <div>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                aria-controls={timezoneListId}
                aria-invalid={!!fieldState.error}
                className={cn('w-full justify-between font-normal', !field.value && 'text-muted-foreground')}
              >
                {field.value ? options.find((opt) => opt.value === field.value)?.label : 'Choose a timezone'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Search timezone..." />
                <CommandList id={timezoneListId}>
                  <CommandEmpty>No timezone found.</CommandEmpty>
                  <CommandGroup>
                    {options.map((opt) => (
                      <CommandItem
                        key={opt.value}
                        value={opt.value}
                        keywords={[opt.label, opt.value]}
                        onSelect={(currentValue) => {
                          field.onChange(currentValue === field.value ? '' : currentValue);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn('mr-2 h-4 w-4', field.value === opt.value ? 'opacity-100' : 'opacity-0')}
                        />
                        {opt.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {fieldState.error ? <p className="mt-2 text-xs text-destructive">{fieldState.error.message}</p> : null}
        </div>
      )}
    />
  );
});

// ----------------------------
// Step sections (isolated with RHF + useWatch)
// ----------------------------

const WalletStep = memo(function WalletStep({
  connected,
  accountAddress,
  clusterLabel,
  walletProvider,
  onOpenDrawer,
  onDisconnect,
  showValidation,
}: {
  connected: boolean;
  accountAddress: string | null;
  clusterLabel: string;
  walletProvider: string;
  onOpenDrawer: () => void;
  onDisconnect: () => void;
  showValidation: boolean;
}) {
  const { control } = useFormContext<OnboardingFormData>();
  const confirmed = useWatch({ control, name: 'confirmedWalletAddress' });

  const formatted = accountAddress ? ellipsify(accountAddress, 4) : null;

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-6 shadow-sm transition-colors',
        showValidation && !confirmed && 'border-destructive',
      )}
      id="wallet"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <Badge variant="outline">Step 1</Badge>
          <h2 className="mt-2 text-xl font-semibold text-foreground">Connect your treasury wallet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Link the Solana wallet that Cascade will use to fund payroll streams.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="rounded-lg border border-border bg-muted/40 p-4">
          {connected && accountAddress ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Treasury wallet</p>
                <Badge variant="outline" className="text-xs font-medium">
                  {clusterLabel}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-sm text-foreground">{formatted}</p>
                <Badge variant="secondary" className="text-[10px] uppercase">
                  {walletProvider}
                </Badge>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" onClick={onOpenDrawer} className="w-full sm:w-auto">
                  Change wallet
                </Button>
                <Button type="button" variant="ghost" onClick={onDisconnect} className="w-full sm:w-auto">
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-foreground">Connect your treasury wallet</p>
              <p className="text-xs text-muted-foreground">
                Link the Solana account that will fund your Cascade payroll streams.
              </p>
              <Button type="button" onClick={onOpenDrawer} className="w-full sm:w-auto">
                Connect wallet
              </Button>
            </div>
          )}
        </div>

        {connected && accountAddress ? (
          <div
            className={cn(
              'flex items-start gap-3 rounded-lg border border-dashed border-border/80 bg-background p-4',
              showValidation && !confirmed && 'border-destructive bg-destructive/10',
            )}
          >
            <Controller
              name="confirmedWalletAddress"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="wallet-confirm"
                  checked={Boolean(field.value && field.value === accountAddress)}
                  onCheckedChange={(checked) => field.onChange(checked === true ? accountAddress : '')}
                />
              )}
            />
            <Label htmlFor="wallet-confirm" className="text-sm leading-relaxed text-foreground">
              I confirm this is the treasury wallet we will use for payroll streams.
            </Label>
          </div>
        ) : null}

        {showValidation && !confirmed ? (
          <p className="text-xs text-destructive">Confirm the wallet that will fund payroll streams.</p>
        ) : null}
      </div>
    </div>
  );
});

const OrgStep = memo(function OrgStep({
  timezoneOptions,
  onSendCode,
  onVerifyCode,
  sending,
  verifying,
  hasRequested,
}: {
  timezoneOptions: TimezoneOption[];
  onSendCode: () => void;
  onVerifyCode: () => void;
  sending: boolean;
  verifying: boolean;
  hasRequested: boolean;
}) {
  const { control } = useFormContext<OnboardingFormData>();
  const { errors } = useFormState({
    control,
    name: ['organizationName', 'organizationMail', 'timezone'],
  });

  const rawEmail = useWatch({ control, name: 'organizationMail' });
  const deferredEmail = rawEmail;
  const isDeferredEmailValid = React.useMemo(
    () => z.string().email().safeParse(deferredEmail).success,
    [deferredEmail],
  );

  const isEmailVerified = useWatch({ control, name: 'isEmailVerified' });
  const verificationCode = useWatch({ control, name: 'verificationCode' });

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-6 shadow-sm transition-colors',
        (errors.organizationName || errors.organizationMail || errors.timezone) && 'border-destructive',
      )}
      id="organization"
    >
      <Badge variant="outline">Step 2</Badge>
      <h2 className="mt-2 text-xl font-semibold text-foreground">Tell us about your organization</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        We surface this information to employees and partners during payroll activities.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="org-name">Organization name</Label>
          <Controller
            name="organizationName"
            control={control}
            render={({ field, fieldState }) => (
              <>
                <Input id="org-name" {...field} aria-invalid={!!fieldState.error} placeholder="Cascade Labs" />
                {fieldState.error ? <p className="text-xs text-destructive">{fieldState.error.message}</p> : null}
              </>
            )}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="organization-mail">Organization mail</Label>
          <Controller
            name="organizationMail"
            control={control}
            render={({ field, fieldState }) => (
              <>
                {/* TODO: fix organization mail input causing a lot of re-renders */}
                <Input
                  id="organization-mail"
                  type="email"
                  {...field}
                  aria-invalid={!!fieldState.error}
                  placeholder="payroll@cascade.app"
                />
                {fieldState.error ? <p className="text-xs text-destructive">{fieldState.error.message}</p> : null}
              </>
            )}
          />
        </div>

        {hasRequested && !isEmailVerified && (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="verification-code">Verification code</Label>
            <Controller
              name="verificationCode"
              control={control}
              defaultValue=""
              render={({ field, fieldState }) => (
                <>
                  <InputOTP maxLength={6} value={field.value || ''} onChange={field.onChange}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                  {fieldState.error ? (
                    <p className="mt-2 text-xs text-destructive">{fieldState.error.message}</p>
                  ) : null}
                </>
              )}
            />
            <Button
              type="button"
              onClick={onVerifyCode}
              disabled={verifying || (verificationCode?.length ?? 0) !== 6}
              className="mt-2 w-full sm:w-auto"
            >
              {verifying ? 'Verifying...' : 'Verify code'}
            </Button>
          </div>
        )}

        {!hasRequested && (
          <div className="sm:col-span-2">
            <Button
              type="button"
              onClick={onSendCode}
              disabled={sending || !isDeferredEmailValid}
              className="w-full sm:w-auto"
            >
              {sending ? 'Sending...' : 'Send verification code'}
            </Button>
          </div>
        )}

        {isEmailVerified && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-600 sm:col-span-2">
            <Check className="h-4 w-4" />
            <span>Email verified successfully</span>
          </div>
        )}

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="timezone">Primary timezone</Label>
          <TimezoneSelect options={timezoneOptions} />
        </div>
      </div>
    </div>
  );
});

const TokenStep = memo(function TokenStep({ showValidation }: { showValidation: boolean }) {
  const { control } = useFormContext<OnboardingFormData>();
  const selected = useWatch({ control, name: 'selectedMint' });

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-6 shadow-sm transition-colors',
        showValidation && !selected && 'border-destructive',
      )}
      id="token"
    >
      <Badge variant="outline">Step 3</Badge>
      <h2 className="mt-2 text-xl font-semibold text-foreground">Choose your default payout token</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        You can add or update treasury tokens later, but at least one is required to activate payroll streams.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {TOKEN_OPTIONS.map((token) => {
          const Icon = token.Icon;
          const isSelected = selected === token.id;
          const isDisabled = token.disabled ?? false;
          return (
            <Controller
              key={token.id}
              name="selectedMint"
              control={control}
              render={({ field }) => (
                <button
                  type="button"
                  onClick={() => !isDisabled && field.onChange(token.id)}
                  disabled={isDisabled}
                  className={cn(
                    'rounded-lg border border-border bg-background p-4 text-left transition-all',
                    isSelected && 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/30',
                    !isSelected && !isDisabled && 'hover:bg-muted/50',
                    isDisabled && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-6 w-6" />
                    <div>
                      <p className="font-semibold text-foreground">{token.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{token.description}</p>
                    </div>
                  </div>
                </button>
              )}
            />
          );
        })}
      </div>

      {showValidation && !selected ? (
        <p className="mt-2 text-xs text-destructive">Select at least one treasury token.</p>
      ) : null}
    </div>
  );
});

const ComplianceStep = memo(function ComplianceStep({ showValidation }: { showValidation: boolean }) {
  const { control } = useFormContext<OnboardingFormData>();
  const funding = useWatch({ control, name: 'fundingAcknowledged' });
  const emergency = useWatch({ control, name: 'emergencyAcknowledged' });

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-6 shadow-sm transition-colors',
        showValidation && (!funding || !emergency) && 'border-destructive',
      )}
      id="compliance"
    >
      <Badge variant="outline">Step 4</Badge>
      <h2 className="mt-2 text-xl font-semibold text-foreground">Review compliance acknowledgments</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        These confirmations help ensure uninterrupted payroll operations and protect employee compensation.
      </p>

      <div className="mt-6 space-y-4">
        <div
          className={cn(
            'flex items-start gap-3 rounded-lg border border-border bg-background p-4',
            showValidation && !funding && 'border-destructive bg-destructive/10',
          )}
        >
          <Controller
            name="fundingAcknowledged"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="funding-ack"
                checked={field.value === true}
                onCheckedChange={(v) => field.onChange(v === true)}
              />
            )}
          />
          <Label htmlFor="funding-ack" className="text-sm leading-relaxed text-foreground">
            I understand that our treasury wallet must remain funded to cover all active payroll streams.
          </Label>
        </div>
        {showValidation && !funding ? (
          <p className="text-xs text-destructive">Acknowledge the funding responsibility.</p>
        ) : null}

        <div
          className={cn(
            'flex items-start gap-3 rounded-lg border border-border bg-background p-4',
            showValidation && !emergency && 'border-destructive bg-destructive/10',
          )}
        >
          <Controller
            name="emergencyAcknowledged"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="emergency-ack"
                checked={field.value === true}
                onCheckedChange={(v) => field.onChange(v === true)}
              />
            )}
          />
          <Label htmlFor="emergency-ack" className="text-sm leading-relaxed text-foreground">
            I understand that emergency withdrawals suspend affected streams and may impact employee compensation.
          </Label>
        </div>
        {showValidation && !emergency ? (
          <p className="text-xs text-destructive">Acknowledge the emergency withdrawal policy.</p>
        ) : null}
      </div>
    </div>
  );
});

type OnboardingLayoutProps = {
  methods: UseFormReturn<OnboardingFormData>;
  handleValidSubmit: SubmitHandler<OnboardingFormData>;
  showValidationFeedback: boolean;
  isFormValid: boolean;
  sectionStatuses: Array<{ id: SectionId; title: string; description: string; isComplete: boolean }>;
  connected: boolean;
  accountAddress: string | null;
  clusterLabel: string;
  walletProvider: string;
  openWalletDrawer: () => void;
  handleDisconnect: () => Promise<void>;
  timezoneOptions: TimezoneOption[];
  onSendVerificationCode: () => void;
  onVerifyCode: () => void;
  isSendingCode: boolean;
  isVerifyingCode: boolean;
  hasRequestedVerification: boolean;
  isCompleting: boolean;
  isWalletDrawerOpen: boolean;
  setIsWalletDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  wallets: ReturnType<typeof useWalletUi>['wallets'];
  activeWalletName: string | null;
  handleWalletConnected: () => void;
};

function OnboardingLayout({
  methods,
  handleValidSubmit,
  showValidationFeedback,
  isFormValid,
  sectionStatuses,
  connected,
  accountAddress,
  clusterLabel,
  walletProvider,
  openWalletDrawer,
  handleDisconnect,
  timezoneOptions,
  onSendVerificationCode,
  onVerifyCode,
  isSendingCode,
  isVerifyingCode,
  hasRequestedVerification,
  isCompleting,
  isWalletDrawerOpen,
  setIsWalletDrawerOpen,
  wallets,
  activeWalletName,
  handleWalletConnected,
}: OnboardingLayoutProps) {
  return (
    <FormProvider {...methods}>
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-10">
        <form className="space-y-10" onSubmit={methods.handleSubmit(handleValidSubmit)} noValidate>
          <header className="space-y-3">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">First-time setup</p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Complete your Cascade onboarding
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Every section below is required. Once finished, you&apos;ll unlock payroll automations, invitations, and
              reporting across the dashboard.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <span>Onboarding required</span>
            </div>
          </header>

          {showValidationFeedback && !isFormValid && (
            <div
              className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
              role="alert"
            >
              Some required details are missing or need attention. Review the sections marked in red and update the
              highlighted fields before submitting.
            </div>
          )}

          <div className="grid gap-8 lg:grid-cols-[320px,1fr]">
            <aside className="space-y-6 rounded-xl border border-border bg-card/60 p-6">
              <div className="space-y-1">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Checklist</p>
                <h2 className="text-lg font-semibold text-foreground">All steps must be completed</h2>
              </div>
              <div className="space-y-5">
                {sectionStatuses.map((section) => (
                  <div key={section.id} className="flex items-start gap-4">
                    <div
                      className={cn(
                        'mt-1 flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold',
                        section.isComplete
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                          : showValidationFeedback
                            ? 'border-destructive bg-destructive/10 text-destructive'
                            : 'border-muted bg-muted text-muted-foreground',
                      )}
                    >
                      {section.isComplete ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{section.title}</p>
                      <p className="text-xs text-muted-foreground">{section.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            <section className="space-y-10">
              <WalletStep
                connected={connected}
                accountAddress={accountAddress}
                clusterLabel={clusterLabel}
                walletProvider={walletProvider}
                onOpenDrawer={openWalletDrawer}
                onDisconnect={handleDisconnect}
                showValidation={showValidationFeedback}
              />

              <OrgStep
                timezoneOptions={timezoneOptions}
                onSendCode={onSendVerificationCode}
                onVerifyCode={onVerifyCode}
                sending={isSendingCode}
                verifying={isVerifyingCode}
                hasRequested={hasRequestedVerification}
              />

              <TokenStep showValidation={showValidationFeedback} />
              <ComplianceStep showValidation={showValidationFeedback} />
            </section>
          </div>

          <footer className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Onboarding is mandatory. Complete every step above to unlock the dashboard.
            </p>
            <Button disabled={!isFormValid || isCompleting} type="submit" className="gap-2">
              {isCompleting ? 'Finishing…' : 'Complete setup'}
            </Button>
          </footer>
        </form>
      </div>

      {isWalletDrawerOpen ? (
        <WalletDrawer
          open={isWalletDrawerOpen}
          onOpenChange={setIsWalletDrawerOpen}
          wallets={wallets}
          activeWalletName={activeWalletName}
          onConnected={handleWalletConnected}
          onDisconnect={handleDisconnect}
          accountAddress={accountAddress}
        />
      ) : null}
    </FormProvider>
  );
}

// ----------------------------
// Main page
// ----------------------------

export function OnboardingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { accountState, setAccountState } = useDashboard();

  const { account, cluster, connected, wallet: activeWallet, wallets, disconnect } = useWalletUi();
  const [isSendingCode, startSend] = useTransition();
  const [isVerifyingCode, startVerify] = useTransition();
  const [isCompleting, startCompleting] = useTransition();
  const [timezoneOptions, setTimezoneOptions] = React.useState<TimezoneOption[]>([]);

  const resolvedTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
    } catch {
      return '';
    }
  }, []);

  React.useEffect(() => {
    setTimezoneOptions(buildTimezoneOptions(resolvedTimezone || undefined, new Date()));
  }, [resolvedTimezone]);

  const methods = useForm<OnboardingFormData>({
    resolver: zodResolver(OnboardingFormSchema),
    defaultValues: {
      organizationName: '',
      organizationMail: '',
      verificationSessionId: '',
      isEmailVerified: false,
      hasRequestedVerification: false,
      verificationCode: '',
      timezone: resolvedTimezone || '',
      selectedMint: undefined as unknown as OnboardingFormData['selectedMint'],
      fundingAcknowledged: false,
      emergencyAcknowledged: false,
      confirmedWalletAddress: '',
    },
    mode: 'onBlur', // validate on blur to avoid validating on every keystroke
    shouldFocusError: true,
  });

  const { setValue, watch, getValues, formState, setError, clearErrors } = methods;

  // update onboarding state once, without causing page-wide re-compute chains
  React.useEffect(() => {
    if (accountState === AccountState.NEW_ACCOUNT) setAccountState(AccountState.ONBOARDING);
  }, [accountState, setAccountState]);

  // Reset verification state when email changes
  React.useEffect(() => {
    const sub = watch((value, { name }) => {
      if (name === 'organizationMail') {
        setValue('hasRequestedVerification', false, { shouldValidate: false, shouldDirty: true });
        setValue('isEmailVerified', false, { shouldValidate: false, shouldDirty: true });
        setValue('verificationCode', '', { shouldValidate: false, shouldDirty: false });
        setValue('verificationSessionId', '', { shouldValidate: false, shouldDirty: false });
      }
    });
    return () => sub.unsubscribe();
  }, [watch, setValue]);

  // Extract watched values to avoid complex expressions in dependency array
  const selectedMint = watch('selectedMint');
  const fundingAck = watch('fundingAcknowledged');
  const emergencyAck = watch('emergencyAcknowledged');
  const accountAddress = account?.address;
  const confirmedWalletAddressValue = watch('confirmedWalletAddress');
  const isEmailVerified = watch('isEmailVerified');
  const showValidationFeedback = formState.submitCount > 0;

  const sectionStatuses = useMemo(() => {
    // compute using formState.errors only (stable shape) and connection state
    const hasWalletError = !connected || !accountAddress || confirmedWalletAddressValue !== accountAddress;
    const organizationComplete =
      isEmailVerified &&
      !formState.errors.organizationName &&
      !formState.errors.organizationMail &&
      !formState.errors.timezone;
    return [
      {
        id: 'wallet',
        title: 'Connect Wallet',
        description: 'Verify the treasury wallet that funds payroll streams.',
        isComplete: !hasWalletError,
      },
      {
        id: 'organization',
        title: 'Organization Profile',
        description: 'Provide the contact information we surface to your team.',
        isComplete: organizationComplete,
      },
      {
        id: 'token',
        title: 'Select Token',
        description: 'Choose the default SPL token you will use for payouts.',
        isComplete: !formState.errors.selectedMint && !!selectedMint,
      },
      {
        id: 'compliance',
        title: 'Compliance',
        description: 'Acknowledge critical funding and emergency policies.',
        isComplete: !!fundingAck && !!emergencyAck,
      },
    ] as Array<{ id: SectionId; title: string; description: string; isComplete: boolean }>;
  }, [
    connected,
    accountAddress,
    confirmedWalletAddressValue,
    formState.errors,
    selectedMint,
    fundingAck,
    emergencyAck,
    isEmailVerified,
  ]);

  const allSectionsComplete = sectionStatuses.every((section) => section.isComplete);

  const isFormValid = allSectionsComplete && Object.keys(formState.errors).length === 0;

  const clusterLabel = cluster?.label ?? cluster?.id ?? 'Unknown cluster';
  const walletProvider = activeWallet?.name ?? 'Wallet';

  const [isWalletDrawerOpen, setIsWalletDrawerOpen] = React.useState(false);
  const openWalletDrawer = useCallback(() => {
    setIsWalletDrawerOpen(true);
  }, []);

  const handleDisconnect = useCallback(async () => {
    try {
      await Promise.resolve(disconnect());
      setIsWalletDrawerOpen(false);
      toast.success('Wallet disconnected');
      setValue('confirmedWalletAddress', '');
    } catch (error) {
      console.error('Failed to disconnect wallet', error);
      toast.error('Failed to disconnect wallet');
    }
  }, [disconnect, setValue]);

  const handleWalletConnected = useCallback(() => {
    setIsWalletDrawerOpen(false);
    if (account?.address) setValue('confirmedWalletAddress', account.address);
    toast.success('Wallet connected');
  }, [account?.address, setValue]);

  const onSendVerificationCode = useCallback(() => {
    const email = getValues('organizationMail');
    const organizationName = getValues('organizationName');
    if (!z.string().email().safeParse(email).success) {
      toast.error('Please enter a valid email address');
      return;
    }
    startSend(async () => {
      try {
        const response = await requestOnboardingVerification({ email, organizationName });
        if (!response.ok) {
          toast.error(response.error);
          return;
        }

        setValue('hasRequestedVerification', true, { shouldValidate: true });
        setValue('isEmailVerified', false, { shouldValidate: true });
        setValue('verificationCode', '', { shouldValidate: false, shouldDirty: false });
        setValue('verificationSessionId', response.data.sessionId, {
          shouldValidate: false,
          shouldDirty: true,
        });

        toast.success(`Verification code sent to ${email}`);
      } catch (error) {
        console.error('Failed to request verification code', error);
        toast.error('Failed to send verification code. Please try again.');
      }
    });
  }, [getValues, setValue, startSend]);

  const onVerifyCode = useCallback(() => {
    const code = getValues('verificationCode') || '';
    const sessionId = getValues('verificationSessionId');
    const email = getValues('organizationMail');
    if (!sessionId) {
      setError(
        'verificationCode',
        { type: 'manual', message: 'Request a verification code first.' },
        { shouldFocus: true },
      );
      return;
    }
    if (code.length !== 6) {
      setError(
        'verificationCode',
        { type: 'manual', message: 'Enter the 6-digit code we emailed you.' },
        { shouldFocus: true },
      );
      return;
    }
    clearErrors('verificationCode');
    startVerify(async () => {
      try {
        const response = await verifyOnboardingCode({ email, sessionId, code });
        if (!response.ok) {
          setValue('isEmailVerified', false, { shouldValidate: true });
          setError('verificationCode', { type: 'server', message: response.error }, { shouldFocus: true });
          return;
        }
        clearErrors('verificationCode');
        setValue('isEmailVerified', true, { shouldValidate: true });
        toast.success('Email verified successfully');
      } catch (error) {
        console.error('Failed to verify onboarding code', error);
        setValue('isEmailVerified', false, { shouldValidate: true });
        setError(
          'verificationCode',
          { type: 'server', message: 'Unable to verify the code. Please try again.' },
          { shouldFocus: true },
        );
      }
    });
  }, [clearErrors, getValues, setError, setValue, startVerify]);

  const handleValidSubmit = useCallback<SubmitHandler<OnboardingFormData>>(
    (values) => {
      startCompleting(async () => {
        try {
          const response = await completeEmployerOnboarding(values);
          if (!response.ok) {
            toast.error(response.error);
            return;
          }

          toast.success('Onboarding complete. Welcome to Cascade!');
          setAccountState(AccountState.WALLET_CONNECTED);
          if (pathname !== '/dashboard') router.replace('/dashboard');
        } catch (error) {
          console.error('Failed to complete employer onboarding', error);
          toast.error('Unable to finish onboarding. Please try again.');
        }
      });
    },
    [pathname, router, setAccountState, startCompleting],
  );

  const hasRequestedVerification = Boolean(watch('hasRequestedVerification'));

  return (
    <OnboardingLayout
      methods={methods}
      handleValidSubmit={handleValidSubmit}
      showValidationFeedback={showValidationFeedback}
      isFormValid={isFormValid}
      sectionStatuses={sectionStatuses}
      connected={connected}
      accountAddress={account?.address ?? null}
      clusterLabel={clusterLabel}
      walletProvider={walletProvider}
      openWalletDrawer={openWalletDrawer}
      handleDisconnect={handleDisconnect}
      timezoneOptions={timezoneOptions}
      onSendVerificationCode={onSendVerificationCode}
      onVerifyCode={onVerifyCode}
      isSendingCode={isSendingCode}
      isVerifyingCode={isVerifyingCode}
      hasRequestedVerification={hasRequestedVerification}
      isCompleting={isCompleting}
      isWalletDrawerOpen={isWalletDrawerOpen}
      setIsWalletDrawerOpen={setIsWalletDrawerOpen}
      wallets={wallets}
      activeWalletName={activeWallet?.name ?? null}
      handleWalletConnected={handleWalletConnected}
    />
  );
}
