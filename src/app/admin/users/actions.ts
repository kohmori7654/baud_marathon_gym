'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import type { User, UserRole, TargetExamType } from '@/types/database';

interface CreateUserData {
    email: string;
    password: string;
    displayName?: string;
    role: UserRole;
    targetExam: TargetExamType;
    department?: string;
}

interface BulkUserData {
    users: CreateUserData[];
}

export interface UserWithSupporter extends User {
    supporter_name?: string | null;
}

export async function getUsers(
    page: number = 1,
    limit: number = 20,
    filters?: { department?: string; supporterId?: string }
) {
    const supabase = createAdminClient();
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('users') as any)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

    if (filters?.department) {
        query = query.eq('department', filters.department);
    }

    // If filtering by supporter, get the examinee IDs first
    if (filters?.supporterId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: assignments } = await (supabase.from('supporter_assignments') as any)
            .select('examinee_id')
            .eq('supporter_id', filters.supporterId);
        const examineeIds = (assignments || []).map((a: any) => a.examinee_id);
        if (examineeIds.length > 0) {
            query = query.in('id', examineeIds);
        } else {
            // No examinees assigned to this supporter - return empty
            return { users: [] as UserWithSupporter[], totalCount: 0, totalPages: 0, supporters: [] as User[] };
        }
    }

    const { data: users, count, error } = await query.range(start, end);

    if (error) {
        throw new Error(`Failed to fetch users: ${error.message}`);
    }

    // Get all supporter assignments to map examinee -> supporter name
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allAssignments } = await (supabase.from('supporter_assignments') as any)
        .select('supporter_id, examinee_id');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allSupporters } = await (supabase.from('users') as any)
        .select('id, display_name, email')
        .eq('role', 'supporter')
        .order('display_name');

    // Build examinee -> supporter name map
    const supporterMap: Record<string, string> = {};
    for (const s of (allSupporters || [])) {
        supporterMap[s.id] = s.display_name || s.email;
    }

    const examineeSupporterMap: Record<string, string> = {};
    for (const a of (allAssignments || [])) {
        examineeSupporterMap[a.examinee_id] = supporterMap[a.supporter_id] || '-';
    }

    const usersWithSupporter: UserWithSupporter[] = (users || []).map((u: User) => ({
        ...u,
        supporter_name: examineeSupporterMap[u.id] || null,
    }));

    return {
        users: usersWithSupporter,
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        supporters: (allSupporters || []) as User[],
    };
}

export async function createUser(data: CreateUserData) {
    // Use admin client to bypass RLS
    const supabase = createAdminClient();

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
            display_name: data.displayName || data.email.split('@')[0],
        }
    });

    if (authError) {
        return { error: authError.message };
    }

    // The trigger handle_new_user will create the public.user record
    // But we need to update it with the correct role and target_exam
    // because the trigger creates it with default 'examinee' role

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase.from('users') as any)
        .update({
            display_name: data.displayName || data.email.split('@')[0],
            role: data.role,
            target_exam: data.targetExam,
            department: data.department || null,
        })
        .eq('id', authData.user.id);

    if (updateError) {
        // If profile update fails, we might want to delete the auth user to maintain consistency
        // But for now just return error
        return { error: `User created but profile update failed: ${updateError.message}` };
    }

    revalidatePath('/admin/users');
    return { success: true, userId: authData.user.id };
}

export async function updateUser(userId: string, data: Partial<CreateUserData>) {
    const supabase = createAdminClient();

    const updateData: Record<string, any> = {};
    if (data.displayName !== undefined) updateData.display_name = data.displayName;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.targetExam !== undefined) updateData.target_exam = data.targetExam;
    if (data.department !== undefined) updateData.department = data.department;

    // auth.users metadata should also be updated if display name changes
    if (data.displayName) {
        await supabase.auth.admin.updateUserById(userId, {
            user_metadata: { display_name: data.displayName }
        });
    }

    // Update public profile
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('users') as any)
        .update(updateData)
        .eq('id', userId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/admin/users');
    return { success: true };
}

export async function deleteUser(userId: string) {
    const supabase = createAdminClient();

    // Delete from auth (cascades to users table)
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/admin/users');
    return { success: true };
}

export async function bulkCreateUsers(data: BulkUserData) {
    const results: { email: string; success: boolean; error?: string }[] = [];

    // Process sequentially to avoid rate limits
    for (const user of data.users) {
        // Basic delay to be nice to the API
        // await new Promise(resolve => setTimeout(resolve, 100));

        const result = await createUser(user);
        results.push({
            email: user.email,
            success: !result.error,
            error: result.error,
        });
    }

    revalidatePath('/admin/users');
    return { results };
}
