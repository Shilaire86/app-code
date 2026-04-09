import { calculateStage, calculateStageProgress, POINTS, THRESHOLDS } from '../calculator';

describe('Becoming Stages Calculator', () => {
    describe('calculateStage', () => {
        it('should return initiate for 0 points', () => {
            const input = { workoutCount: 0, progressEntryCount: 0, photoCount: 0 };
            expect(calculateStage(input)).toBe('initiate');
        });

        it('should return practitioner when reaching the threshold', () => {
            const input = {
                workoutCount: THRESHOLDS.PRACTITIONER / POINTS.WORKOUT,
                progressEntryCount: 0,
                photoCount: 0,
            };
            expect(calculateStage(input)).toBe('practitioner');
        });

        it('should return devoted when reaching the threshold', () => {
            const input = {
                workoutCount: THRESHOLDS.DEVOTED / POINTS.WORKOUT,
                progressEntryCount: 0,
                photoCount: 0,
            };
            expect(calculateStage(input)).toBe('devoted');
        });

        it('should return embodied when reaching the threshold', () => {
            const input = {
                workoutCount: THRESHOLDS.EMBODIED / POINTS.WORKOUT,
                progressEntryCount: 0,
                photoCount: 0,
            };
            expect(calculateStage(input)).toBe('embodied');
        });

        it('should handle mixed input', () => {
            const input = {
                workoutCount: 4,
                progressEntryCount: 5,
                photoCount: 0,
            };
            expect(calculateStage(input)).toBe('practitioner');
        });
    });

    describe('calculateStageProgress', () => {
        it('should return 0% for brand new users', () => {
            const input = { workoutCount: 0, progressEntryCount: 0, photoCount: 0 };
            expect(calculateStageProgress(input)).toBe(0);
        });

        it('should return 50% progress towards practitioner', () => {
            const input = {
                workoutCount: THRESHOLDS.PRACTITIONER / (2 * POINTS.WORKOUT),
                progressEntryCount: 0,
                photoCount: 0,
            };
            expect(calculateStageProgress(input)).toBe(50);
        });

        it('should return 100% when max stage is reached', () => {
            const input = {
                workoutCount: THRESHOLDS.EMBODIED / POINTS.WORKOUT,
                progressEntryCount: 0,
                photoCount: 0,
            };
            expect(calculateStageProgress(input)).toBe(100);
        });
    });
});
