'use client';

import { Copy, ExternalLink, PiggyBank, Plus, Wallet } from 'lucide-react';
import { toast } from 'sonner';

import { useDashboard } from '@/components/dashboard/dashboard-context';
import { EmptyState } from '@/components/dashboard/empty-state';
import { getAccountStateConfig } from '@/core/config/account-states';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/core/ui/card';

interface TokenAccount {
  id: string;
  mint: string;
  address: string;
  balance: number;
  decimals: number;
  owner: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

const MOCK_TOKEN_ACCOUNTS: TokenAccount[] = [
  {
    id: '1',
    mint: 'EPjFWaLb3odcccccccccccccccccccccccccccccccc',
    address: '9B5X4b...8f2a',
    balance: 5000.5,
    decimals: 6,
    owner: 'Organization',
    status: 'active',
    createdAt: '2024-10-01T10:00:00Z',
  },
  {
    id: '2',
    mint: 'So11111111111111111111111111111111111111112',
    address: '7K9X2c...3d1b',
    balance: 2.5,
    decimals: 9,
    owner: 'Organization',
    status: 'active',
    createdAt: '2024-10-05T14:30:00Z',
  },
  {
    id: '3',
    mint: 'EPjFWaLb3odcccccccccccccccccccccccccccccccc',
    address: '4M8Y1a...5e4c',
    balance: 0,
    decimals: 6,
    owner: 'Organization',
    status: 'inactive',
    createdAt: '2024-09-15T08:00:00Z',
  },
];

export function TokenAccountsTab() {
  const { accountState, setupProgress, openTopUpAccountModal } = useDashboard();
  const config = getAccountStateConfig(accountState);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard', {
      description: `${id.replace(/^mint-/, 'Mint ')} address copied.`,
    });
  };

  if (!setupProgress.walletConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Token Accounts</h1>
          <p className="text-muted-foreground">Manage your Solana token accounts</p>
        </div>
        <EmptyState
          icon={<Wallet className="h-12 w-12 text-muted-foreground" />}
          title="Connect your wallet to continue"
          description="Link the employer treasury wallet to review or create token accounts."
        />
      </div>
    );
  }

  if (!setupProgress.tokenAccountFunded) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Token Accounts</h1>
          <p className="text-muted-foreground">Manage your Solana token accounts</p>
        </div>
        <EmptyState
          icon={<PiggyBank className="h-12 w-12 text-muted-foreground" />}
          title="Fund your primary token account"
          description="Top up the account that will power upcoming payroll streams."
          action={{
            label: 'Top Up Account',
            onClick: openTopUpAccountModal,
          }}
        />
      </div>
    );
  }

  if (!config.showTokenAccountsTab) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Token Accounts</h1>
          <p className="text-muted-foreground">Manage your Solana token accounts</p>
        </div>
        <EmptyState
          icon={<Plus className="h-12 w-12 text-muted-foreground" />}
          title="Token Accounts Coming Soon"
          description="Complete your wallet setup to manage token accounts"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Token Accounts</h1>
          <p className="text-muted-foreground">Manage your Solana token accounts</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Account
        </Button>
      </div>

      {/* Token accounts grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {MOCK_TOKEN_ACCOUNTS.map((account) => (
          <Card key={account.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">Token Account</CardTitle>
                  <CardDescription className="font-mono text-xs">{account.address}</CardDescription>
                </div>
                <Badge variant={account.status === 'active' ? 'default' : 'secondary'}>{account.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Balance</p>
                  <p className="text-lg font-semibold">{account.balance.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Decimals</p>
                  <p className="text-lg font-semibold">{account.decimals}</p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm text-muted-foreground">Mint Address</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 overflow-auto rounded bg-muted p-2 text-xs">{account.mint}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(account.mint, `mint-${account.id}`)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-2 bg-transparent">
                  <ExternalLink className="h-4 w-4" />
                  View on Explorer
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Created {new Date(account.createdAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
