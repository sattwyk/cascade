'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { AlertTriangle, Building2, Copy, ExternalLink, Mail, Pencil, Save, User, Wallet, X } from 'lucide-react';
import { toast } from 'sonner';

import { useSolana } from '@/components/solana/use-solana';
import { Button } from '@/core/ui/button';
import { Card } from '@/core/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import { EmptyState } from '@/core/ui/empty-state';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import { Skeleton } from '@/core/ui/skeleton';
import {
  getEmployeeProfile,
  leaveOrganization,
  updateEmployeeProfile,
  type EmployeeProfile,
} from '@/features/employees/server/actions/employee-profile';

export default function EmployeeProfilePage() {
  const { account, connected } = useSolana();
  const router = useRouter();
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [profileData, setProfileData] = useState<EmployeeProfile | null>(null);

  // Form state
  const [editedName, setEditedName] = useState('');
  const [editedEmail, setEditedEmail] = useState('');

  useEffect(() => {
    if (connected) {
      loadProfile();
    }
  }, [connected]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const result = await getEmployeeProfile();
      if (result.ok) {
        setProfileData(result.data);
        setEditedName(result.data.fullName);
        setEditedEmail(result.data.email || '');
      } else {
        toast.error('Failed to load profile', {
          description: result.error,
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profileData) return;

    setIsSaving(true);
    try {
      const result = await updateEmployeeProfile({
        fullName: editedName !== profileData.fullName ? editedName : undefined,
        email: editedEmail !== profileData.email ? editedEmail : undefined,
      });

      if (result.ok) {
        toast.success('Profile updated successfully');
        setIsEditing(false);
        await loadProfile();
      } else {
        toast.error('Failed to update profile', {
          description: result.error,
        });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (profileData) {
      setEditedName(profileData.fullName);
      setEditedEmail(profileData.email || '');
    }
    setIsEditing(false);
  };

  const handleLeaveOrganization = async () => {
    setIsLeaving(true);
    try {
      const result = await leaveOrganization();
      if (result.ok) {
        toast.success('Successfully left organization');
        setLeaveDialogOpen(false);
        // Redirect to home or landing page
        router.push('/');
      } else {
        toast.error('Failed to leave organization', {
          description: result.error,
        });
      }
    } catch (error) {
      console.error('Error leaving organization:', error);
      toast.error('Failed to leave organization');
    } finally {
      setIsLeaving(false);
    }
  };

  if (!connected || !account) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState title="Connect Your Wallet" description="Connect your wallet to view your profile" />
      </div>
    );
  }

  const copyAddress = () => {
    const address = profileData?.walletAddress || account?.address;
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success('Address copied to clipboard');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">Manage your profile and account settings</p>
        </div>
        <Card className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Card>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState title="Profile Not Found" description="Unable to load your profile information" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">Manage your profile and account settings</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <User className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">{profileData.fullName}</h2>
              <p className="text-sm text-muted-foreground">{profileData.organizationRole || 'Employee'}</p>
            </div>
          </div>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancelEdit} disabled={isSaving}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveProfile} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                disabled={!isEditing || isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  value={editedEmail}
                  onChange={(e) => setEditedEmail(e.target.value)}
                  disabled={!isEditing || isSaving}
                />
                {profileData.email && (
                  <Button variant="ghost" size="icon" className="shrink-0" disabled>
                    <Mail className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input id="department" value={profileData.department || 'N/A'} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={profileData.location || 'N/A'} disabled />
            </div>
          </div>

          {profileData.employmentType && (
            <div className="space-y-2">
              <Label htmlFor="employment-type">Employment Type</Label>
              <Input
                id="employment-type"
                value={profileData.employmentType
                  .split('_')
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')}
                disabled
              />
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Organization</h2>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="organization">Organization Name</Label>
              <Input id="organization" value={profileData.organizationName || 'N/A'} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input id="role" value={profileData.organizationRole || 'Employee'} disabled />
            </div>
          </div>

          {profileData.joinedAt && (
            <div className="space-y-2">
              <Label htmlFor="joined">Member Since</Label>
              <Input
                id="joined"
                value={new Date(profileData.joinedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                disabled
              />
            </div>
          )}

          {profileData.status && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Input
                id="status"
                value={profileData.status
                  .split('_')
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')}
                disabled
              />
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Wallet Address</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3">
            <code className="flex-1 text-sm">
              {profileData.walletAddress
                ? `${profileData.walletAddress.slice(0, 12)}...${profileData.walletAddress.slice(-12)}`
                : 'Not Connected'}
            </code>
            {profileData.walletAddress && (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={copyAddress}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                  <a
                    href={`https://explorer.solana.com/address/${profileData.walletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Account Actions</h2>
        <div className="space-y-5">
          <div className="space-y-3 rounded-lg border border-destructive/20 bg-destructive/5 p-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
                <p className="text-sm text-destructive/80">
                  Leaving your organization revokes access to streams, history, and future payments. This cannot be
                  undone without an employer invite.
                </p>
              </div>
            </div>

            <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setLeaveDialogOpen(true)}
                disabled={isLeaving}
              >
                Leave Organization
              </Button>

              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-destructive">Leave Organization</DialogTitle>
                  <DialogDescription>
                    Leaving {profileData.organizationName || 'this organization'} will immediately revoke your access to
                    dashboards, payment streams, and future payouts. This action can only be reversed by a new employer
                    invitation.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive/80">
                  <p className="font-semibold text-destructive">You&apos;re about to:</p>
                  <ul className="list-inside list-disc space-y-1">
                    <li>Stop all active payment streams</li>
                    <li>Lose access to your payment history dashboard</li>
                    <li>Require a new invitation to rejoin</li>
                  </ul>
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" disabled={isLeaving}>
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button variant="destructive" onClick={handleLeaveOrganization} disabled={isLeaving}>
                    {isLeaving ? 'Leaving...' : 'Confirm Leave'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </Card>
    </div>
  );
}
