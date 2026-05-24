import { POINTS } from '@/lib/stages/calculator';

export type ActivityCounts = {
    workoutCount: number;
    progressEntryCount: number;
    photoCount: number;
};

export function calculateTotalPoints(activityCounts: ActivityCounts): number {
    return (
        activityCounts.workoutCount * POINTS.WORKOUT +
        activityCounts.progressEntryCount * POINTS.PROGRESS_ENTRY +
        activityCounts.photoCount * POINTS.PHOTO
    );
}
