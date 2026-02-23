'use client';

import { useState } from 'react';

import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/core/ui/alert';
import { Button } from '@/core/ui/button';
import { Checkbox } from '@/core/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/core/ui/dialog';
import { Label } from '@/core/ui/label';

interface ArchiveEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
}

export function ArchiveEmployeeModal({ isOpen, onClose, employeeId, employeeName }: ArchiveEmployeeModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const resetForm = () => {
    setConfirmed(false);
  };

  const handleArchive = async () => {
    if (!confirmed) {
      toast.error('Confirmation required', {
        description: 'Please confirm you want to archive this employee.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success('Employee archived successfully!', {
        description: `${employeeName} (ID: ${employeeId}) has been moved to the archived section. All streams have been paused.`,
      });
      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to archive employee', { employeeId, error });
      toast.error('Failed to archive employee', {
        description: 'Please try again or contact support.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Archive Employee</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You are about to archive <strong>{employeeName}</strong>. This action cannot be easily undone.
            </AlertDescription>
          </Alert>

          <div className="space-y-4 text-sm">
            <div>
              <h4 className="mb-2 font-semibold">What happens when you archive?</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>• The employee will be moved to the &quot;Archived&quot; section</li>
                <li>• All active streams will be paused</li>
                <li>• The employee can be restored from the archived section</li>
                <li>• Historical data will be preserved</li>
              </ul>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
            <Checkbox
              id="confirm"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked as boolean)}
            />
            <Label htmlFor="confirm" className="cursor-pointer text-sm">
              I understand and want to archive this employee
            </Label>
          </div>

          <div className="flex gap-3 border-t border-border pt-6">
            <Button variant="outline" onClick={handleClose} className="flex-1 bg-transparent">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleArchive}
              disabled={!confirmed || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Archiving...' : 'Archive Employee'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
