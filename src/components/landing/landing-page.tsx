'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import { ArrowRight, Check, Zap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

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

          <Button asChild size="lg" className="gap-2 rounded-full">
            <Link href="/dashboard">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </nav>

      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_35%_at_50%_40%,hsl(var(--primary)/0.05),transparent)]" />

        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <div
              className={cn(
                'mb-6 transition-all delay-100 duration-500',
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
                'mb-6 text-5xl font-bold tracking-tight transition-all delay-200 duration-500 sm:text-6xl md:text-7xl',
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
                'mb-10 text-lg text-muted-foreground transition-all delay-300 duration-500 sm:text-xl',
                mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
              )}
            >
              Real-time payroll streaming on Solana. Pay employees by the hour with transparent,
              <br className="hidden sm:block" />
              on-chain settlement and zero friction.
            </p>

            <div
              className={cn(
                'flex flex-col items-center justify-center gap-4 transition-all delay-[400ms] duration-500 sm:flex-row',
                mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
              )}
            >
              <Button asChild size="lg" className="group gap-2 rounded-full text-base transition-all hover:scale-105">
                <Link href="/dashboard">
                  Start Streaming
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="gap-2 rounded-full text-base transition-all hover:scale-105"
              >
                <Link href="/account">Connect Wallet</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <div
              className={cn(
                'mb-16 text-center transition-all delay-500 duration-500',
                mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
              )}
            >
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">Built for modern payroll</h2>
              <p className="text-lg text-muted-foreground">
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
                    transitionDelay: `${600 + index * 50}ms`,
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
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">Why Cascade?</h2>
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
