'use client';

import type React from 'react';

import { Button } from '@/core/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/core/ui/empty';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Empty>
      <EmptyHeader>
        {icon && <EmptyMedia variant="icon">{icon}</EmptyMedia>}
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action && (
        <EmptyContent>
          <Button onClick={action.onClick} disabled={action.disabled}>
            {action.label}
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}
