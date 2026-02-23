'use client';

import { Check, ExternalLink } from 'lucide-react';

import { Button } from '@/core/ui/button';
import { Card, CardContent } from '@/core/ui/card';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  connected: boolean;
  category: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'slack',
    name: 'Slack',
    description: 'Get notifications in Slack',
    icon: '🔔',
    connected: true,
    category: 'Communication',
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Connect your GitHub account',
    icon: '🐙',
    connected: false,
    category: 'Development',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Manage payments and billing',
    icon: '💳',
    connected: true,
    category: 'Payments',
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Automate workflows',
    icon: '⚡',
    connected: false,
    category: 'Automation',
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    description: 'Export data to Google Sheets',
    icon: '📊',
    connected: false,
    category: 'Data',
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Get notifications in Discord',
    icon: '💬',
    connected: false,
    category: 'Communication',
  },
];

export function SettingsIntegrations() {
  const categories = Array.from(new Set(INTEGRATIONS.map((i) => i.category)));

  return (
    <div className="space-y-6">
      {categories.map((category) => (
        <div key={category}>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">{category}</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {INTEGRATIONS.filter((i) => i.category === category).map((integration) => (
              <Card key={integration.id}>
                <CardContent className="pt-6">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{integration.icon}</span>
                      <div>
                        <p className="font-medium">{integration.name}</p>
                        <p className="text-xs text-muted-foreground">{integration.description}</p>
                      </div>
                    </div>
                    {integration.connected && <Check className="h-5 w-5 text-green-600" />}
                  </div>

                  <Button variant={integration.connected ? 'outline' : 'default'} size="sm" className="w-full gap-2">
                    {integration.connected ? 'Manage' : 'Connect'}
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
