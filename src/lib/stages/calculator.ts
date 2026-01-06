import { BecomingStage } from '@/stores/profileStore';

export interface StageScoreInput {
    workoutCount: number;
    progressEntryCount: number;
    photoCount: number;
}

export const POINTS = {
    WORKOUT: 5,
    PROGRESS_ENTRY: 2,
    PHOTO: 10,
};

export const THRESHOLDS = {
    PRACTITIONER: 10,
    DEVOTED: 50,
    EMBODIED: 150,
};

/**
 * Calculates the user's Becoming Stage based on their activity points.
 */
export function calculateStage(input: StageScoreInput): BecomingStage {
    const totalPoints =
        input.workoutCount * POINTS.WORKOUT +
        input.progressEntryCount * POINTS.PROGRESS_ENTRY +
        input.photoCount * POINTS.PHOTO;

    if (totalPoints >= THRESHOLDS.EMBODIED) {
        return 'embodied';
    }
    if (totalPoints >= THRESHOLDS.DEVOTED) {
        return 'devoted';
    }
    if (totalPoints >= THRESHOLDS.PRACTITIONER) {
        return 'practitioner';
    }
    return 'initiate';
}

/**
 * Returns the percentage progress toward the next stage.
 */
export function calculateStageProgress(input: StageScoreInput): number {
    const totalPoints =
        input.workoutCount * POINTS.WORKOUT +
        input.progressEntryCount * POINTS.PROGRESS_ENTRY +
        input.photoCount * POINTS.PHOTO;

    let nextThreshold = THRESHOLDS.PRACTITIONER;
    let currentThreshold = 0;

    if (totalPoints >= THRESHOLDS.EMBODIED) {
        return 100;
    } else if (totalPoints >= THRESHOLDS.DEVOTED) {
        nextThreshold = THRESHOLDS.EMBODIED;
        currentThreshold = THRESHOLDS.DEVOTED;
    } else if (totalPoints >= THRESHOLDS.PRACTITIONER) {
        nextThreshold = THRESHOLDS.DEVOTED;
        currentThreshold = THRESHOLDS.PRACTITIONER;
    }

    const range = nextThreshold - currentThreshold;
    const progressInStep = totalPoints - currentThreshold;
    return Math.min(100, Math.max(0, (progressInStep / range) * 100));
}
