'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { ellipsify, useWalletUi } from '@wallet-ui/react';
import { toast } from 'sonner';

import { completeEmployeeOnboarding } from '@/app/onboarding/employee/actions';
import { WalletDrawer } from '@/components/onboarding/shared/wallet-picker';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type EmployeeInviteSummary = {
  inviteToken: string;
  employeeName: string | null;
  employeeEmail: string | null;
  organizationName: string | null;
  expiresAt: string | null;
};

interface EmployeeOnboardingFormProps {
  invite: EmployeeInviteSummary;
}

function formatExpiration(expiresAt: string | null) {
  if (!expiresAt) return null;
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

export function EmployeeOnboardingForm({ invite }: EmployeeOnboardingFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(invite.employeeName ?? '');
  const [walletAddress, setWalletAddress] = useState('');
  const [acceptPolicies, setAcceptPolicies] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isWalletDrawerOpen, setIsWalletDrawerOpen] = useState(false);

  const { account, cluster, connected, wallet: activeWallet, wallets, disconnect } = useWalletUi();

  const expirationLabel = useMemo(() => formatExpiration(invite.expiresAt), [invite.expiresAt]);
  const clusterLabel = cluster?.label ?? cluster?.id ?? 'Unknown cluster';

  useEffect(() => {
    if (account?.address) {
      setWalletAddress(account.address);
    } else {
      setWalletAddress('');
    }
  }, [account?.address]);

  const handleWalletConnected = useCallback(() => {
    setIsWalletDrawerOpen(false);
    if (account?.address) {
      setWalletAddress(account.address);
      toast.success('Wallet connected', {
        description: `${ellipsify(account.address)} on ${clusterLabel}`,
      });
    }
  }, [account?.address, clusterLabel]);

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect();
      setWalletAddress('');
      toast.success('Wallet disconnected');
    } catch (error) {
      console.error('[employee-onboarding] wallet disconnect failed', error);
      toast.error('Failed to disconnect wallet', {
        description: error instanceof Error ? error.message : 'Try again in a moment.',
      });
    }
  }, [disconnect]);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (!walletAddress) {
      setFormError('Connect the wallet that should receive your payroll stream.');
      toast.error('Connect your wallet before continuing');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        inviteToken: invite.inviteToken,
        displayName: fullName.trim(),
        walletAddress: walletAddress.trim(),
        acceptPolicies,
      };

      const response = await completeEmployeeOnboarding(payload);
      if (!response.ok) {
        setFormError(response.error);
        toast.error('Unable to activate account', { description: response.error });
        return;
      }

      toast.success('Welcome to Cascade!', {
        description: 'Your invitation has been accepted.',
      });
      router.replace(response.data.redirect);
      router.refresh();
    } catch (error) {
      console.error('[employee-onboarding] Failed to accept invitation', error);
      const message = error instanceof Error ? error.message : 'Please try again.';
      setFormError(message);
      toast.error('Unable to activate account', { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col gap-8 px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight text-foreground">
            Join {invite.organizationName ?? 'Cascade'}
          </CardTitle>
          <CardDescription>
            {invite.organizationName ?? 'Your employer'} invited you to manage your payroll stream with Cascade.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Invited email</p>
              <p className="text-sm font-medium text-foreground">{invite.employeeEmail ?? 'Not provided'}</p>
            </div>
            {expirationLabel ? (
              <p className="mt-2 text-xs text-muted-foreground sm:mt-0">
                Expires{' '}
                <span className="font-medium text-foreground" suppressHydrationWarning>
                  {expirationLabel}
                </span>
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <form className="space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Connect your payout wallet</p>
                <p className="text-xs text-muted-foreground">
                  This wallet receives your real-time payroll stream from {invite.organizationName ?? 'Cascade'}.
                </p>
              </div>
              {connected ? (
                <Button variant="outline" size="sm" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              ) : (
                <Button size="sm" onClick={() => setIsWalletDrawerOpen(true)}>
                  Connect Wallet
                </Button>
              )}
            </div>

            {connected && account ? (
              <div className="rounded-md border border-border bg-background px-3 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Connected Wallet</p>
                    <p className="font-mono text-sm text-foreground">{ellipsify(account.address)}</p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{clusterLabel}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Choose a wallet to continue. You can update it later from your dashboard.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="employee-name">Your name</Label>
            <Input
              id="employee-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Alex Rivera"
              required
            />
          </div>

          <div className="flex items-start gap-3 rounded-md border border-border bg-muted/30 p-4">
            <Checkbox
              id="policy-ack"
              checked={acceptPolicies}
              onCheckedChange={(checked) => setAcceptPolicies(checked === true)}
              className="mt-1"
            />
            <Label htmlFor="policy-ack" className="text-sm leading-6 font-normal text-muted-foreground">
              I acknowledge the emergency withdrawal policy and understand that Cascade may require my wallet to
              complete payroll actions on-chain.
            </Label>
          </div>
        </div>

        <WalletDrawer
          open={isWalletDrawerOpen}
          onOpenChange={setIsWalletDrawerOpen}
          wallets={wallets}
          activeWalletName={activeWallet?.name ?? null}
          onConnected={handleWalletConnected}
          onDisconnect={handleDisconnect}
          accountAddress={account?.address ?? null}
        />

        {formError ? (
          <Alert variant="destructive">
            <AlertTitle>We couldn&apos;t finish onboarding</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="submit"
            className="w-full sm:w-auto"
            disabled={isSubmitting || !walletAddress || !acceptPolicies || !fullName.trim()}
          >
            {isSubmitting ? 'Activating…' : 'Activate account'}
          </Button>
        </div>
      </form>
    </div>
  );
}
