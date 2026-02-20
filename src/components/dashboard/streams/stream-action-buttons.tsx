'use client';

import { useDashboard } from '@/components/dashboard/dashboard-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface StreamActionButtonsProps {
  streamId: string;
  status: 'active' | 'suspended' | 'closed' | 'draft';
}

export function StreamActionButtons({ streamId, status }: StreamActionButtonsProps) {
  const { openTopUpStreamModal, openEmergencyWithdrawModal, openCloseStreamModal } = useDashboard();

  const handleTopUp = () => {
    openTopUpStreamModal(streamId);
  };

  const handleEmergencyWithdraw = () => {
    openEmergencyWithdrawModal(streamId);
  };

  const handleCloseStream = () => {
    openCloseStreamModal(streamId);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-2">
          {status === 'active' && (
            <>
              <Button className="w-full" onClick={handleTopUp}>
                Top Up Stream
              </Button>
              <Button variant="outline" className="w-full bg-transparent" onClick={handleEmergencyWithdraw}>
                Emergency Withdraw
              </Button>
            </>
          )}

          {status === 'suspended' && (
            <>
              <Button className="w-full">Reactivate Stream</Button>
              <Button variant="outline" className="w-full bg-transparent" onClick={handleCloseStream}>
                Close Stream
              </Button>
            </>
          )}

          {status === 'closed' && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              This stream is closed and cannot be modified
            </p>
          )}

          {status === 'draft' && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Finalize and activate this stream from the creation flow to manage funds.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
