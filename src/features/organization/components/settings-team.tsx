'use client';

import { useState } from 'react';

import { Plus, Shield, Trash2 } from 'lucide-react';

import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/core/ui/card';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/ui/select';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'viewer';
  status: 'active' | 'pending';
  joinedDate: string;
}

const MOCK_TEAM: TeamMember[] = [
  {
    id: '1',
    name: 'You',
    email: 'admin@acme.com',
    role: 'admin',
    status: 'active',
    joinedDate: 'Jan 15, 2025',
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah@acme.com',
    role: 'manager',
    status: 'active',
    joinedDate: 'Feb 20, 2025',
  },
  {
    id: '3',
    name: 'Mike Chen',
    email: 'mike@acme.com',
    role: 'viewer',
    status: 'pending',
    joinedDate: 'Oct 24, 2025',
  },
];

const roleColors = {
  admin: 'bg-red-500/10 text-red-700',
  manager: 'bg-blue-500/10 text-blue-700',
  viewer: 'bg-gray-500/10 text-gray-700',
};

export function SettingsTeam() {
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('viewer');

  return (
    <div className="space-y-4">
      {/* Add Team Member */}
      <Card>
        <CardHeader>
          <CardTitle>Add Team Member</CardTitle>
          <CardDescription>Invite new members to your organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="member-email">Email Address</Label>
            <Input
              id="member-email"
              type="email"
              placeholder="member@example.com"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="member-role">Role</Label>
            <Select value={newMemberRole} onValueChange={setNewMemberRole}>
              <SelectTrigger id="member-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin - Full access</SelectItem>
                <SelectItem value="manager">Manager - Manage employees & streams</SelectItem>
                <SelectItem value="viewer">Viewer - Read-only access</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Send Invite
          </Button>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Manage your organization members and permissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {MOCK_TEAM.map((member) => (
            <div key={member.id} className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <p className="font-medium">{member.name}</p>
                  <Badge className={roleColors[member.role]} variant="secondary">
                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  </Badge>
                  {member.status === 'pending' && (
                    <Badge variant="outline" className="text-xs">
                      Pending
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{member.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">Joined {member.joinedDate}</p>
              </div>

              {member.id !== '1' && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                    <Shield className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Role Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>Understand what each role can do</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { role: 'Admin', permissions: ['Full access', 'Manage team', 'Billing', 'Settings'] },
              { role: 'Manager', permissions: ['Create streams', 'Manage employees', 'View reports'] },
              { role: 'Viewer', permissions: ['View streams', 'View employees', 'View reports'] },
            ].map((item, idx) => (
              <div key={idx} className="rounded-lg border border-border p-3">
                <p className="mb-2 text-sm font-medium">{item.role}</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {item.permissions.map((perm, pidx) => (
                    <li key={pidx}>✓ {perm}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
