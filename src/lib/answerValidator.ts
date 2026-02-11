import type { QuestionType, QuestionWithOptions } from '@/types/database';

export interface AnswerData {
    selectedOptions?: string[];  // For Single/Multi
    pairs?: { source: string; target: string }[];  // For DragDrop
    config?: Record<string, string>;  // For Simulation
}

export interface ValidationResult {
    isCorrect: boolean;
    correctAnswer: string[];
    explanation: string | null;
}

/**
 * Validate user answer against correct answer
 */
export function validateAnswer(
    question: QuestionWithOptions,
    answerData: AnswerData
): ValidationResult {
    const { question_type, options, explanation, simulation_target_json } = question;

    switch (question_type) {
        case 'Single':
            return validateSingleChoice(options, answerData.selectedOptions || []);

        case 'Multi':
            return validateMultiChoice(options, answerData.selectedOptions || []);

        case 'DragDrop':
            return validateDragDrop(options, answerData.pairs || []);

        case 'Simulation':
            return validateSimulation(
                simulation_target_json as Record<string, string> | null,
                answerData.config || {}
            );

        default:
            return {
                isCorrect: false,
                correctAnswer: [],
                explanation,
            };
    }
}

/**
 * Single choice: exactly one correct option must be selected
 */
function validateSingleChoice(
    options: QuestionWithOptions['options'],
    selectedOptions: string[]
): ValidationResult {
    const correctOptions = options.filter(o => o.is_correct);
    const correctIds = correctOptions.map(o => o.id);

    const isCorrect =
        selectedOptions.length === 1 &&
        correctIds.includes(selectedOptions[0]);

    return {
        isCorrect,
        correctAnswer: correctOptions.map(o => o.text),
        explanation: null,
    };
}

/**
 * Multi choice: all correct options must be selected, no incorrect ones
 */
function validateMultiChoice(
    options: QuestionWithOptions['options'],
    selectedOptions: string[]
): ValidationResult {
    const correctOptions = options.filter(o => o.is_correct);
    const correctIds = new Set(correctOptions.map(o => o.id));
    const selectedSet = new Set(selectedOptions);

    // Check if sets are equal
    const isCorrect =
        correctIds.size === selectedSet.size &&
        [...correctIds].every(id => selectedSet.has(id));

    return {
        isCorrect,
        correctAnswer: correctOptions.map(o => o.text),
        explanation: null,
    };
}

/**
 * Drag and Drop: pairs must match exactly
 * Option text format: "source|target"
 */
export function validateDragDrop(
    options: QuestionWithOptions['options'],
    userPairs: { source: string; target: string }[]
): ValidationResult {
    // Parse correct pairs from options
    const correctPairs = options
        .filter(o => o.is_correct)
        .map(o => {
            const parts = (o.text || '').split('|');
            const source = parts[0] || '';
            const target = parts[1] || '';
            return { source: source.trim(), target: target.trim() };
        });

    // Check if all pairs match
    const isCorrect =
        userPairs.length === correctPairs.length &&
        correctPairs.every(cp =>
            userPairs.some(up =>
                up.source === cp.source && up.target === cp.target
            )
        );

    return {
        isCorrect,
        correctAnswer: correctPairs.map(p => `${p.source} → ${p.target}`),
        explanation: null,
    };
}

/**
 * Simulation: partial key-value match
 * User config must have all required keys with matching values
 */
function validateSimulation(
    targetJson: Record<string, string> | null,
    userConfig: Record<string, string>
): ValidationResult {
    if (!targetJson) {
        return {
            isCorrect: false,
            correctAnswer: [],
            explanation: null,
        };
    }

    // Check if all target keys exist in user config with correct values
    // (partial match - user config can have extra keys)
    const requiredKeys = Object.keys(targetJson);
    const isCorrect = requiredKeys.every(key => {
        const targetValue = String(targetJson[key]).toLowerCase().trim();
        const userValue = String(userConfig[key] || '').toLowerCase().trim();
        return userValue === targetValue;
    });

    return {
        isCorrect,
        correctAnswer: Object.entries(targetJson).map(([k, v]) => `${k}: ${v}`),
        explanation: null,
    };
}

/**
 * Format answer data for storage
 */
export function formatAnswerForStorage(
    questionType: QuestionType,
    answerData: AnswerData
): Record<string, unknown> {
    return {
        type: questionType,
        ...answerData,
        timestamp: new Date().toISOString(),
    };
}
