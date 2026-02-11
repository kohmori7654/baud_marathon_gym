'use server';

import type { StudentAnalyticsData, SignalType } from '@/types/analytics';
import { createClient } from '@/lib/supabase/server';
import type { User, ExamSession } from '@/types/database';
import { createAdminClient } from '@/lib/supabase/admin';

export interface ExamineeSummary extends User {
    lastSessionDate: string | null;
    totalSessions: number;
    averageScore: number;
    last5DaysAverage: number;
    latestMockExamScore: number | null;
    signal: SignalType;
}

// ... imports ...

export async function getAssignedExaminees(): Promise<ExamineeSummary[]> {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    // Check user role using adminClient to ensure we can read it
    const { data: currentUserData } = await adminClient
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single() as { data: { role: string } | null };

    let examineeIds: string[] = [];

    if (currentUserData?.role === 'admin') {
        const { data: allExaminees, error: examineesError } = await (adminClient.from('users') as any)
            .select('id')
            .eq('role', 'examinee');

        if (examineesError) {
            throw new Error(`Failed to fetch all examinees: ${examineesError.message}`);
        }
        examineeIds = allExaminees?.map((u: any) => u.id) || [];
    } else {
        const { data: assignments, error: assignmentError } = await (supabase.from('supporter_assignments') as any)
            .select('examinee_id')
            .eq('supporter_id', user.id);

        if (assignmentError) {
            throw new Error(`Failed to fetch assignments: ${assignmentError.message}`);
        }

        if (!assignments || assignments.length === 0) {
            return [];
        }

        examineeIds = assignments.map((a: any) => a.examinee_id);
    }

    if (examineeIds.length === 0) {
        return [];
    }

    // Get examinee details
    const { data: examinees, error: examineesError } = await (adminClient.from('users') as any)
        .select('*')
        .in('id', examineeIds)
        .order('display_name');

    if (examineesError) {
        throw new Error(`Failed to fetch examinees: ${examineesError.message}`);
    }

    // Get stats for each examinee
    const summaries: ExamineeSummary[] = [];
    const now = new Date();
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();

    for (const examinee of examinees as User[]) {
        // Get all completed sessions for calculations
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: sessions } = await (adminClient.from('exam_sessions') as any)
            .select('*')
            .eq('user_id', examinee.id)
            .eq('status', 'completed')
            .order('end_time', { ascending: false });

        // Fetch Analytics Signal via RPC
        // We use the RPC to ensure consistency with the detailed dashboard
        // @ts-expect-error - RPC types are manually managed and may be out of sync
        const { data: analytics } = await adminClient.rpc('get_student_analytics', {
            target_user_id: examinee.id
        });
        const signal: SignalType = (analytics as unknown as StudentAnalyticsData)?.signal || 'STOP';

        let averageScore = 0;
        let lastSessionDate = null;
        let totalSessions = 0;
        let last5DaysAverage = 0;
        let latestMockExamScore = null;

        if (sessions && sessions.length > 0) {
            totalSessions = sessions.length;
            lastSessionDate = sessions[0].end_time;

            // Overall Average (last 10 sessions as before, or all? logical to keep consistency with previous logic which limited to 10 for average)
            // Wait, previous logic limited to 10 for averageScore. I should check if I should grab all or just 10.
            // Responsive to user request, I'll calculate averageScore from last 10 as before to avoid changing existing metric meaning unexpectedly,
            // but I need all sessions (or at least valid ones) for the other metrics.
            // Actually, for "Last 5 Days", I need sessions within that timeframe.
            // "Latest Mock Exam" is just finding the first one.

            // Re-calculating Average Score (Last 10)
            const recentSessions = sessions.slice(0, 10);
            const sumScore = recentSessions.reduce((acc: number, session: any) => {
                return acc + (session.score / session.total_questions) * 100;
            }, 0);
            averageScore = Math.round(sumScore / recentSessions.length);

            // Last 5 Days Average
            const recent5DaysSessions = sessions.filter((s: any) => s.end_time >= fiveDaysAgo);
            if (recent5DaysSessions.length > 0) {
                const sum5Days = recent5DaysSessions.reduce((acc: number, session: any) => {
                    return acc + (session.score / session.total_questions) * 100;
                }, 0);
                last5DaysAverage = Math.round(sum5Days / recent5DaysSessions.length);
            }

            // Latest Mock Exam Score
            const mockSession = sessions.find((s: any) => s.challenge_mode === 'mock_exam');
            if (mockSession) {
                latestMockExamScore = Math.round((mockSession.score / mockSession.total_questions) * 100);
            }
        }

        summaries.push({
            ...examinee,
            lastSessionDate,
            totalSessions,
            averageScore,
            last5DaysAverage,
            latestMockExamScore,
            signal
        });
    }

    return summaries;
}

export async function getStudentAnalytics(userId: string): Promise<StudentAnalyticsData> {
    const adminClient = createAdminClient();

    // @ts-expect-error - RPC types are manually managed and may be out of sync
    const { data: analytics, error } = await adminClient.rpc('get_student_analytics', {
        target_user_id: userId
    });

    if (error) {
        console.error('Failed to fetch student analytics:', error);
        throw new Error(`Failed to fetch student analytics: ${error.message}`);
    }

    return analytics as unknown as StudentAnalyticsData;
}

/**
 * Get detailed info for a specific examinee (Accessible by assigned supporter)
 */
export async function getExamineeDetail(examineeId: string) {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    // Check user role using adminClient to ensure we can read it
    const { data: currentUserData } = await adminClient
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single() as { data: { role: string } | null };

    if (currentUserData?.role !== 'admin') {
        // Verify assignment for non-admins
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: assignment } = await (supabase.from('supporter_assignments') as any)
            .select('id')
            .eq('supporter_id', user.id)
            .eq('examinee_id', examineeId)
            .single();

        if (!assignment) {
            throw new Error('Access denied: You are not assigned to this examinee');
        }
    }

    // Get user profile
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: userProfile } = await (adminClient.from('users') as any)
        .select('*')
        .eq('id', examineeId)
        .single();

    // Get all completed sessions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sessions } = await (adminClient.from('exam_sessions') as any)
        .select('*')
        .eq('user_id', examineeId)
        .eq('status', 'completed')
        .order('end_time', { ascending: false });

    return {
        profile: userProfile as unknown as User,
        sessions: sessions as ExamSession[]
    };
}
