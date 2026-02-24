'use client';

import { useState } from 'react';

import { Button } from '@/core/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/core/ui/card';
import { Label } from '@/core/ui/label';
import { RadioGroup, RadioGroupItem } from '@/core/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/ui/select';

export function SettingsAppearance() {
  const [theme, setTheme] = useState('system');
  const [fontSize, setFontSize] = useState('medium');
  const [compactMode, setCompactMode] = useState(false);

  return (
    <div className="space-y-4">
      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>Choose your preferred color scheme</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={theme} onValueChange={setTheme}>
            <div className="mb-2 flex cursor-pointer items-center space-x-2 rounded-lg border border-border p-3 hover:bg-muted/50">
              <RadioGroupItem value="light" id="light" />
              <Label htmlFor="light" className="flex-1 cursor-pointer">
                <div>
                  <p className="font-medium">Light</p>
                  <p className="text-sm text-muted-foreground">Use light theme</p>
                </div>
              </Label>
            </div>

            <div className="mb-2 flex cursor-pointer items-center space-x-2 rounded-lg border border-border p-3 hover:bg-muted/50">
              <RadioGroupItem value="dark" id="dark" />
              <Label htmlFor="dark" className="flex-1 cursor-pointer">
                <div>
                  <p className="font-medium">Dark</p>
                  <p className="text-sm text-muted-foreground">Use dark theme</p>
                </div>
              </Label>
            </div>

            <div className="flex cursor-pointer items-center space-x-2 rounded-lg border border-border p-3 hover:bg-muted/50">
              <RadioGroupItem value="system" id="system" />
              <Label htmlFor="system" className="flex-1 cursor-pointer">
                <div>
                  <p className="font-medium">System</p>
                  <p className="text-sm text-muted-foreground">Match system preferences</p>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Font Size */}
      <Card>
        <CardHeader>
          <CardTitle>Font Size</CardTitle>
          <CardDescription>Adjust the text size for better readability</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={fontSize} onValueChange={setFontSize}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="medium">Medium (Default)</SelectItem>
              <SelectItem value="large">Large</SelectItem>
            </SelectContent>
          </Select>

          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className={fontSize === 'small' ? 'text-sm' : fontSize === 'large' ? 'text-lg' : 'text-base'}>
              This is how your text will look with the selected font size.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Compact Mode */}
      <Card>
        <CardHeader>
          <CardTitle>Compact Mode</CardTitle>
          <CardDescription>Reduce spacing for a more condensed layout</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="font-medium">Enable Compact Mode</p>
              <p className="text-sm text-muted-foreground">Reduces padding and spacing throughout the app</p>
            </div>
            <Button
              variant={compactMode ? 'default' : 'outline'}
              onClick={() => setCompactMode(!compactMode)}
              className="ml-4"
            >
              {compactMode ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sidebar */}
      <Card>
        <CardHeader>
          <CardTitle>Sidebar</CardTitle>
          <CardDescription>Customize sidebar behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label className="cursor-pointer">
              <p className="font-medium">Collapse Sidebar by Default</p>
              <p className="text-sm text-muted-foreground">Start with sidebar collapsed</p>
            </Label>
            <Button variant="outline" size="sm">
              Toggle
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
