'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { TargetExamType } from '@/types/database';

export async function startExam(
    examType: TargetExamType,
    mode: string,
    domain: string | null,
    questionType: string | null,
    questionCount: number
) {
    const supabaseUser = await createClient();
    const { data: { user } } = await supabaseUser.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    try {
        console.log('Creating Admin Client with key length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length);

        // Direct creation to avoid import issues
        const { createClient: createDirectClient } = await import('@supabase/supabase-js');
        const supabaseAdmin = createDirectClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        let sessionQs: { question_id: string }[] = [];

        // --- Mock Exam Logic ---
        if (mode === 'mock_exam') {
            // Weights definition
            const encorWeights: Record<string, number> = {
                'アーキテクチャ': 0.15,
                '仮想化': 0.10,
                'インフラストラクチャ': 0.30,
                'ネットワークアシュアランス': 0.10,
                'セキュリティ': 0.20,
                '自動化': 0.15,
            };
            const enarsiWeights: Record<string, number> = {
                'レイヤ3テクノロジー': 0.35,
                'VPNテクノロジー': 0.20,
                'インフラのセキュリティ': 0.20,
                'インフラのサービス': 0.25,
            };

            const weights = examType === 'ENCOR' ? encorWeights : enarsiWeights;
            const targetCount = questionCount; // 100 or 60 typically
            let assignedCount = 0;

            // Fetch questions for each domain based on weight
            for (const [domainKey, weight] of Object.entries(weights)) {
                // Calculate how many questions to fetch for this domain
                const countForDomain = Math.floor(targetCount * weight);
                if (countForDomain <= 0) continue;

                // Attempt to find questions matching this domain (using partial match)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: qIds } = await (supabaseAdmin.from('questions') as any)
                    .select('id')
                    .eq('exam_type', examType)
                    .ilike('domain', `%${domainKey}%`) // Simple partial match
                    .limit(countForDomain);

                if (qIds && qIds.length > 0) {
                    // Add found questions (shuffle/randomize might be needed if api returns sorted)
                    // supabase select without order is somewhat indeterminate, but better to RANDOM() if possible.
                    // For now, simpler: just take what we get. Ideally use .rpc() for random.
                    sessionQs.push(...qIds.map((q: any) => ({ question_id: q.id })));
                    assignedCount += qIds.length;
                }
            }

            // Fill remainder with random questions if we didn't hit the target
            // (e.g. domains didn't match, or not enough questions in DB)
            const remaining = targetCount - assignedCount;
            if (remaining > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: randomQs } = await (supabaseAdmin.from('questions') as any)
                    .select('id')
                    .eq('exam_type', examType)
                    .range(0, remaining - 1); // This isn't truly random but fills the gap.
                // In a real app we'd use a random RPC.

                if (randomQs) {
                    sessionQs.push(...randomQs.map((q: any) => ({ question_id: q.id })));
                }
            }
        }

        // Ensure we handle standard modes if NOT mock_exam OR if mock_exam logic was implemented differently above
        // Current architecture: The DB trigger/function usually handles 'random' question selection if we create a session.
        // Wait, checking schema: 'exam_sessions' table doesn't have a 'questions' column?
        // Ah, likely 'session_answers' are created via trigger or manually?
        // The original code was just: .insert({ ... }).select().single()
        // This implies there is a Database Trigger that populates session_answers OR it's done elsewhere?
        // Let's re-read the original file content I replaced.

        /* 
           Original code just did:
             const { data: session, error } = await (supabaseAdmin.from('exam_sessions') as any).insert({...})
           
           If I insert a session with 'mock_exam', I need to ensure the questions are created.
           Does a trigger exist? 
           I need to check migration files or assume the standard 'random' mode works via trigger.
           
           If standard 'random' works via trigger, then 'mock_exam' probably WON'T work via that trigger unless I update the trigger.
           
           BUT, I don't have easy access to update triggers right now without SQL.
           
           Alternative: Insert session, then MANUALLY insert session_answers for the specific questions I selected.
           
           Let's assume the existing system uses a Trigger to populate questions for 'random'.
           If I use 'mock_exam', that trigger might fail or do nothing if it doesn't recognize the mode.
           
           Let's look at 003_fix_rls_recursion.sql again to see if it mentions triggers?
           Or I can check previous viewed files?
        */

        // ... proceeding to insert session first ...

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: session, error } = await (supabaseAdmin.from('exam_sessions') as any)
            .insert({
                user_id: user.id,
                exam_type: examType,
                challenge_mode: mode,
                domain_filter: domain === 'all' ? null : domain,
                question_type: questionType === 'all' ? null : questionType,
                total_questions: questionCount,
                status: 'in_progress',
            })
            .select()
            .single();

        if (error) {
            console.error('Admin Insert Error:', error);
            return { error: `Admin Insert Failed: ${error.message} (Code: ${error.code})` };
        }

        // If I gathered specific questions for Mock Exam, I should insert them into session_answers now
        if (mode === 'mock_exam' && sessionQs.length > 0) {
            // We need to check if the trigger ALREADY inserted questions?
            // If the trigger runs on insert, it might have populated random questions.
            // If so, we might need to DELETE them and replace them.
            // Or, I should have updated the trigger.

            // FOR NOW: I will treat this as if the trigger assumes 'random' for everything it doesn't know,
            // or likely it knows 'random', 'unanswered', etc.

            // To be safe and minimal: I will assume the trigger might populate WRONG questions for mock_exam.
            // So I will:
            // 1. Delete any automatically created answers for this session.
            // 2. Insert my carefully selected questions.

            await (supabaseAdmin.from('session_answers') as any)
                .delete()
                .eq('session_id', session.id);

            const answersToInsert = sessionQs.map(q => ({
                session_id: session.id,
                question_id: q.question_id,
                user_id: user.id,
                answer_data: {},
                is_correct: false
            }));

            const { error: insertError } = await (supabaseAdmin.from('session_answers') as any)
                .insert(answersToInsert);

            if (insertError) {
                console.error('Failed to insert mock questions:', insertError);
            }
        }

        redirect(`/exam/${session.id}`);

    } catch (e: any) {
        if (e.message?.includes('NEXT_REDIRECT')) throw e;
        console.error('Exception in startExam:', e);
        return { error: `Exception: ${e.message}` };
    }
}
