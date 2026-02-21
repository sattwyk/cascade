'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import * as Sentry from '@sentry/nextjs';
import { and, eq } from 'drizzle-orm';

import { drizzleClientHttp } from '@/db';
import { employees, organizationUsers } from '@/db/schema';

import { resolveEmployeeContext } from './employee-context';

export type ActionResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: string;
      reason?: string;
    };

export type EmployeeProfile = {
  id: string;
  fullName: string;
  email: string | null;
  walletAddress: string | null;
  department: string | null;
  location: string | null;
  employmentType: string | null;
  organizationId: string;
  organizationName: string | null;
  organizationRole: string | null;
  joinedAt: Date | null;
  status: string | null;
};

/**
 * Fetches the complete profile for the currently authenticated employee
 */
export async function getEmployeeProfile(): Promise<ActionResult<EmployeeProfile>> {
  try {
    const employeeContext = await resolveEmployeeContext();

    if (employeeContext.status === 'error') {
      return {
        ok: false,
        error: 'Unable to resolve employee context',
        reason: employeeContext.reason,
      };
    }

    const { employeeId, organizationId } = employeeContext;

    const result = await drizzleClientHttp
      .select({
        id: employees.id,
        fullName: employees.fullName,
        email: employees.email,
        department: employees.department,
        location: employees.location,
        employmentType: employees.employmentType,
        primaryWallet: employees.primaryWallet,
        status: employees.status,
        organizationId: employees.organizationId,
        joinedAt: organizationUsers.joinedAt,
        walletAddress: organizationUsers.walletAddress,
      })
      .from(employees)
      .leftJoin(organizationUsers, eq(organizationUsers.employeeId, employees.id))
      .where(and(eq(employees.id, employeeId), eq(employees.organizationId, organizationId)))
      .limit(1);

    if (!result || result.length === 0) {
      return {
        ok: false,
        error: 'Employee profile not found',
      };
    }

    const profile = result[0];

    return {
      ok: true,
      data: {
        id: profile.id,
        fullName: profile.fullName,
        email: profile.email,
        walletAddress: profile.walletAddress ?? profile.primaryWallet,
        department: profile.department,
        location: profile.location,
        employmentType: profile.employmentType,
        organizationId: profile.organizationId,
        organizationName: employeeContext.organizationName,
        organizationRole: profile.department, // Use department as the role
        joinedAt: profile.joinedAt,
        status: profile.status,
      },
    };
  } catch (error) {
    Sentry.logger.error('Error fetching employee profile', { error });
    console.error('Error fetching employee profile:', error);
    return {
      ok: false,
      error: 'Failed to fetch employee profile',
    };
  }
}

/**
 * Updates the employee's profile information
 */
export async function updateEmployeeProfile(data: {
  fullName?: string;
  email?: string;
}): Promise<ActionResult<{ success: boolean }>> {
  try {
    const employeeContext = await resolveEmployeeContext();

    if (employeeContext.status === 'error') {
      return {
        ok: false,
        error: 'Unable to resolve employee context',
        reason: employeeContext.reason,
      };
    }

    const { employeeId, organizationId } = employeeContext;

    const updateData: Record<string, unknown> = {};
    if (data.fullName) updateData.fullName = data.fullName;
    if (data.email) updateData.email = data.email;

    if (Object.keys(updateData).length === 0) {
      return {
        ok: false,
        error: 'No fields to update',
      };
    }

    updateData.updatedAt = new Date();

    await drizzleClientHttp
      .update(employees)
      .set(updateData)
      .where(and(eq(employees.id, employeeId), eq(employees.organizationId, organizationId)));

    revalidatePath('/dashboard/profile');

    Sentry.logger.info('Employee profile updated', { employeeId });

    return {
      ok: true,
      data: { success: true },
    };
  } catch (error) {
    Sentry.logger.error('Error updating employee profile', { error });
    console.error('Error updating employee profile:', error);
    return {
      ok: false,
      error: 'Failed to update profile',
    };
  }
}

/**
 * Removes the employee from the organization (leave organization action)
 */
export async function leaveOrganization(): Promise<ActionResult<{ success: boolean }>> {
  try {
    const employeeContext = await resolveEmployeeContext();

    if (employeeContext.status === 'error') {
      return {
        ok: false,
        error: 'Unable to resolve employee context',
        reason: employeeContext.reason,
      };
    }

    const { employeeId, organizationId } = employeeContext;

    // Archive the employee record
    await drizzleClientHttp
      .update(employees)
      .set({
        status: 'archived',
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(employees.id, employeeId), eq(employees.organizationId, organizationId)));

    // Clear session cookies
    const cookieStore = await cookies();
    cookieStore.delete('cascade-user-email');
    cookieStore.delete('cascade-wallet');
    cookieStore.delete('cascade-organization-id');

    revalidatePath('/dashboard');

    Sentry.logger.info('Employee left organization', { employeeId, organizationId });

    return {
      ok: true,
      data: { success: true },
    };
  } catch (error) {
    Sentry.logger.error('Error leaving organization', { error });
    console.error('Error leaving organization:', error);
    return {
      ok: false,
      error: 'Failed to leave organization',
    };
  }
}
