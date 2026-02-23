'use client';

import { useState } from 'react';

import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/core/ui/card';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/ui/select';

export function SettingsOrganization() {
  const [organizationName, setOrganizationName] = useState('Acme Corp');
  const [supportEmail, setSupportEmail] = useState('support@acme.com');
  const [timezone, setTimezone] = useState('America/Los_Angeles');
  const [payrollCadence, setPayrollCadence] = useState('weekly');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Organization Profile</CardTitle>
          <CardDescription>Manage your organization settings and preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Organization Name */}
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="Your organization name"
            />
          </div>

          {/* Support Email */}
          <div className="space-y-2">
            <Label htmlFor="support-email">Support Email</Label>
            <Input
              id="support-email"
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="support@example.com"
            />
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                <SelectItem value="Europe/London">London (GMT)</SelectItem>
                <SelectItem value="Europe/Paris">Central European Time (CET)</SelectItem>
                <SelectItem value="Asia/Tokyo">Japan Standard Time (JST)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payroll Cadence */}
          <div className="space-y-2">
            <Label htmlFor="payroll-cadence">Payroll Cadence</Label>
            <Select value={payrollCadence} onValueChange={setPayrollCadence}>
              <SelectTrigger id="payroll-cadence">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Setup Status */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Setup Status</p>
                <p className="text-sm text-muted-foreground">4 of 4 steps completed</p>
              </div>
              <Badge className="bg-green-500/10 text-green-700">Complete</Badge>
            </div>
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
