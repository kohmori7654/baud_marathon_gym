'use client';

import React, { useState, useEffect } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    sortableKeyboardCoordinates,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { GripVertical, ArrowDown, ArrowRight, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateDragDrop } from '@/lib/answerValidator';
import type { Question } from '@/types/database';

// --- Custom Sensor ---
// Custom PointerSensor to prevent drag on simple clicks and allow scrolling
// Requires a small movement (tolerance) before starting drag.
// Also adds a delay to prevent accidental drags on touch.
import { PointerSensor as BasePointerSensor } from '@dnd-kit/core';

class TouchSensor extends BasePointerSensor {
    static activators = [
        {
            eventName: 'onPointerDown' as const,
            handler: ({ nativeEvent: event }: { nativeEvent: PointerEvent }) => {
                const element = event.target as Element;
                if (
                    !event.isPrimary ||
                    event.button !== 0 ||
                    isInteractiveElement(element)
                ) {
                    return false;
                }
                return true;
            },
        },
    ];
}

function isInteractiveElement(element: Element | null) {
    const interactiveElements = [
        'button',
        'input',
        'textarea',
        'select',
        'option',
    ];

    while (element) {
        if (interactiveElements.includes(element.tagName.toLowerCase())) {
            return true;
        }
        element = element.parentElement;
    }

    return false;
}

// --- Components ---

function DraggableItem({ id, text, isOverlay, disabled, isCorrect }: { id: string; text: string; isOverlay?: boolean; disabled?: boolean; isCorrect?: boolean }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id, disabled });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 999 : undefined, // Ensure dragged item is on top
    };

    let borderColor = "border-slate-600";
    let bgColor = "bg-slate-800";

    if (isCorrect === true) {
        borderColor = "border-emerald-500";
        bgColor = "bg-emerald-900/30";
    } else if (isCorrect === false) {
        borderColor = "border-red-500";
        bgColor = "bg-red-900/30";
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                "p-3 rounded-md border text-sm font-medium touch-none select-none flex items-center gap-2",
                disabled ? "cursor-default" : "cursor-grab active:cursor-grabbing",
                isDragging ? "opacity-50 bg-slate-700 border-slate-500 scale-105 shadow-xl" : `${bgColor} ${borderColor} hover:bg-slate-700 hover:border-slate-500`,
                isOverlay ? "bg-slate-700 border-slate-400 shadow-2xl opacity-100 scale-105 z-[9999]" : ""
            )}
        >
            {!disabled && <GripVertical className="w-4 h-4 text-slate-500" />}
            <span className="text-white break-words w-full flex items-center justify-between">
                {text}
                {isCorrect === true && <Check className="w-4 h-4 text-emerald-500" />}
                {isCorrect === false && <X className="w-4 h-4 text-red-500" />}
            </span>
        </div>
    );
}

function DropZone({
    id,
    text,
    assignedItems,
    isCorrect,
    showResult,
    dragDropType,
    children
}: {
    id: string;
    text: string;
    assignedItems: string[];
    isCorrect?: boolean;
    showResult?: boolean;
    dragDropType?: 'categorization' | 'ordering' | 'matching';
    children?: React.ReactNode
}) {
    const { setNodeRef, isOver } = useSortable({
        id,
        data: {
            type: 'DropZone',
            accepts: 'item', // Optional: could limit what type of item
        },
        disabled: showResult
    });

    // Result styling
    let borderColor = isOver ? 'border-blue-500 bg-slate-800/80 ring-2 ring-blue-500/50' : 'border-slate-600 bg-slate-900/50';
    let bgColor = '';

    // In ShowResult mode, we don't color the BOX itself red/green heavily, 
    // unless strictly all items are correct.
    // Instead we rely on item coloration.
    // But maybe for Ordering, we can show if the sequence is correct? 
    // For now, keep container neutral-ish or subtle.

    const isMatching = dragDropType === 'matching';

    return (
        <div
            ref={setNodeRef}
            className={cn(
                'rounded-lg border-2 border-dashed transition-all flex flex-col gap-2',
                isMatching ? 'p-3 min-h-[60px]' : 'p-4 min-h-[100px]',
                borderColor,
                bgColor
            )}
        >
            <div className="flex items-center justify-between mb-1">
                <span className="text-slate-200 font-medium text-sm">{text}</span>
            </div>

            <div className="flex flex-col gap-2 flex-grow">
                {children}

                {/* Placeholder if empty */}
                {assignedItems.length === 0 && !showResult && (
                    <div className="flex-grow flex items-center justify-center text-slate-500 text-xs py-2">
                        ここにドロップ
                    </div>
                )}
            </div>
        </div>
    );
}

// --- Main Component ---

interface DragDropProps {
    question: Question & { options: { id: string; text: string; sort_order: number; is_correct?: boolean }[] };
    userAnswer?: any;
    showResult?: boolean;
    disabled?: boolean;
    onAnswerChange?: (answer: { source: string; target: string }[]) => void;
}

export function DragDrop({ question, userAnswer, showResult, disabled, onAnswerChange }: DragDropProps) {
    const [draggableItems, setDraggableItems] = useState<{ id: string; text: string }[]>([]);
    const [sources, setSources] = useState<string[]>([]);
    const [dragDropType, setDragDropType] = useState<'categorization' | 'ordering' | 'matching'>('categorization');

    // assignments: Record<Source, OptionID[]> (Many-to-One support)
    const [assignments, setAssignments] = useState<Record<string, string[]>>({});

    const [activeId, setActiveId] = useState<string | null>(null);

    // Initial parsing
    useEffect(() => {
        const items: { id: string; text: string }[] = [];
        const s = new Set<string>();

        question.options.forEach(opt => {
            if (opt.text.includes('|')) {
                const parts = opt.text.split('|');
                if (parts.length === 2) {
                    s.add(parts[0].trim());
                    items.push({
                        id: opt.id,
                        text: parts[1].trim()
                    });
                }
            }
        });

        // Determine type from simulation_target_json
        let type: 'categorization' | 'ordering' | 'matching' = 'categorization';
        if (question.simulation_target_json) {
            const json = typeof question.simulation_target_json === 'string'
                ? JSON.parse(question.simulation_target_json)
                : question.simulation_target_json;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (json && (json as any).dragDropType) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                type = (json as any).dragDropType;
            }
        }
        setDragDropType(type);

        // Sort sources
        const sortedSources = Array.from(s).sort((a, b) => {
            const optA = question.options.find(o => o.text.startsWith(a + '|'));
            const optB = question.options.find(o => o.text.startsWith(b + '|'));
            return (optA?.sort_order || 0) - (optB?.sort_order || 0);
        });

        setSources(sortedSources);

        // Shuffle items (only initially)
        setDraggableItems(items.sort(() => Math.random() - 0.5));
    }, [question]);

    // Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        if (showResult || disabled) return;
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        if (showResult || disabled) return;
        const { active, over } = event;
        setActiveId(null);

        const targetItemId = active.id as string;

        // Remove item from its current location first
        const newAssignments = { ...assignments };
        for (const source of Object.keys(newAssignments)) {
            newAssignments[source] = newAssignments[source].filter(id => id !== targetItemId);
            if (newAssignments[source].length === 0) {
                delete newAssignments[source];
            }
        }

        if (!over) {
            setAssignments(newAssignments);
            return;
        }

        const dropZoneId = over.id as string;
        let targetSourceId = dropZoneId;

        // If dropped on an item inside a source, find that source
        if (!sources.includes(dropZoneId)) {
            // Check if dropZoneId is an item (OptionID) in existing assignments
            const foundSource = Object.keys(assignments).find(source =>
                assignments[source].includes(dropZoneId)
            );
            if (foundSource) {
                targetSourceId = foundSource;
            }
        }

        // Check if targetSourceId is a valid Source
        if (sources.includes(targetSourceId)) {
            if (!newAssignments[targetSourceId]) {
                newAssignments[targetSourceId] = [];
            }
            if (!newAssignments[targetSourceId].includes(targetItemId)) {
                newAssignments[targetSourceId].push(targetItemId);
            }
            setAssignments(newAssignments);
        } else {
            setAssignments(newAssignments);
        }
    };

    const handleSubmit = () => {
        if (!onAnswerChange) return;

        // Convert Record<Source, OptionID[]> to { source, targetText }[]
        const answerPairs: { source: string; target: string }[] = [];
        Object.entries(assignments).forEach(([source, optionIds]) => {
            optionIds.forEach(id => {
                const item = draggableItems.find(i => i.id === id);
                if (item) {
                    answerPairs.push({ source, target: item.text });
                }
            });
        });
        onAnswerChange(answerPairs);
    };

    // Calculate unassigned items (using OptionIDs)
    const assignedIdsSet = new Set<string>();
    Object.values(assignments).forEach(ids => ids.forEach(id => assignedIdsSet.add(id)));
    const unassignedItems = draggableItems.filter(item => !assignedIdsSet.has(item.id));

    // Sync with userAnswer if provided
    useEffect(() => {
        if (userAnswer && draggableItems.length > 0) {
            const manualAssignments: Record<string, string[]> = {};
            const usedIds = new Set<string>();

            // userAnswer is { source, target (text) }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            userAnswer.forEach((p: any) => {
                if (!manualAssignments[p.source]) manualAssignments[p.source] = [];

                // Find a matching unused item
                const matchingItem = draggableItems.find(
                    item => item.text === p.target && !usedIds.has(item.id)
                );

                if (matchingItem) {
                    manualAssignments[p.source].push(matchingItem.id);
                    usedIds.add(matchingItem.id);
                }
            });
            setAssignments(manualAssignments);
        }
    }, [userAnswer, draggableItems]);


    // Check item correctness (needs to map ID to text first)
    // Check item correctness (needs to map ID to text first)
    const checkItemCorrect = (source: string, itemId: string) => {
        const item = draggableItems.find(i => i.id === itemId);
        if (!item) return false;

        // Check if ANY correct option matches this source and target (after trimming)
        // This mirrors validateDragDrop logic in answerValidator.ts
        return question.options.some(o => {
            if (!o.is_correct) return false;
            const parts = o.text.split('|');
            if (parts.length < 2) return false;

            const optSource = parts[0].trim();
            const optTarget = parts[1].trim();

            return optSource === source && optTarget === item.text;
        });
    };


    const dropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.5',
                },
            },
        }),
    };

    // Helper to get text from ID
    const getText = (id: string | null) => {
        if (!id) return '';
        const item = draggableItems.find(i => i.id === id);
        return item ? item.text : '';
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex flex-col gap-8 md:gap-12 select-none">
                {/* Available Items (Source List) */}
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">
                        選択肢 ({unassignedItems.length})
                    </h3>
                    <div className="flex flex-wrap gap-2 min-h-[60px] p-2 rounded-lg bg-slate-950/30">
                        {unassignedItems.map((item) => (
                            <DraggableItem key={item.id} id={item.id} text={item.text} disabled={showResult || disabled} />
                        ))}
                        {unassignedItems.length === 0 && (
                            <div className="w-full h-full flex items-center justify-center text-slate-600 text-sm">
                                全ての項目が配置されました
                            </div>
                        )}
                    </div>
                </div>

                {/* Drop Zones Area */}
                <div className="space-y-4">
                    {/* Guidance/Title based on type */}
                    {dragDropType === 'ordering' && (
                        <div className="flex items-center gap-2 text-slate-300 pb-2 border-b border-slate-700 mb-4">
                            <ArrowDown className="w-4 h-4" />
                            <span className="text-sm font-medium">正しい順序に並べ替えてください</span>
                        </div>
                    )}

                    <div className={cn(
                        "grid gap-6",
                        dragDropType === 'ordering' ? "grid-cols-1 max-w-xl mx-auto" :
                            dragDropType === 'matching' ? "grid-cols-1 md:grid-cols-1 max-w-3xl mx-auto" :
                                "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" // Categorization default
                    )}>
                        {sources.map((source, index) => {
                            const assignedIds = assignments[source] || [];
                            return (
                                <React.Fragment key={source}>
                                    {/* Ordering Arrow Connector */}
                                    {dragDropType === 'ordering' && index > 0 && (
                                        <div className="flex justify-center -my-3 z-0">
                                            <ArrowDown className="w-6 h-6 text-slate-600" />
                                        </div>
                                    )}

                                    <div className={cn(
                                        "relative",
                                        dragDropType === 'matching' ? "flex items-center gap-4 bg-slate-800/20 p-2 rounded-lg" : ""
                                    )}>
                                        {/* Matching Layout: Source Label Left -> Arrow -> DropZone Right */}
                                        {dragDropType === 'matching' ? (
                                            <>
                                                <div className="w-1/3 text-right pr-4 font-medium text-slate-300 flex items-center justify-end gap-2 text-sm">
                                                    {source}
                                                </div>
                                                <ArrowRight className="w-5 h-5 text-slate-600 shrink-0" />
                                                <div className="flex-1">
                                                    <DropZone
                                                        id={source}
                                                        text="ここにドロップ" // Simplified text for matching
                                                        assignedItems={assignedIds}
                                                        isCorrect={undefined} // Handled by item color
                                                        showResult={showResult}
                                                        dragDropType={dragDropType}
                                                    >
                                                        {assignedIds.map((id) => (
                                                            <DraggableItem
                                                                key={id}
                                                                id={id}
                                                                text={getText(id)}
                                                                disabled={showResult || disabled}
                                                                isCorrect={showResult ? checkItemCorrect(source, id) : undefined}
                                                            />
                                                        ))}
                                                    </DropZone>
                                                </div>
                                            </>
                                        ) : (
                                            // Standard & Ordering Layout
                                            <DropZone
                                                id={source}
                                                text={source}
                                                assignedItems={assignedIds}
                                                isCorrect={undefined}
                                                showResult={showResult}
                                                dragDropType={dragDropType}
                                            >
                                                {assignedIds.map((id) => (
                                                    <DraggableItem
                                                        key={id}
                                                        id={id}
                                                        text={getText(id)}
                                                        disabled={showResult || disabled}
                                                        isCorrect={showResult ? checkItemCorrect(source, id) : undefined}
                                                    />
                                                ))}
                                            </DropZone>
                                        )}
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            </div>

            <DragOverlay dropAnimation={dropAnimation}>
                {activeId ? <DraggableItem id={activeId} text={getText(activeId)} isOverlay /> : null}
            </DragOverlay>

            {!disabled && !showResult && (
                <div className="mt-8">
                    <Button
                        onClick={handleSubmit}
                        disabled={unassignedItems.length > 0}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 py-6 text-lg font-semibold shadow-lg shadow-emerald-900/20"
                    >
                        回答する ({draggableItems.length - unassignedItems.length}/{draggableItems.length} 完了)
                    </Button>
                    {unassignedItems.length > 0 && (
                        <p className="text-center text-slate-500 text-sm mt-2">
                            すべての項目を配置すると回答できます
                        </p>
                    )}
                </div>
            )}
        </DndContext>
    );
}
