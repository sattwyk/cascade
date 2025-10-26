'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { UiWallet, useWalletUi, useWalletUiWallet } from '@wallet-ui/react';
import { ArrowRight, Check, Wallet, Zap } from 'lucide-react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

function WalletOptionButton({ wallet, onConnected }: { wallet: UiWallet; onConnected: () => void }) {
  const { connect, isConnecting } = useWalletUiWallet({ wallet });

  const handleSelect = async () => {
    try {
      await connect();
      onConnected();
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

export const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isWalletDrawerOpen, setIsWalletDrawerOpen] = useState(false);
  const router = useRouter();
  const { account, connected, disconnect, wallets } = useWalletUi();

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
            className="gap-2 rounded-full bg-gradient-to-r from-primary to-primary/80 shadow-md transition-all hover:scale-101 hover:shadow-lg"
            onClick={() => setIsWalletDrawerOpen(true)}
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
              Stream payments
              <br />
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                hour by hour
              </span>
            </h1>

            <p
              className={cn(
                'mx-auto mb-10 max-w-2xl text-lg text-muted-foreground transition-all delay-300 duration-500 sm:text-xl',
                mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
              )}
            >
              Real-time payroll streaming on Solana. Pay employees by the hour with transparent, on-chain settlement and
              zero friction.
            </p>

            <div
              className={cn(
                'flex flex-col items-center justify-center gap-4 transition-all delay-[400ms] duration-500 sm:flex-row',
                mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
              )}
            >
              <Button
                asChild
                size="lg"
                className="group gap-2 rounded-full bg-gradient-to-r from-primary to-primary/80 px-8 py-6 text-lg shadow-md transition-all duration-300 hover:scale-103 hover:shadow-lg"
              >
                <Link href="/dashboard">
                  Start Paying
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="group gap-2 rounded-full border-primary/20 bg-gradient-to-r from-primary/10 to-primary/5 px-8 py-6 text-lg shadow-md transition-all duration-300 hover:scale-103 hover:from-primary/15 hover:to-primary/10 hover:shadow-lg"
              >
                <Link href="/">
                  Join Your Organization
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>

          <div
            className={cn(
              'group relative mx-auto mt-24 max-w-[90rem] transition-all delay-500 duration-1000',
              mounted ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-12 scale-95 opacity-0',
            )}
          >
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-primary/10 blur-3xl transition-all duration-500 group-hover:bg-primary/25" />

            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-b from-card/80 to-card/40 shadow-2xl backdrop-blur-xl transition-all duration-500 group-hover:border-primary/40">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-primary/20 via-transparent to-primary/10 transition-all duration-500 group-hover:from-primary/35 group-hover:to-primary/25" />

              <div className="relative overflow-hidden rounded-2xl">
                <Image
                  src="/dashboard-preview.png"
                  alt="Cascade Dashboard Preview"
                  width={2000}
                  height={1200}
                  className="w-full"
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

        <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-32 bg-gradient-to-b from-transparent to-background" />
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
                Built for modern payroll
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                Everything you need to manage hourly compensation on-chain
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
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">Why Cascade?</h2>
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
                <Button
                  className="mt-4 w-full"
                  onClick={() => {
                    setIsWalletDrawerOpen(false);
                    router.push('/dashboard');
                  }}
                >
                  Open Dashboard
                </Button>
                <Button
                  variant="ghost"
                  className="mt-2 w-full"
                  onClick={async () => {
                    try {
                      await disconnect();
                      toast.success('Wallet disconnected');
                    } catch (error) {
                      console.error('Failed to disconnect wallet', error);
                      toast.error('Failed to disconnect wallet');
                    }
                  }}
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {wallets.length ? (
                  wallets.map((wallet) => (
                    <WalletOptionButton
                      key={wallet.name}
                      wallet={wallet}
                      onConnected={() => {
                        setIsWalletDrawerOpen(false);
                        router.push('/dashboard');
                      }}
                    />
                  ))
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
            <p className="text-sm text-muted-foreground">Built on Solana • Real-time payment streaming</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FEATURES = [
  {
    icon: Zap,
    title: 'Hourly Streaming',
    description: 'Pay employees by the hour with automatic, continuous token streams on Solana',
  },
  {
    icon: Check,
    title: 'Transparent Balances',
    description: 'Real-time visibility into vault balances, deposits, and withdrawals',
  },
  {
    icon: ArrowRight,
    title: 'Simple Withdrawals',
    description: 'Employees can withdraw earned funds anytime with a single transaction',
  },
  {
    icon: Zap,
    title: 'Emergency Controls',
    description: 'Employer emergency withdrawal and stream closure for full control',
  },
  {
    icon: Check,
    title: 'Activity Tracking',
    description: 'Automatic inactivity detection and refresh mechanisms',
  },
  {
    icon: ArrowRight,
    title: 'Multi-Token Support',
    description: 'Stream payments in USDC, USDT, or any SPL token',
  },
];

const BENEFITS = [
  {
    title: 'On-Chain Settlement',
    description: 'Every payment is recorded on Solana, providing immutable proof and complete transparency',
  },
  {
    title: 'Zero Intermediaries',
    description: 'Direct wallet-to-wallet transfers eliminate traditional payroll processing delays',
  },
  {
    title: 'Flexible Top-Ups',
    description: 'Add funds to active streams at any time to maintain continuous payment flow',
  },
  {
    title: 'Employee Control',
    description: 'Workers maintain custody of their wallets and can access earned funds instantly',
  },
];
