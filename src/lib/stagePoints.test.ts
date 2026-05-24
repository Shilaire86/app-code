import { POINTS } from '@/lib/stages/calculator';
import { calculateTotalPoints } from '@/lib/stagePoints';

describe('stagePoints', () => {
    it('weights workouts, check-ins, and photos consistently', () => {
        expect(calculateTotalPoints({ workoutCount: 2, progressEntryCount: 3, photoCount: 1 })).toBe(
            2 * POINTS.WORKOUT + 3 * POINTS.PROGRESS_ENTRY + 1 * POINTS.PHOTO
        );
    });

    it('returns zero for empty counts', () => {
        expect(calculateTotalPoints({ workoutCount: 0, progressEntryCount: 0, photoCount: 0 })).toBe(0);
    });
});
