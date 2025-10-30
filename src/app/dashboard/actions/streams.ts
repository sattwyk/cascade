'use server';

import { getStreamsForDashboard } from '@/app/dashboard/data/streams';
import type { DashboardStream } from '@/types/stream';

export async function getDashboardStreams(): Promise<DashboardStream[]> {
  return getStreamsForDashboard();
}
