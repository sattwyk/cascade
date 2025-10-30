export type EmployeeStatus = 'draft' | 'invited' | 'ready' | 'archived';

export type EmployeeSummary = {
  id: string;
  name: string;
  email: string | null;
  status: EmployeeStatus;
  department: string | null;
  location: string | null;
  employmentType: string | null;
  primaryWallet: string | null;
  hourlyRateUsd: number | null;
  linkedStreams: number;
  invitedAt: string | null;
  createdAt: string;
  tags: string[];
};
