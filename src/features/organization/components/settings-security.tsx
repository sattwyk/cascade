'use client';

import { useState } from 'react';

import { Check, Copy, Eye, EyeOff } from 'lucide-react';

import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/core/ui/card';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import { Switch } from '@/core/ui/switch';

export function SettingsSecurity() {
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [copiedApiKey, setCopiedApiKey] = useState(false);

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText('sk_live_abc123def456ghi789jkl');
    setCopiedApiKey(true);
    setTimeout(() => setCopiedApiKey(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Password Section */}
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Update your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter current password"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input id="new-password" type="password" placeholder="Enter new password" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input id="confirm-password" type="password" placeholder="Confirm new password" />
          </div>

          <Button className="w-full">Update Password</Button>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>Add an extra layer of security to your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-4">
            <div>
              <p className="font-medium">Status</p>
              <p className="text-sm text-muted-foreground">{twoFactorEnabled ? 'Enabled' : 'Disabled'}</p>
            </div>
            <Switch checked={twoFactorEnabled} onCheckedChange={setTwoFactorEnabled} />
          </div>

          {twoFactorEnabled && (
            <div className="rounded-lg border border-border bg-green-500/5 p-4">
              <p className="mb-2 text-sm font-medium text-green-700">✓ Two-factor authentication is active</p>
              <p className="text-xs text-muted-foreground">
                You&apos;ll be asked for a verification code when signing in from a new device.
              </p>
            </div>
          )}

          <Button variant="outline" className="w-full bg-transparent">
            {twoFactorEnabled ? 'Manage 2FA' : 'Enable 2FA'}
          </Button>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>Manage API keys for programmatic access</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Live API Key</Label>
            <div className="flex gap-2">
              <Input type="password" value="sk_live_abc123def456ghi789jkl" readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={handleCopyApiKey}>
                {copiedApiKey ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Button variant="outline" className="w-full bg-transparent">
            Regenerate API Key
          </Button>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>Manage your active login sessions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Current Session</p>
              <p className="text-xs text-muted-foreground">Chrome on macOS • Last active now</p>
            </div>
            <Badge>Active</Badge>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Safari on iPhone</p>
              <p className="text-xs text-muted-foreground">Last active 2 hours ago</p>
            </div>
            <Button variant="ghost" size="sm" className="text-destructive">
              Sign Out
            </Button>
          </div>

          <Button variant="outline" className="w-full bg-transparent">
            Sign Out All Other Sessions
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
