'use client';

import { Check } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type ChecklistAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

export type OverviewChecklistStep = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  stepNumber: number;
  optional?: boolean;
  action?: ChecklistAction;
};

interface OverviewChecklistProps {
  steps: OverviewChecklistStep[];
}

export function OverviewChecklist({ steps }: OverviewChecklistProps) {
  const requiredSteps = steps.filter((item) => !item.optional);
  const totalRequiredSteps = requiredSteps.length;
  const completedRequiredSteps = requiredSteps.filter((item) => item.completed).length;
  const fallbackCompletedSteps = steps.filter((item) => item.completed).length;
  const progressLabel =
    totalRequiredSteps > 0
      ? `${completedRequiredSteps}/${totalRequiredSteps}`
      : `${fallbackCompletedSteps}/${steps.length}`;
  const nextIncomplete = requiredSteps.find((item) => !item.completed);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Setup Checklist</CardTitle>
          <Badge variant="secondary">{progressLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {steps.map((item) => {
            const isCurrent = !item.optional && nextIncomplete?.id === item.id;

            return (
              <div
                key={item.id}
                className={cn(
                  'flex items-center gap-4 rounded-lg border p-3 transition-colors',
                  item.completed
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : isCurrent
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border hover:bg-muted/50',
                )}
              >
                <div className="mt-1 shrink-0">
                  {item.completed ? (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <Check className="h-4 w-4" />
                    </div>
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-muted-foreground text-xs font-semibold text-muted-foreground">
                      {item.stepNumber}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className={cn(
                        'font-medium',
                        item.completed ? 'text-muted-foreground line-through' : 'text-foreground',
                      )}
                    >
                      {item.title}
                    </p>
                    {item.optional ? (
                      <Badge
                        variant="outline"
                        className="border-dashed px-1.5 py-0 text-[10px] tracking-wide uppercase"
                      >
                        Optional
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                {!item.completed && item.action ? (
                  <Button size="sm" onClick={item.action.onClick} disabled={item.action.disabled}>
                    {item.action.label}
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
