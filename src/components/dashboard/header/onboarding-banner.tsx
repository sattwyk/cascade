'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ChevronRight, Rocket } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { useDashboard } from '../dashboard-context';

export function OnboardingBanner() {
  const { isOnboardingRequired } = useDashboard();
  const pathname = usePathname();

  const shouldShow = isOnboardingRequired && pathname !== '/onboarding';

  if (!shouldShow) return null;

  return (
    <div className="animate-in border-b border-orange-200 bg-linear-to-r from-orange-50 to-amber-50 px-6 py-3 duration-300 slide-in-from-top md:px-8 dark:border-orange-900/30 dark:from-orange-950/20 dark:to-amber-950/20">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/40">
            <Rocket className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
              Complete your setup to unlock all features
            </p>
            <p className="text-xs text-orange-700 dark:text-orange-300">
              Finish the 4-step onboarding process to start managing payroll streams
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-2 bg-orange-600 text-white hover:bg-orange-700" asChild>
            <Link href="/onboarding">
              Continue Setup
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
