'use client';

import { ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getAccountStateConfig, getAllAccountStates } from '@/lib/config/account-states';

import { useDashboard } from '../dashboard-context';

export function StateSwitcher() {
  return null;
  const { accountState, setAccountState } = useDashboard();
  const currentConfig = getAccountStateConfig(accountState);
  const allStates = getAllAccountStates();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <span className="text-xs font-medium">State: {currentConfig.label}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Account States</p>
        </div>
        {allStates.map((state) => (
          <DropdownMenuItem
            key={state.state}
            onClick={() => setAccountState(state.state)}
            className="flex cursor-pointer flex-col items-start gap-1"
          >
            <span className="text-sm font-medium">{state.label}</span>
            <span className="text-xs text-muted-foreground">{state.description}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
