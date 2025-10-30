import type { StreamState } from '@/lib/enums';

export interface DashboardStream {
  id: string;
  employeeId: string | null;
  employeeName: string;
  employeeWallet: string | null;
  streamAddress: string;
  vaultAddress: string;
  employerWallet: string;
  employerTokenAccount: string;
  mintAddress: string;
  mintLabel: string;
  hourlyRate: number;
  totalDeposited: number;
  withdrawnAmount: number;
  vaultBalance: number;
  availableToWithdraw: number;
  status: StreamState;
  cluster: string;
  createdAt: string;
  lastActivityAt: string | null;
  deactivatedAt: string | null;
  closedAt: string | null;
}
