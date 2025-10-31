'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { useWalletUi } from '@wallet-ui/react';
import type { Address } from 'gill';
import { PiggyBank, Plus, UserPlus, Wallet } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useGetTokenAccountsQuery } from '@/features/account/data-access/use-get-token-accounts-query';
import { useDashboardEmployeesQuery } from '@/features/dashboard/data-access/use-dashboard-employees-query';
import { hasPositiveTokenBalance, NULL_ADDRESS } from '@/lib/solana/token-helpers';
import type { EmployeeSummary } from '@/types/employee';

import { useDashboard } from '../dashboard-context';
import { EmployeeDetailPanel } from '../employees/employee-detail-panel';
import { EmployeeDirectory } from '../employees/employee-directory';
import { EmptyState } from '../empty-state';

type EmployeeFilterStatus = 'all' | 'ready' | 'draft' | 'invited' | 'archived';

interface EmployeesTabProps {
  filterState?: string;
  employees: EmployeeSummary[];
}

const employeeStatusToPath: Record<EmployeeFilterStatus, string> = {
  all: '/dashboard/employees',
  ready: '/dashboard/employees',
  draft: '/dashboard/employees',
  invited: '/dashboard/employees/invitations',
  archived: '/dashboard/employees/archived',
};

const employeeStatusToPageKey: Record<EmployeeFilterStatus, string> = {
  all: 'directory',
  ready: 'directory',
  draft: 'directory',
  invited: 'invitations',
  archived: 'archived',
};

function deriveEmployeeStatus(pageKey?: string): EmployeeFilterStatus {
  switch (pageKey) {
    case 'invitations':
      return 'invited';
    case 'archived':
      return 'archived';
    default:
      return 'all';
  }
}

export function EmployeesTab({ filterState, employees }: EmployeesTabProps) {
  const {
    setIsAddEmployeeModalOpen,
    setupProgress,
    setIsTopUpAccountModalOpen,
    setSelectedEmployee,
    setSelectedEmployeeId: setDashboardSelectedEmployeeId,
  } = useDashboard();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticPageKey, setOptimisticPageKey] = useState(filterState);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const { account } = useWalletUi();
  const walletAddress = (account?.address as Address) ?? NULL_ADDRESS;
  const tokenAccountsQuery = useGetTokenAccountsQuery({ address: walletAddress, enabled: Boolean(account?.address) });
  const tokenFundingComplete = useMemo(
    () => setupProgress.tokenAccountFunded || hasPositiveTokenBalance(tokenAccountsQuery.data),
    [setupProgress.tokenAccountFunded, tokenAccountsQuery.data],
  );
  const walletConnected = setupProgress.walletConnected || Boolean(account?.address);

  // Use client-side query to keep data fresh
  const { data: clientEmployees } = useDashboardEmployeesQuery();

  // Prefer client-side data if available, fall back to server props
  const activeEmployees = useMemo(
    () => (clientEmployees && clientEmployees.length > 0 ? clientEmployees : employees),
    [clientEmployees, employees],
  );

  useEffect(() => {
    setOptimisticPageKey(filterState);
  }, [filterState]);

  const filterStatus = useMemo<EmployeeFilterStatus>(
    () => deriveEmployeeStatus(optimisticPageKey),
    [optimisticPageKey],
  );

  const handleFilterChange = (status: EmployeeFilterStatus) => {
    setSelectedEmployeeId(null);
    setDashboardSelectedEmployeeId(null);
    setSelectedEmployee(null);

    const nextPageKey = employeeStatusToPageKey[status];
    setOptimisticPageKey(nextPageKey);

    startTransition(() => {
      router.push(employeeStatusToPath[status]);
    });
  };

  const hasEmployees = activeEmployees.length > 0;
  const selectedEmployee = useMemo(
    () => activeEmployees.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [activeEmployees, selectedEmployeeId],
  );
  const showWalletGate = !walletConnected && !hasEmployees;
  const showFundingGate = walletConnected && !tokenFundingComplete && !hasEmployees;
  const canInviteEmployees = walletConnected && tokenFundingComplete;

  useEffect(() => {
    if (!selectedEmployee) {
      setDashboardSelectedEmployeeId(null);
      setSelectedEmployee(null);
      return;
    }
    setDashboardSelectedEmployeeId(selectedEmployee.id);
    setSelectedEmployee(selectedEmployee);
  }, [selectedEmployee, setDashboardSelectedEmployeeId, setSelectedEmployee]);

  const handleSelectEmployee = (employee: EmployeeSummary) => {
    setSelectedEmployeeId(employee.id);
    setDashboardSelectedEmployeeId(employee.id);
    setSelectedEmployee(employee);
  };

  const handleCloseDetail = () => {
    setSelectedEmployeeId(null);
    setDashboardSelectedEmployeeId(null);
    setSelectedEmployee(null);
  };

  return (
    <div className="space-y-6" aria-busy={isPending}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Manage your employee directory</p>
        </div>
        <Button onClick={() => setIsAddEmployeeModalOpen(true)} className="gap-2" disabled={!canInviteEmployees}>
          <Plus className="h-4 w-4" />
          Invite Employee
        </Button>
      </div>

      {showWalletGate ? (
        <EmptyState
          icon={<Wallet className="h-12 w-12 text-muted-foreground" />}
          title="Connect your employer wallet"
          description="Link a treasury wallet before inviting or managing employees."
        />
      ) : showFundingGate ? (
        <EmptyState
          icon={<PiggyBank className="h-12 w-12 text-muted-foreground" />}
          title="Fund your default token account"
          description="Top up the payroll token account to unlock employee invitations."
          action={{
            label: 'Top Up Account',
            onClick: () => setIsTopUpAccountModalOpen(true),
          }}
        />
      ) : !hasEmployees ? (
        <EmptyState
          icon={<UserPlus className="h-12 w-12 text-muted-foreground" />}
          title="Invite your first employee"
          description="Create a profile or send an invitation so you can spin up a stream."
          action={{
            label: 'Add Employee',
            onClick: () => setIsAddEmployeeModalOpen(true),
          }}
        />
      ) : (
        <div>
          <EmployeeDirectory
            filterStatus={filterStatus}
            onFilterChange={handleFilterChange}
            onSelectEmployee={handleSelectEmployee}
            selectedEmployeeId={selectedEmployeeId}
            employees={activeEmployees}
            onInviteEmployee={() => setIsAddEmployeeModalOpen(true)}
          />
        </div>
      )}

      {selectedEmployee && (
        <EmployeeDetailPanel employee={selectedEmployee} onClose={handleCloseDetail} isOpen={!!selectedEmployee} />
      )}
    </div>
  );
}
