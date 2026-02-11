export interface AnalyticsMetrics {
    last_5_mock_avg: number;
    sim_accuracy: number;
    avg_speed_seconds: number;
    learning_density: number;
    domain_min_accuracy: number;
}

export interface RadarDataPoint {
    domain: string;
    accuracy: number;
    total: number;
}

export interface HistoryDataPoint {
    date: string;
    score: number;
    mode: string;
}

export interface WeakQuestion {
    id: string;
    text: string;
    domain: string;
    correct_count: number;
    wrong_count: number;
    total_attempts: number;
    last_attempt_correct: boolean;
}

export type SignalType = 'GO' | 'REVIEW' | 'STOP';

export interface StudentAnalyticsData {
    signal: SignalType;
    metrics: AnalyticsMetrics;
    radar_data: RadarDataPoint[];
    history_data: HistoryDataPoint[];
    weak_questions: WeakQuestion[];
}
