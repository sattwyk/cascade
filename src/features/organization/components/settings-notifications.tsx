'use client';

import { useState } from 'react';

import { Button } from '@/core/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/core/ui/card';
import { Label } from '@/core/ui/label';
import { Switch } from '@/core/ui/switch';

export function SettingsNotifications() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [webhookNotifications, setWebhookNotifications] = useState(true);
  const [lowRunwayAlert, setLowRunwayAlert] = useState(true);
  const [inactivityAlert, setInactivityAlert] = useState(true);
  const [transactionAlert, setTransactionAlert] = useState(true);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
          <CardDescription>Choose how you want to receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="email-notifications">Email Notifications</Label>
            <Switch id="email-notifications" checked={emailNotifications} onCheckedChange={setEmailNotifications} />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="sms-notifications">SMS Notifications</Label>
            <Switch id="sms-notifications" checked={smsNotifications} onCheckedChange={setSmsNotifications} />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="webhook-notifications">Webhook Notifications</Label>
            <Switch
              id="webhook-notifications"
              checked={webhookNotifications}
              onCheckedChange={setWebhookNotifications}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alert Preferences</CardTitle>
          <CardDescription>Choose which alerts you want to receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="low-runway">Low Runway Alerts</Label>
              <p className="text-sm text-muted-foreground">When vault balance drops below 72 hours</p>
            </div>
            <Switch id="low-runway" checked={lowRunwayAlert} onCheckedChange={setLowRunwayAlert} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="inactivity">Inactivity Alerts</Label>
              <p className="text-sm text-muted-foreground">When employee inactive for 25+ days</p>
            </div>
            <Switch id="inactivity" checked={inactivityAlert} onCheckedChange={setInactivityAlert} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="transaction">Transaction Alerts</Label>
              <p className="text-sm text-muted-foreground">For all stream transactions</p>
            </div>
            <Switch id="transaction" checked={transactionAlert} onCheckedChange={setTransactionAlert} />
          </div>
        </CardContent>
      </Card>

      <Button className="w-full">Save Preferences</Button>
    </div>
  );
}
