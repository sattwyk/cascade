'use client';

import { AlertTriangle } from 'lucide-react';

import { Button } from '@/core/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/core/ui/card';

export function SettingsDangerZone() {
  return (
    <div className="space-y-4">
      <Card className="border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <CardTitle>Danger Zone</CardTitle>
              <CardDescription>Irreversible actions that require caution</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <h3 className="mb-2 font-semibold text-destructive">Reset Organization</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              This will reset all organization settings and close all active streams. This action cannot be undone.
            </p>
            <Button variant="destructive">Reset Organization</Button>
          </div>

          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <h3 className="mb-2 font-semibold text-destructive">Delete Account</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Permanently delete your Cascade account and all associated data. This action cannot be undone.
            </p>
            <Button variant="destructive">Delete Account</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
