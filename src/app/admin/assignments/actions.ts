'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import type { User, SupporterAssignment } from '@/types/database';

export interface AssignmentData {
    supporterId: string;
    examineeIds: string[];
}

/**
 * Get all users with 'supporter' role
 */
export async function getSupporters() {
    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('users') as any)
        .select('*')
        .eq('role', 'supporter')
        .order('display_name');

    if (error) {
        throw new Error(`Failed to fetch supporters: ${error.message}`);
    }

    return data as User[];
}

/**
 * Get all users with 'examinee' role
 */
export async function getExaminees() {
    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('users') as any)
        .select('*')
        .eq('role', 'examinee')
        .order('display_name');

    if (error) {
        throw new Error(`Failed to fetch examinees: ${error.message}`);
    }

    return data as User[];
}

/**
 * Get all assignments
 */
export async function getAssignments() {
    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('supporter_assignments') as any)
        .select('*');

    if (error) {
        throw new Error(`Failed to fetch assignments: ${error.message}`);
    }

    return data as SupporterAssignment[];
}

export interface SupporterStats {
    id: string;
    display_name: string | null;
    email: string;
    department: string | null;
    examinees: { id: string; display_name: string | null; email: string; passed: boolean }[];
    examinee_count: number;
    passed_count: number;
}

/**
 * Get supporter stats with examinee details for table view
 */
export async function getSupporterStats(): Promise<SupporterStats[]> {
    const supabase = createAdminClient();

    // Get all supporters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: supporters } = await (supabase.from('users') as any)
        .select('id, display_name, email, department')
        .eq('role', 'supporter')
        .order('display_name');

    // Get all assignments
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: assignments } = await (supabase.from('supporter_assignments') as any)
        .select('supporter_id, examinee_id');

    // Get all examinees with passed status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allExaminees } = await (supabase.from('users') as any)
        .select('id, display_name, email, passed')
        .eq('role', 'examinee');

    const examineeMap: Record<string, { id: string; display_name: string | null; email: string; passed: boolean }> = {};
    for (const e of (allExaminees || [])) {
        examineeMap[e.id] = { id: e.id, display_name: e.display_name, email: e.email, passed: e.passed || false };
    }

    // Group assignments by supporter
    const assignmentsBySupporter: Record<string, string[]> = {};
    for (const a of (assignments || [])) {
        if (!assignmentsBySupporter[a.supporter_id]) assignmentsBySupporter[a.supporter_id] = [];
        assignmentsBySupporter[a.supporter_id].push(a.examinee_id);
    }

    return (supporters || []).map((s: any) => {
        const examineeIds = assignmentsBySupporter[s.id] || [];
        const examinees = examineeIds
            .map((id: string) => examineeMap[id])
            .filter(Boolean);
        return {
            id: s.id,
            display_name: s.display_name,
            email: s.email,
            department: s.department,
            examinees,
            examinee_count: examinees.length,
            passed_count: examinees.filter((e: any) => e.passed).length,
        };
    });
}

/**
 * Assign an examinee to a supporter
 */
export async function assignExaminee(supporterId: string, examineeId: string) {
    const supabase = createAdminClient();

    // Check if assignment already exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase.from('supporter_assignments') as any)
        .select('id')
        .eq('supporter_id', supporterId)
        .eq('examinee_id', examineeId)
        .single();

    if (existing) {
        return { success: true, message: 'Already assigned' };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('supporter_assignments') as any)
        .insert({
            supporter_id: supporterId,
            examinee_id: examineeId,
        });

    if (error) {
        return { error: `Failed to assign: ${error.message}` };
    }

    revalidatePath('/admin/assignments');
    return { success: true };
}

/**
 * Unassign an examinee from a supporter
 */
export async function unassignExaminee(supporterId: string, examineeId: string) {
    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('supporter_assignments') as any)
        .delete()
        .eq('supporter_id', supporterId)
        .eq('examinee_id', examineeId);

    if (error) {
        return { error: `Failed to unassign: ${error.message}` };
    }

    revalidatePath('/admin/assignments');
    return { success: true };
}

export async function createAssignment(supporterId: string, examineeId: string) {
    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('supporter_assignments') as any)
        .insert({
            supporter_id: supporterId,
            examinee_id: examineeId,
        });

    if (error) {
        // Unique constraint violation (already assigned) is okay to ignore for idempotency
        if (error.code === '23505') {
            return { success: true };
        }
        return { error: error.message };
    }

    revalidatePath('/admin/assignments');
    return { success: true };
}

export async function bulkCreateAssignments(assignments: { supporter_email: string; examinee_email: string }[]) {
    const supabase = createAdminClient();
    const results: { supporter_email: string; examinee_email: string; success: boolean; error?: string }[] = [];

    for (const assignment of assignments) {
        // 1. Get IDs from emails
        const { data: supporter } = await supabase.from('users').select('id').eq('email', assignment.supporter_email).single();
        const { data: examinee } = await supabase.from('users').select('id').eq('email', assignment.examinee_email).single();

        if (!supporter) {
            results.push({ ...assignment, success: false, error: 'Spt Not Found' });
            continue;
        }
        if (!examinee) {
            results.push({ ...assignment, success: false, error: 'Examn Not Found' });
            continue;
        }

        // 2. Create assignment
        const result = await createAssignment((supporter as any).id, (examinee as any).id);
        results.push({
            ...assignment,
            success: !result.error,
            error: result.error
        });
    }

    revalidatePath('/admin/assignments');
    return { results };
}
