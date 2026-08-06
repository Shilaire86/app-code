import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Pedometer } from 'expo-sensors';
import { useRunStore, RunCoords } from '@/stores/runStore';

export const LOCATION_TASK_NAME = 'becoming-method-run-tracking';

// Skip GPS fixes worse than this — a stale/low-accuracy fix (common
// indoors, under tree cover, or right after starting) can register as a
// big fake jump in distance if we don't filter it out.
const MIN_ACCEPTABLE_ACCURACY_METERS = 25;
// Ignore movement smaller than this between two fixes — GPS jitter while
// standing still otherwise slowly accumulates as fake distance over a
// long run.
const MIN_MOVEMENT_METERS = 2;

function haversineDistanceMeters(a: RunCoords, b: RunCoords): number {
    const R = 6371000; // Earth's radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(Math.min(1, h)));
}

// Must be registered at module load time (not inside a component) so it's
// already defined if the OS relaunches the JS engine in the background to
// deliver a location update while the app isn't in the foreground. This
// module needs to be imported somewhere guaranteed to load on every launch
// — see app/_layout.tsx.
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
        console.error('[runTracking] Location task error:', error);
        return;
    }
    if (!data) return;

    const { locations } = data as { locations: Location.LocationObject[] };
    const store = useRunStore.getState();
    if (!store.activeRunId || store.isPaused) return;

    for (const loc of locations) {
        const { latitude, longitude, accuracy } = loc.coords;
        if (accuracy != null && accuracy > MIN_ACCEPTABLE_ACCURACY_METERS) continue;

        const next = { latitude, longitude };
        const prev = useRunStore.getState().lastCoords;
        if (!prev) {
            useRunStore.getState().setLastCoords(next);
            continue;
        }

        const meters = haversineDistanceMeters(prev, next);
        if (meters >= MIN_MOVEMENT_METERS) {
            useRunStore.getState().addDistance(meters, next);
        }
    }
});

export type RunPermissionStatus = {
    foregroundGranted: boolean;
    backgroundGranted: boolean;
    motionGranted: boolean;
};

/**
 * Requests permissions in the order Apple expects: foreground location
 * first, then background ("Always") only after foreground is granted —
 * asking for Always up front is a common App Store rejection reason.
 */
export async function requestRunPermissionsAsync(): Promise<RunPermissionStatus> {
    const foreground = await Location.requestForegroundPermissionsAsync();
    let backgroundGranted = false;
    if (foreground.status === 'granted') {
        const background = await Location.requestBackgroundPermissionsAsync();
        backgroundGranted = background.status === 'granted';
    }

    let motionGranted = false;
    try {
        const motion = await Pedometer.requestPermissionsAsync();
        motionGranted = motion.status === 'granted';
    } catch {
        // Some platforms (e.g. simulators, Android without a step sensor)
        // don't support this — treat as "no step data" rather than failing
        // the whole run.
        motionGranted = false;
    }

    return { foregroundGranted: foreground.status === 'granted', backgroundGranted, motionGranted };
}

export async function startLocationTrackingAsync(): Promise<void> {
    const alreadyRunning = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME).catch(() => false);
    if (alreadyRunning) return;

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 5, // meters
        timeInterval: 3000, // ms — Android honors this; iOS is distance-driven
        activityType: Location.ActivityType.Fitness,
        showsBackgroundLocationIndicator: true,
        pausesUpdatesAutomatically: false,
        foregroundService: {
            notificationTitle: 'Tracking your run',
            notificationBody: 'The Becoming Method is tracking your outdoor run in the background.',
        },
    });
}

export async function stopLocationTrackingAsync(): Promise<void> {
    const running = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME).catch(() => false);
    if (running) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
}

/**
 * Step count is queried after the fact rather than watched live — CMPedometer
 * on iOS keeps counting at the OS level regardless of whether the app is
 * running, so there's no need for a continuous background subscription (and
 * no extra permission burden beyond the one-time Motion & Fitness grant).
 */
export async function getStepCountForRangeAsync(start: Date, end: Date): Promise<number | null> {
    try {
        const available = await Pedometer.isAvailableAsync();
        if (!available) return null;
        const result = await Pedometer.getStepCountAsync(start, end);
        return result?.steps ?? null;
    } catch (err) {
        console.warn('[runTracking] Failed to read step count:', err);
        return null;
    }
}

export function metersToMiles(meters: number): number {
    return meters / 1609.344;
}

/** Formats seconds-per-mile as "M:SS / mi". Returns "--" when there's no distance yet. */
export function formatPace(elapsedSeconds: number, distanceMeters: number): string {
    const miles = metersToMiles(distanceMeters);
    if (miles < 0.02) return '--';
    const secondsPerMile = elapsedSeconds / miles;
    const mins = Math.floor(secondsPerMile / 60);
    const secs = Math.round(secondsPerMile % 60);
    return `${mins}:${String(secs).padStart(2, '0')} /mi`;
}
