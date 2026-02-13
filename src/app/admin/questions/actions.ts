'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Question, Option, TargetExamType, QuestionType } from '@/types/database';
import crypto from 'crypto';

export interface CreateQuestionData {
    examType: TargetExamType;
    domain: string;
    questionText: string;
    questionType: QuestionType;
    explanation?: string;
    imageBase64?: string; // Legacy: Maps to first image
    images?: string[];    // New: Multiple images
    simulationTargetJson?: Record<string, unknown>;
    options: {
        text: string;
        isCorrect: boolean;
        sortOrder: number;
    }[];
    isImportant?: boolean;
}

export type UpdateQuestionData = Partial<CreateQuestionData> & { id: string };

/**
 * Get all questions with options, filtering, and sorting
 */
export async function getQuestions(
    page: number = 1,
    limit: number = 20,
    filters?: {
        examType?: string;
        domain?: string;
        questionType?: string;
        keyword?: string;
    },
    sort: string = 'created_at',
    order: 'asc' | 'desc' = 'desc'
) {
    const supabase = createAdminClient();
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('questions') as any)
        .select(`
            *,
            options (*),
            question_images (*)
        `, { count: 'exact' });

    // Apply filters
    if (filters?.examType && filters.examType !== 'all') {
        query = query.eq('exam_type', filters.examType);
    }
    if (filters?.domain && filters.domain !== 'all') {
        query = query.eq('domain', filters.domain);
    }
    if (filters?.questionType && filters.questionType !== 'all') {
        query = query.eq('question_type', filters.questionType);
    }
    if (filters?.keyword) {
        // Search in question_text or explanation or display_id (if numeric)
        // Note: casting display_id to text for search might require a different approach or RPC
        // For now, simpler text search
        query = query.or(`question_text.ilike.%${filters.keyword}%,explanation.ilike.%${filters.keyword}%`);
    }

    const { data: questions, count, error } = await query
        .order(sort, { ascending: order === 'asc' })
        .range(start, end);

    if (error) {
        throw new Error(`Failed to fetch questions: ${error.message}`);
    }

    // Sort images
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    questions?.forEach((q: any) => {
        if (q.question_images) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            q.question_images.sort((a: any, b: any) => a.sort_order - b.sort_order);
        }

        // Add formatted ID
        if (q.display_id) {
            const prefix = q.exam_type === 'ENCOR' ? 'COR' : q.exam_type === 'ENARSI' ? 'CON' : 'UNK';
            q.formatted_id = `${prefix}${q.display_id.toString().padStart(6, '0')}`;
        }
    });

    return {
        questions: questions || [],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
    };
}

/**
 * Export questions to CSV based on filters
 */
export async function exportQuestions(
    filters?: {
        examType?: string;
        domain?: string;
        questionType?: string;
        keyword?: string;
    }
) {
    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('questions') as any)
        .select(`
            *,
            options (*),
            question_images (*)
        `);

    // Apply filters (same as getQuestions)
    if (filters?.examType && filters.examType !== 'all') {
        query = query.eq('exam_type', filters.examType);
    }
    if (filters?.domain && filters.domain !== 'all') {
        query = query.eq('domain', filters.domain);
    }
    if (filters?.questionType && filters.questionType !== 'all') {
        query = query.eq('question_type', filters.questionType);
    }
    if (filters?.keyword) {
        query = query.or(`question_text.ilike.%${filters.keyword}%,explanation.ilike.%${filters.keyword}%`);
    }

    const { data: questions, error } = await query.order('display_id', { ascending: true }); // Sort by ID for CSV

    if (error) {
        return { error: `Failed to fetch questions for export: ${error.message}` };
    }

    if (!questions || questions.length === 0) {
        return { error: '対象データがありません' };
    }

    // Generate CSV
    // Header
    const header = ['ID', '重要', '試験種別', '分野', '問題形式', '問題文', '正解肢', '画像の有無', '作成日時'];
    const rows = questions.map((q: any) => {
        // Format ID
        const prefix = q.exam_type === 'ENCOR' ? 'COR' : q.exam_type === 'ENARSI' ? 'CON' : 'UNK';
        const formattedId = q.display_id ? `${prefix}${q.display_id.toString().padStart(6, '0')}` : '';

        // Format Correct Options
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const correctOptions = q.options?.filter((o: any) => o.is_correct).map((o: any) => o.text).join(' | ') || '';

        // Check for images
        const hasImages = (q.image_base64 || (q.question_images && q.question_images.length > 0)) ? 'あり' : 'なし';

        // Escape CSV fields
        const escape = (text: string | null | undefined) => {
            if (!text) return '';
            const stringText = String(text);
            if (stringText.includes(',') || stringText.includes('"') || stringText.includes('\n')) {
                return `"${stringText.replace(/"/g, '""')}"`;
            }
            return stringText;
        };

        return [
            escape(formattedId),
            escape(q.is_important ? '★' : ''),
            escape(q.exam_type),
            escape(q.domain),
            escape(q.question_type),
            escape(q.question_text),
            escape(correctOptions),
            escape(hasImages),
            escape(q.created_at)
        ].join(',');
    });

    // Add BOM for Excel compatibility (UTF-8 with BOM)
    const bom = '\uFEFF';
    const csvContent = bom + header.join(',') + '\n' + rows.join('\n');

    return { csv: csvContent };
}

/**
 * Get a single question with options
 */
export async function getQuestion(id: string) {
    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('questions') as any)
        .select(`
            *,
            options (*),
            question_images (*)
        `)
        .eq('id', id)
        .single();

    if (error) {
        return { error: error.message };
    }

    // Sort options by sort_order
    if (data && data.options) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.options.sort((a: any, b: any) => a.sort_order - b.sort_order);
    }

    // Sort images by sort_order
    if (data && data.question_images) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.question_images.sort((a: any, b: any) => a.sort_order - b.sort_order);
    }

    return { data };
}

/**
 * Create a new question and its options
 */
/**
 * Create a new question and its options
 */
export async function createQuestion(data: CreateQuestionData) {
    const supabase = createAdminClient();

    // 1. Create the question
    // Use SHA-256 for robust hashing
    const hash = crypto.createHash('sha256').update(data.questionText).digest('hex');

    // Check for duplicate hash before insert
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingQuestion } = await (supabase.from('questions') as any)
        .select('id')
        .eq('hash', hash)
        .single();

    if (existingQuestion) {
        return { error: '同一の問題文が既に登録されています。問題文を変更するか、既存の問題を編集してください。' };
    }

    // Calculate next display_id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: maxIdData } = await (supabase.from('questions') as any)
        .select('display_id')
        .order('display_id', { ascending: false })
        .limit(1)
        .single();

    const nextDisplayId = (maxIdData?.display_id || 0) + 1;

    // Prepare images list
    const imagesToSave = data.images || (data.imageBase64 ? [data.imageBase64] : []);

    const questionInsert = {
        exam_type: data.examType,
        domain: data.domain,
        question_text: data.questionText,
        question_type: data.questionType,
        explanation: data.explanation || null,
        image_base64: imagesToSave.length > 0 ? imagesToSave[0] : null, // Legacy backward compatibility
        simulation_target_json: data.simulationTargetJson || null,
        hash: hash,
        display_id: nextDisplayId,
        is_important: data.isImportant || false,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: questionData, error: questionError } = await (supabase.from('questions') as any)
        .insert(questionInsert)
        .select()
        .single();

    if (questionError) {
        return { error: `Failed to create question: ${questionError.message}` };
    }

    // 2. Insert Images
    if (imagesToSave.length > 0) {
        const imagesInsert = imagesToSave.map((img, idx) => ({
            question_id: questionData.id,
            image_data: img,
            sort_order: idx,
        }));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: imagesError } = await (supabase.from('question_images') as any)
            .insert(imagesInsert);

        if (imagesError) {
            // Cleanup?
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from('questions') as any).delete().eq('id', questionData.id);
            return { error: `Failed to save images: ${imagesError.message}` };
        }
    }

    // 3. Create options
    if (data.options && data.options.length > 0) {
        const optionsInsert = data.options.map(opt => ({
            question_id: questionData.id,
            text: opt.text,
            is_correct: opt.isCorrect,
            sort_order: opt.sortOrder,
        }));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: optionsError } = await (supabase.from('options') as any)
            .insert(optionsInsert);

        if (optionsError) {
            // Cleanup
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from('questions') as any).delete().eq('id', questionData.id);
            return { error: `Failed to create options: ${optionsError.message}` };
        }
    }

    revalidatePath('/admin/questions');
    return { success: true, questionId: questionData.id };
}

/**
 * Update a question and its options
 * Note: This deletes existing options and recreates them for simplicity using transaction-like approach
 */
export async function updateQuestion(data: UpdateQuestionData) {
    const supabase = createAdminClient();

    // 1. Update question fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const questionUpdate: any = {};
    if (data.examType) questionUpdate.exam_type = data.examType;
    if (data.domain) questionUpdate.domain = data.domain;
    if (data.questionText) questionUpdate.question_text = data.questionText;
    if (data.questionType) questionUpdate.question_type = data.questionType;
    if (data.explanation !== undefined) questionUpdate.explanation = data.explanation;
    if (data.simulationTargetJson !== undefined) questionUpdate.simulation_target_json = data.simulationTargetJson;
    if (data.isImportant !== undefined) questionUpdate.is_important = data.isImportant;

    // Legacy image update if explicitly provided, or update it if images array is provided
    if (data.imageBase64 !== undefined) {
        questionUpdate.image_base64 = data.imageBase64;
    } else if (data.images && data.images.length > 0) {
        questionUpdate.image_base64 = data.images[0];
    } else if (data.images && data.images.length === 0) {
        questionUpdate.image_base64 = null;
    }

    // Recalculate hash if question text is updated
    if (data.questionText) {
        questionUpdate.hash = crypto.createHash('sha256').update(data.questionText).digest('hex');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: questionError } = await (supabase.from('questions') as any)
        .update(questionUpdate)
        .eq('id', data.id);

    if (questionError) {
        return { error: `Failed to update question: ${questionError.message}` };
    }

    // 2. Update Images (Delete all and recreate if images provided)
    if (data.images !== undefined) { // Check for undefined vs empty array
        // Delete existing
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('question_images') as any)
            .delete()
            .eq('question_id', data.id);

        // Insert new
        if (data.images.length > 0) {
            const imagesInsert = data.images.map((img, idx) => ({
                question_id: data.id,
                image_data: img,
                sort_order: idx,
            }));

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: insertError } = await (supabase.from('question_images') as any)
                .insert(imagesInsert);

            if (insertError) {
                return { error: `Failed to update images: ${insertError.message}` };
            }
        }
    }

    // 3. Update options (Delete all and recreate if options provided in update data)
    // Only if options are explicitly included in the update data
    if (data.options) {
        // Delete existing
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: deleteError } = await (supabase.from('options') as any)
            .delete()
            .eq('question_id', data.id);

        if (deleteError) {
            return { error: `Failed to clear old options: ${deleteError.message}` };
        }

        // Insert new
        if (data.options.length > 0) {
            const optionsInsert = data.options.map(opt => ({
                question_id: data.id,
                text: opt.text,
                is_correct: opt.isCorrect,
                sort_order: opt.sortOrder,
            }));

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: insertError } = await (supabase.from('options') as any)
                .insert(optionsInsert);

            if (insertError) {
                return { error: `Failed to insert new options: ${insertError.message}` };
            }
        }
    }

    revalidatePath('/admin/questions');
    revalidatePath(`/admin/questions/${data.id}`);
    return { success: true };
}

/**
 * Delete a question (options cascade delete)
 */
export async function deleteQuestion(id: string) {
    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('questions') as any)
        .delete()
        .eq('id', id);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/admin/questions');
    return { success: true };
}

export async function bulkUpsertQuestions(data: { questions: CreateQuestionData[] }) {
    const supabase = createAdminClient();
    const results: { hash: string; action: 'created' | 'updated' | 'skipped'; error?: string }[] = [];

    for (const q of data.questions) {
        // Generate robust hash from question text
        const hash = crypto.createHash('sha256').update(q.questionText).digest('hex');

        try {
            // Check if exists by hash OR by exact text match (to handle legacy weak hashes)
            // We first try to find by hash
            let existingId: string | null = null;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: existingByHash } = await (supabase.from('questions') as any)
                .select('id')
                .eq('hash', hash)
                .single();

            if (existingByHash) {
                existingId = existingByHash.id;
            } else {
                // Fallback: Check by text to migrate/catch existing questions with old hashes
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: existingByText } = await (supabase.from('questions') as any)
                    .select('id')
                    .eq('question_text', q.questionText)
                    .single();

                if (existingByText) {
                    existingId = existingByText.id;
                }
            }

            // Normalize images for update/create
            // If images array present, use it.
            // If not, but imageBase64 present, wrap it.
            // If neither, undefined (for update) or empty (for create)
            const images = q.images !== undefined ? q.images : (q.imageBase64 ? [q.imageBase64] : undefined);

            if (existingId) {
                // Update (this will also update the hash to the new robust one if it was old)
                const result = await updateQuestion({ ...q, id: existingId, images });
                if (result.error) throw new Error(result.error);
                results.push({ hash, action: 'updated' });
            } else {
                // Create
                const result = await createQuestion({ ...q, images });
                if (result.error) throw new Error(result.error);
                results.push({ hash, action: 'created' }); // createQuestion generates hash
            }
        } catch (e: any) {
            results.push({ hash, action: 'skipped', error: e.message });
        }
    }

    revalidatePath('/admin/questions');
    revalidatePath('/admin/questions');
    return { results };
}

export async function cleanupOrphanedImages() {
    const supabase = createAdminClient();
    const bucketName = 'question-images';

    try {
        // 1. Get all files in Storage
        // Only fetching top-level files (assuming no folders for now based on implementation)
        const { data: files, error: listError } = await (supabase.storage.from(bucketName) as any)
            .list();

        if (listError) throw new Error(`List failed: ${listError.message}`);
        if (!files || files.length === 0) return { deletedCount: 0, deletedFiles: [], spaceReclaimed: 0 };

        // 2. Get all images referenced in DB
        // Check both questions.image_base64 (legacy/mixed) and question_images.image_data

        // table: questions
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: questions } = await (supabase.from('questions') as any)
            .select('image_base64');

        // table: question_images
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: questionImages } = await (supabase.from('question_images') as any)
            .select('image_data');

        // Create a set of "used" filenames
        const usedFilenames = new Set<string>();

        const extractFilename = (urlOrBase64: string | null) => {
            if (!urlOrBase64) return null;
            // If it's a supabase storage URL, extract filename
            // URL format typically: .../storage/v1/object/public/question-images/123456789-test.png
            if (urlOrBase64.includes(bucketName)) {
                // Determine filename by splitting path
                const parts = urlOrBase64.split('/');
                return parts[parts.length - 1]; // Last part is filename
            }
            // If base64 or other URL, ignore logic for storage cleanup (it won't match storage files anyway)
            return null;
        };

        questions?.forEach((q: any) => {
            const fname = extractFilename(q.image_base64);
            if (fname) usedFilenames.add(decodeURIComponent(fname));
        });

        questionImages?.forEach((qi: any) => {
            const fname = extractFilename(qi.image_data);
            if (fname) usedFilenames.add(decodeURIComponent(fname));
        });

        // 3. Identify orphans
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const orphanedFiles = files.filter((f: any) => !usedFilenames.has(f.name));

        if (orphanedFiles.length === 0) {
            return { deletedCount: 0, deletedFiles: [], spaceReclaimed: 0 };
        }

        // 4. Delete orphans
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filesToDelete = orphanedFiles.map((f: any) => f.name);
        const { error: removeError } = await (supabase.storage.from(bucketName) as any)
            .remove(filesToDelete);

        if (removeError) throw new Error(`Remove failed: ${removeError.message}`);

        // Calculate freed space
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const spaceReclaimed = orphanedFiles.reduce((acc: number, f: any) => acc + (f.metadata?.size || 0), 0);

        return {
            deletedCount: filesToDelete.length,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            deletedFiles: orphanedFiles.map((f: any) => f.name),
            spaceReclaimed
        };

    } catch (e: any) {
        return { error: e.message };
    }
}

/**
 * Get distinct domain values from questions table
 */
export async function getDistinctDomains(): Promise<string[]> {
    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('questions') as any)
        .select('domain')
        .order('domain', { ascending: true });

    if (error || !data) {
        return [];
    }

    // Extract unique domains
    const domains = [...new Set(data.map((d: { domain: string }) => d.domain).filter(Boolean))] as string[];
    return domains;
}

/**
 * Toggle the is_important flag for a question
 */
export async function toggleImportant(id: string, currentStatus: boolean) {
    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('questions') as any)
        .update({ is_important: !currentStatus })
        .eq('id', id);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/admin/questions');
    return { success: true };
}
