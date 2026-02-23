'use client';

import { Plus, Trash2 } from 'lucide-react';

import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/core/ui/card';

interface Wallet {
  id: string;
  address: string;
  label: string;
  isDefault: boolean;
  balance: number;
  mint: string;
}

const MOCK_WALLETS: Wallet[] = [
  {
    id: '1',
    address: '7xL...abc123',
    label: 'Primary Wallet',
    isDefault: true,
    balance: 8200,
    mint: 'USDC',
  },
  {
    id: '2',
    address: '7xL...def456',
    label: 'Backup Wallet',
    isDefault: false,
    balance: 2500,
    mint: 'USDC',
  },
];

export function SettingsWallets() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Connected Wallets</CardTitle>
          <CardDescription>Manage your Solana wallets and token accounts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {MOCK_WALLETS.map((wallet) => (
            <div key={wallet.id} className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <p className="font-medium">{wallet.label}</p>
                  {wallet.isDefault && (
                    <Badge variant="secondary" className="text-xs">
                      Default
                    </Badge>
                  )}
                </div>
                <code className="text-xs text-muted-foreground">{wallet.address}</code>
                <p className="mt-2 text-sm">
                  <span className="font-semibold">${wallet.balance}</span>
                  <span className="ml-2 text-muted-foreground">{wallet.mint}</span>
                </p>
              </div>
              <Button variant="ghost" size="icon" className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button className="mt-4 w-full gap-2">
            <Plus className="h-4 w-4" />
            Add Wallet
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Default Token Mint</CardTitle>
          <CardDescription>Select the default SPL token for new streams</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <p className="font-medium">USDC</p>
              <p className="text-sm text-muted-foreground">USD Coin</p>
            </div>
            <Button variant="outline" className="w-full bg-transparent">
              Change Default Mint
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
