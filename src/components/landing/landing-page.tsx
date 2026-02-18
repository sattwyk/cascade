'use client';

// TODO: Fix the wallet connect drawer persistance issue
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { UiWallet, useWalletUi, useWalletUiWallet } from '@wallet-ui/react';
import { ArrowRight, Check, Loader2, Wallet, Zap } from 'lucide-react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { AccountState } from '@/lib/enums';
import { cn } from '@/lib/utils';

function persistAccountState(state: AccountState) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('cascade_account_state', state);
}

type FlowType = 'employer' | 'employee';

function WalletOptionButton({ wallet, onConnected }: { wallet: UiWallet; onConnected?: () => void }) {
  const { connect, isConnecting } = useWalletUiWallet({ wallet });

  const handleSelect = async () => {
    try {
      await connect();
      onConnected?.();
      toast.success(`${wallet.name} connected`);
    } catch (error) {
      console.error('Failed to connect wallet', error);
      toast.error('Failed to connect wallet');
    }
  };

  return (
    <Button
      variant="outline"
      className="w-full justify-center gap-3 bg-card text-center hover:bg-muted"
      onClick={handleSelect}
      disabled={isConnecting}
    >
      <Avatar className="h-8 w-8 shrink-0 rounded-md p-1">
        <AvatarImage src={wallet.icon} alt={wallet.name} />
        <AvatarFallback>{wallet.name[0]}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col items-center">
        <span className="text-sm font-medium">{wallet.name}</span>
        {isConnecting ? <span className="text-xs text-muted-foreground">Connecting…</span> : null}
      </div>
    </Button>
  );
}

type WalletResolution = {
  found: boolean;
  role: FlowType;
  dbUnavailable: boolean;
};

export const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isWalletDrawerOpen, setIsWalletDrawerOpen] = useState(false);
  const [walletResolution, setWalletResolution] = useState<WalletResolution | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isCheckingWallet, setIsCheckingWallet] = useState(false);
  const lastResolvedAddress = useRef<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [pendingCTA, setPendingCTA] = useState<FlowType | null>(null);
  const { account, connected, disconnect, wallets } = useWalletUi();
  const accountAddress = useMemo(() => account?.address ?? null, [account]);
  const autoNavigatedFor = useRef<string | null>(null);
  useEffect(() => {
    persistAccountState(AccountState.NEW_ACCOUNT);
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (pathname !== '/') {
      setIsWalletDrawerOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (!isPending) {
      setPendingCTA((current) => (current ? null : current));
    }
  }, [isPending]);

  const resolveWalletRole = useCallback(async (walletAddress: string, intendedRole: FlowType = 'employer') => {
    setIsCheckingWallet(true);
    setWalletError(null);
    try {
      const persistedOrgId =
        typeof window !== 'undefined' ? (localStorage.getItem('cascade-organization-id') ?? undefined) : undefined;

      const response = await fetch('/api/auth/resolve-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          intendedRole,
          organizationId: persistedOrgId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to resolve wallet role: ${response.statusText}`);
      }

      const payload: {
        found: boolean;
        role: FlowType;
        organizationId?: string | null;
        dbUnavailable?: boolean;
        reason?: string;
      } = await response.json();

      if (typeof window !== 'undefined') {
        if (payload.organizationId) {
          localStorage.setItem('cascade-organization-id', payload.organizationId);
        } else {
          localStorage.removeItem('cascade-organization-id');
        }
      }

      setWalletResolution({
        found: payload.found,
        role: payload.role,
        dbUnavailable: Boolean(payload.dbUnavailable),
      });

      if (payload.dbUnavailable) {
        setWalletError(
          'We could not confirm your account right now. You can start employer onboarding or try again shortly.',
        );
      } else if (!payload.found && payload.role === 'employee') {
        setWalletError('We could not find an employee record for this wallet. Use your invite link to continue.');
      } else if (!payload.found) {
        setWalletError(null);
      } else {
        setWalletError(null);
      }
    } catch (error) {
      console.error('Unable to resolve wallet role', error);
      setWalletResolution(null);
      setWalletError('Unable to verify your wallet. Please try again.');
    } finally {
      setIsCheckingWallet(false);
    }
  }, []);

  useEffect(() => {
    if (!connected || !accountAddress) {
      setWalletResolution(null);
      setWalletError(null);
      lastResolvedAddress.current = null;
      autoNavigatedFor.current = null;
      persistAccountState(AccountState.NEW_ACCOUNT);
      return;
    }

    if (lastResolvedAddress.current === accountAddress) return;
    lastResolvedAddress.current = accountAddress;
    void resolveWalletRole(accountAddress, 'employer');
  }, [accountAddress, connected, resolveWalletRole]);

  const handleEmployerCta = useCallback(() => {
    setPendingCTA('employer');
    setIsWalletDrawerOpen(false);
    persistAccountState(AccountState.ONBOARDING);
    startTransition(() => {
      router.push('/onboarding');
    });
  }, [router, setIsWalletDrawerOpen, startTransition]);

  const handleEmployeeCta = useCallback(() => {
    setPendingCTA('employee');
    startTransition(() => {
      router.push('/onboarding/employee');
    });
  }, [router, startTransition]);

  const handleWalletConnectClick = useCallback(() => {
    setIsWalletDrawerOpen(true);
  }, []);

  const handleDisconnect = useCallback(async () => {
    try {
      await Promise.resolve(disconnect());
      setWalletResolution(null);
      setWalletError(null);
      lastResolvedAddress.current = null;
      autoNavigatedFor.current = null;
      persistAccountState(AccountState.NEW_ACCOUNT);
      toast.success('Wallet disconnected');
    } catch (error) {
      console.error('Failed to disconnect wallet', error);
      toast.error('Failed to disconnect wallet');
    }
  }, [disconnect]);

  const openDestination = useCallback(
    (role: FlowType) => {
      setIsWalletDrawerOpen(false);
      toast.success(role === 'employee' ? 'Opening employee dashboard' : 'Opening employer dashboard');
      // Small delay to allow drawer to start closing animation
      setTimeout(() => {
        startTransition(() => {
          router.push('/dashboard');
        });
      }, 150);
    },
    [router, startTransition],
  );

  useEffect(() => {
    if (!connected || !accountAddress || !walletResolution || isCheckingWallet) return;
    if (walletResolution.dbUnavailable) return;
    if (autoNavigatedFor.current === accountAddress) return;

    autoNavigatedFor.current = accountAddress;

    if (walletResolution.found) {
      persistAccountState(AccountState.WALLET_CONNECTED);
      toast.success(
        walletResolution.role === 'employee'
          ? 'Wallet recognized. Redirecting to your employee dashboard.'
          : 'Welcome back. Redirecting to your employer dashboard.',
      );
      setIsWalletDrawerOpen(false);
      setTimeout(() => {
        startTransition(() => {
          router.push('/dashboard');
        });
      }, 150);
      return;
    }

    toast.success("Let's finish setting up your employer workspace.");
  }, [accountAddress, connected, isCheckingWallet, router, walletResolution, startTransition]);

  return (
    <div className="min-h-screen bg-background">
      <nav
        className={cn(
          'fixed top-4 left-1/2 z-50 -translate-x-1/2 transition-all duration-500',
          scrolled ? 'top-2' : 'top-4',
          mounted ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0',
        )}
      >
        <div
          className={cn(
            'mx-auto flex items-center justify-between gap-8 rounded-full border border-border/40 bg-background/80 px-8 py-4 backdrop-blur-xl transition-all duration-300',
            scrolled ? 'shadow-lg' : 'shadow-md',
          )}
        >
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Home
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              About
            </Link>
          </div>

          <Button
            size="lg"
            className="gap-2 rounded-full bg-linear-to-r from-primary to-primary/80 shadow-md transition-all hover:scale-101 hover:shadow-lg"
            onClick={handleWalletConnectClick}
          >
            <Wallet className="h-4 w-4" />
            <span>{connected && account ? 'Manage Wallet' : 'Connect Wallet'}</span>
          </Button>
        </div>
      </nav>

      <section className="relative overflow-hidden px-4 pt-32 pb-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_35%_at_50%_40%,hsl(var(--primary)/0.05),transparent)]" />

        <div className="container mx-auto">
          <div className="mx-auto max-w-4xl text-center">
            <div
              className={cn(
                'mb-6 inline-block transition-all delay-100 duration-500',
                mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
              )}
            >
              <Badge variant="outline" className="gap-2 rounded-full px-4 py-1.5">
                <Zap className="h-3.5 w-3.5" />
                Real-time Solana Payments
              </Badge>
            </div>

            <h1
              className={cn(
                'mb-6 text-5xl font-bold tracking-tight transition-all delay-200 duration-500 sm:text-6xl md:text-7xl lg:text-8xl',
                mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
              )}
            >
              Why wait 2 weeks
              <br />
              <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                to get paid?
              </span>
            </h1>

            <p
              className={cn(
                'mx-auto mb-10 max-w-2xl text-lg text-muted-foreground transition-all delay-300 duration-500 sm:text-xl',
                mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
              )}
            >
              Stream USDC to your team every hour, automatically. Employees withdraw what they&apos;ve earned the moment
              they need it—no more chasing payday.
            </p>

            <div
              className={cn(
                'flex flex-col items-center justify-center gap-4 transition-all delay-[400ms] duration-500 sm:flex-row',
                mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
              )}
            >
              <Button
                size="lg"
                className="group gap-2 rounded-full bg-linear-to-r from-primary to-primary/80 px-8 py-6 text-lg shadow-md transition-all duration-300 hover:scale-103 hover:shadow-lg"
                onClick={handleEmployerCta}
                disabled={pendingCTA === 'employer'}
              >
                {pendingCTA === 'employer' ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Starting…
                  </span>
                ) : (
                  <>
                    <span>Start Streaming Payroll</span>
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="group gap-2 rounded-full border-primary/20 bg-linear-to-r from-primary/10 to-primary/5 px-8 py-6 text-lg shadow-md transition-all duration-300 hover:scale-103 hover:from-primary/15 hover:to-primary/10 hover:shadow-lg"
                onClick={handleEmployeeCta}
                disabled={pendingCTA === 'employee'}
              >
                {pendingCTA === 'employee' ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Opening…
                  </span>
                ) : (
                  <>
                    <span>See What I&apos;ve Earned</span>
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </div>

            <p
              className={cn(
                'mt-6 text-sm text-muted-foreground transition-all delay-[450ms] duration-500',
                mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
              )}
            >
              Set up in under 5 minutes. No banks, no paperwork, no waiting.
            </p>
          </div>

          <div
            className={cn(
              'group relative mx-auto mt-24 max-w-360 transition-all delay-500 duration-1000',
              mounted ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-12 scale-95 opacity-0',
            )}
          >
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-primary/10 blur-3xl transition-all duration-500 group-hover:bg-primary/25" />

            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-linear-to-b from-card/80 to-card/40 shadow-2xl backdrop-blur-xl transition-all duration-500 group-hover:border-primary/40">
              <div className="absolute inset-0 rounded-2xl bg-linear-to-tr from-primary/20 via-transparent to-primary/10 transition-all duration-500 group-hover:from-primary/35 group-hover:to-primary/25" />

              <div className="relative overflow-hidden rounded-2xl">
                <Image
                  src="/dashboard-preview.png"
                  alt="Cascade Dashboard Preview"
                  width={2000}
                  height={1200}
                  className="w-full"
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 92vw, 1280px"
                  priority
                  draggable={false}
                />
              </div>
            </div>

            <div className="pointer-events-none absolute top-20 -left-20 -z-20 h-96 w-96 rounded-full bg-primary/20 blur-[120px] transition-all duration-500 group-hover:bg-primary/35" />
            <div className="pointer-events-none absolute -right-20 bottom-0 -z-20 h-96 w-96 rounded-full bg-primary/15 blur-[120px] transition-all duration-500 group-hover:bg-primary/30" />

            <div className="pointer-events-none absolute -bottom-32 left-1/2 -z-20 h-64 w-full max-w-4xl -translate-x-1/2 rounded-full bg-primary/10 blur-[100px] transition-all duration-500 group-hover:bg-primary/20" />
          </div>
        </div>

        <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-32 bg-linear-to-b from-transparent to-background" />
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <div
              className={cn(
                'mb-16 text-center transition-all delay-100 duration-500',
                mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
              )}
            >
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                Built for how work actually happens
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                Tired of reconciling timesheets? Done chasing invoice approvals? Cascade handles continuous payments so
                you can focus on building.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature, index) => (
                <Card
                  key={feature.title}
                  className={cn(
                    'border-border/50 bg-card/50 p-6 backdrop-blur-sm transition-all duration-500',
                    mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
                  )}
                  style={{
                    transitionDelay: `${200 + index * 50}ms`,
                  }}
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border/50 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <div
              className={cn(
                'mb-12 text-center transition-all delay-100 duration-500',
                mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
              )}
            >
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                What makes Cascade different
              </h2>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              {BENEFITS.map((benefit, index) => (
                <div
                  key={benefit.title}
                  className={cn(
                    'flex gap-4 transition-all duration-500',
                    mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
                  )}
                  style={{
                    transitionDelay: `${200 + index * 100}ms`,
                  }}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Check className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Drawer open={isWalletDrawerOpen} onOpenChange={setIsWalletDrawerOpen} direction="top">
        <DrawerContent className="mx-auto w-full max-w-lg rounded-b-3xl border-b border-border bg-card">
          <DrawerHeader className="pb-4">
            <DrawerTitle className="text-center text-base font-semibold">
              {connected && account ? 'Wallet Connected' : 'Connect a Wallet'}
            </DrawerTitle>
          </DrawerHeader>

          <div className="space-y-4 px-4 pb-6">
            {connected && account ? (
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                <p className="text-sm font-medium text-muted-foreground">Active wallet</p>
                <p className="mt-1 font-mono text-sm">{account.address}</p>
                {isCheckingWallet ? (
                  <Button className="mt-4 w-full" disabled>
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Checking access…
                    </span>
                  </Button>
                ) : walletResolution?.found ? (
                  <Button
                    className="mt-4 w-full"
                    onClick={() => openDestination(walletResolution.role)}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Opening…
                      </span>
                    ) : (
                      `Open ${walletResolution.role === 'employee' ? 'Employee Dashboard' : 'Employer Dashboard'}`
                    )}
                  </Button>
                ) : (
                  <Button
                    className="mt-4 w-full"
                    onClick={() => {
                      setIsWalletDrawerOpen(false);
                      // Small delay to allow drawer to start closing animation
                      setTimeout(() => {
                        startTransition(() => {
                          router.push('/onboarding');
                        });
                      }, 150);
                    }}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Starting…
                      </span>
                    ) : (
                      'Start Employer Onboarding'
                    )}
                  </Button>
                )}

                {walletError ? (
                  <div className="mt-3 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {walletError}
                  </div>
                ) : null}

                {!isCheckingWallet && walletResolution && !walletResolution.found ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    This wallet is not registered yet. Employers can begin onboarding above. Employees need to open the
                    invite link that was emailed to them.
                  </p>
                ) : null}

                {accountAddress && (walletError || walletResolution?.dbUnavailable) ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => resolveWalletRole(accountAddress)}
                    disabled={isCheckingWallet}
                  >
                    Retry Lookup
                  </Button>
                ) : null}

                <Button variant="ghost" className="mt-2 w-full" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {wallets.length ? (
                  wallets.map((wallet) => <WalletOptionButton key={wallet.name} wallet={wallet} />)
                ) : (
                  <div className="rounded-lg border border-dashed border-border/60 p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      No wallets detected.{' '}
                      <a
                        className="text-primary underline"
                        href="https://solana.com/solana-wallets"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Get a Solana wallet
                      </a>{' '}
                      to continue.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="mx-auto mt-4 h-1 w-12 rounded-full bg-muted-foreground/40" />
          </div>
        </DrawerContent>
      </Drawer>

      <footer
        className={cn(
          'border-t border-border/50 py-8 transition-all delay-500 duration-500',
          mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
        )}
      >
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Cascade</span>
            </div>
            <p className="text-sm text-muted-foreground">Payroll that flows • Powered by Solana</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FEATURES = [
  {
    icon: Zap,
    title: 'Hourly Payments, Automatically',
    description: 'Money flows to your team every hour. No spreadsheets, no batch processing, no delays.',
  },
  {
    icon: Check,
    title: 'See Every Dollar in Real-Time',
    description: 'Watch vault balances update live. Know exactly what you owe and what employees can withdraw.',
  },
  {
    icon: ArrowRight,
    title: 'Withdraw in One Click',
    description: 'Employees grab their earned funds instantly. No approval chains, no 3-5 business days.',
  },
  {
    icon: Zap,
    title: 'Stay in Control',
    description: 'Pause streams, emergency withdraw, or close positions anytime. Your treasury, your rules.',
  },
  {
    icon: Check,
    title: 'Never Miss a Beat',
    description: 'Automatic inactivity detection keeps streams healthy. Set it and forget it.',
  },
  {
    icon: ArrowRight,
    title: 'Pay in Any Token',
    description: 'Stream USDC, USDT, or any SPL token. Your team chooses how they want to get paid.',
  },
];

const BENEFITS = [
  {
    title: 'Every Payment is Permanent',
    description: "Solana records every transaction. No disputes about hours worked or payments made—it's all on-chain.",
  },
  {
    title: 'Cut Out the Middlemen',
    description: 'Wallet-to-wallet transfers mean no banks, no processors, no 2-day holds. Funds move in seconds.',
  },
  {
    title: 'Top Up Without Stopping',
    description: 'Running low? Add funds to active streams instantly. No need to restart anything.',
  },
  {
    title: 'Your Wallet, Your Money',
    description: 'Employees own their keys and control their funds. Withdraw earned wages anytime, day or night.',
  },
];
