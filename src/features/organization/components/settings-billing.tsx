'use client';

import { useState } from 'react';

import { CreditCard, Download } from 'lucide-react';

import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/core/ui/card';

export function SettingsBilling() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const planPrice = billingCycle === 'monthly' ? '$99/month' : '$999/year';
  const billingNote =
    billingCycle === 'monthly' ? 'Billed monthly.' : 'Billed annually • Save 15% compared to monthly billing.';

  return (
    <div className="space-y-4">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Manage your subscription and billing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            {(
              [
                { label: 'Monthly', value: 'monthly' as const },
                { label: 'Annual', value: 'annual' as const },
              ] satisfies Array<{ label: string; value: 'monthly' | 'annual' }>
            ).map((option) => (
              <Button
                key={option.value}
                variant={billingCycle === option.value ? 'default' : 'outline'}
                onClick={() => setBillingCycle(option.value)}
                className="flex-1"
              >
                {option.label}
              </Button>
            ))}
          </div>
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">Professional</p>
                <p className="text-sm text-muted-foreground">{planPrice}</p>
                <p className="mt-1 text-xs text-muted-foreground">{billingNote}</p>
              </div>
              <Badge className="bg-blue-500/10 text-blue-700">Active</Badge>
            </div>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>✓ Up to 100 employees</li>
              <li>✓ Unlimited streams</li>
              <li>✓ Priority support</li>
              <li>✓ Advanced analytics</li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline">Change Plan</Button>
            <Button variant="outline">Cancel Subscription</Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
          <CardDescription>Update your billing information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-border p-4">
            <CreditCard className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium">Visa ending in 4242</p>
              <p className="text-sm text-muted-foreground">Expires 12/25</p>
            </div>
            <Badge variant="secondary">Default</Badge>
          </div>

          <Button variant="outline" className="w-full bg-transparent">
            Update Payment Method
          </Button>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>View and download your invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { date: 'Oct 25, 2025', amount: '$99.00', status: 'Paid' },
              { date: 'Sep 25, 2025', amount: '$99.00', status: 'Paid' },
              { date: 'Aug 25, 2025', amount: '$99.00', status: 'Paid' },
            ].map((invoice, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">{invoice.date}</p>
                  <p className="text-sm text-muted-foreground">{invoice.amount}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {invoice.status}
                  </Badge>
                  <Button variant="ghost" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
