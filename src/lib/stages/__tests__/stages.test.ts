import { calculateStage, calculateStageProgress, POINTS, THRESHOLDS } from '../calculator';

describe('Becoming Stages Calculator', () => {
    describe('calculateStage', () => {
        it('should return initiate for 0 points', () => {
            const input = { workoutCount: 0, progressEntryCount: 0, photoCount: 0 };
            expect(calculateStage(input)).toBe('initiate');
        });

        it('should return practitioner when reaching the threshold', () => {
            // 2 workouts * 5pts = 10pts
            const input = { workoutCount: 2, progressEntryCount: 0, photoCount: 0 };
            expect(calculateStage(input)).toBe('practitioner');
        });

        it('should return devoted when reaching the threshold', () => {
            // 10 workouts * 5pts = 50pts
            const input = { workoutCount: 10, progressEntryCount: 0, photoCount: 0 };
            expect(calculateStage(input)).toBe('devoted');
        });

        it('should return embodied when reaching the threshold', () => {
            // 30 workouts * 5pts = 150pts
            const input = { workoutCount: 30, progressEntryCount: 0, photoCount: 0 };
            expect(calculateStage(input)).toBe('embodied');
        });

        it('should handle mixed input', () => {
            // 1 workout (5) + 3 entries (6) = 11 pts -> practitioner
            const input = { workoutCount: 1, progressEntryCount: 3, photoCount: 0 };
            expect(calculateStage(input)).toBe('practitioner');
        });
    });

    describe('calculateStageProgress', () => {
        it('should return 0% for brand new users', () => {
            const input = { workoutCount: 0, progressEntryCount: 0, photoCount: 0 };
            expect(calculateStageProgress(input)).toBe(0);
        });

        it('should return 50% progress towards practitioner', () => {
            // 1 workout = 5pts. Threshold to Practitioner is 10.
            const input = { workoutCount: 1, progressEntryCount: 0, photoCount: 0 };
            expect(calculateStageProgress(input)).toBe(50);
        });

        it('should return 100% when max stage is reached', () => {
            const input = { workoutCount: 40, progressEntryCount: 0, photoCount: 0 };
            expect(calculateStageProgress(input)).toBe(100);
        });
    });
});
