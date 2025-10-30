'use client';

import { useState } from 'react';

import { Copy, Plus, Trash2, Zap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAccountStateConfig } from '@/lib/config/account-states';

import { useDashboard } from '../dashboard-context';
import { EmptyState } from '../empty-state';

interface StreamTemplate {
  id: string;
  name: string;
  description: string;
  hourlyRate: number;
  currency: string;
  tags: string[];
  createdAt: string;
  usageCount: number;
}

const MOCK_TEMPLATES: StreamTemplate[] = [
  {
    id: '1',
    name: 'Junior Developer',
    description: 'Standard rate for junior developers',
    hourlyRate: 25,
    currency: 'USDC',
    tags: ['development', 'junior'],
    createdAt: '2024-10-01T10:00:00Z',
    usageCount: 5,
  },
  {
    id: '2',
    name: 'Senior Developer',
    description: 'Premium rate for senior developers',
    hourlyRate: 50,
    currency: 'USDC',
    tags: ['development', 'senior'],
    createdAt: '2024-10-02T14:30:00Z',
    usageCount: 3,
  },
  {
    id: '3',
    name: 'Designer',
    description: 'Standard rate for UI/UX designers',
    hourlyRate: 35,
    currency: 'USDC',
    tags: ['design'],
    createdAt: '2024-10-05T08:00:00Z',
    usageCount: 2,
  },
];

export function TemplatesTab() {
  const [templates, setTemplates] = useState(MOCK_TEMPLATES);
  const { accountState, setupProgress, setIsCreateStreamModalOpen } = useDashboard();
  const config = getAccountStateConfig(accountState);

  const deleteTemplate = (id: string) => {
    setTemplates(templates.filter((t) => t.id !== id));
  };

  if (!config.showTemplatesTab) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Stream Templates</h1>
          <p className="text-muted-foreground">Create reusable payment stream configurations</p>
        </div>
        <EmptyState
          icon={<Plus className="h-12 w-12 text-muted-foreground" />}
          title="Templates Coming Soon"
          description="Create your first payment stream to unlock stream templates"
        />
      </div>
    );
  }

  if (!setupProgress.streamCreated) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Stream Templates</h1>
          <p className="text-muted-foreground">Create reusable payment stream configurations</p>
        </div>
        <EmptyState
          icon={<Zap className="h-12 w-12 text-muted-foreground" />}
          title="Templates unlock after your first stream"
          description="Launch a live payment stream to start saving configurations as reusable templates."
          action={{
            label: 'Create Stream',
            onClick: () => setIsCreateStreamModalOpen(true),
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stream Templates</h1>
          <p className="text-muted-foreground">Create reusable payment stream configurations</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          icon={<Plus className="h-12 w-12 text-muted-foreground" />}
          title="No templates yet"
          description="Create reusable payment stream templates to speed up stream creation"
          action={{
            label: 'Create Template',
            onClick: () => console.log('Create template'),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">${template.hourlyRate}</span>
                  <span className="text-muted-foreground">/ hour {template.currency}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {template.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="text-sm text-muted-foreground">Used {template.usageCount} times</div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-2 bg-transparent">
                    <Copy className="h-4 w-4" />
                    Use Template
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteTemplate(template.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Created {new Date(template.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
