import { AlertCircle, Book, ExternalLink, MessageCircle } from 'lucide-react';

import { DashboardFeatureFlagDisabled } from '@/components/dashboard/feature-flag-disabled';
import { employeeDashboardHelpViewFlag } from '@/core/config/flags';
import { Button } from '@/core/ui/button';
import { Card } from '@/core/ui/card';

const helpTopics = [
  {
    title: 'Getting Started',
    description: 'Learn how to connect your wallet and view your payment streams',
    icon: Book,
  },
  {
    title: 'Withdrawing Funds',
    description: 'Understand how to withdraw your earned payments',
    icon: AlertCircle,
  },
  {
    title: 'Understanding Streams',
    description: 'Learn about how real-time payment streaming works',
    icon: Book,
  },
];

export default async function EmployeeHelpPage() {
  if (!(await employeeDashboardHelpViewFlag())) {
    return (
      <DashboardFeatureFlagDisabled
        title="Help & Support"
        description="Enable `dashboard_employee_help_view` to access this employee dashboard page."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Help & Support</h1>
        <p className="text-muted-foreground">Get help with Cascade and learn more about payment streaming</p>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Help Topics</h2>
        <div className="space-y-3">
          {helpTopics.map((topic) => (
            <div
              key={topic.title}
              className="flex items-start gap-4 rounded-lg border border-border/50 bg-muted/30 p-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <topic.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{topic.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{topic.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Contact Support</h2>
        <div className="space-y-3">
          <Button variant="outline" className="w-full justify-start gap-2">
            <MessageCircle className="h-4 w-4" />
            Contact Support Team
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2" asChild>
            <a href="https://docs.cascade.com" target="_blank" rel="noopener noreferrer">
              <Book className="h-4 w-4" />
              View Documentation
              <ExternalLink className="ml-auto h-4 w-4" />
            </a>
          </Button>
        </div>
      </Card>
    </div>
  );
}
