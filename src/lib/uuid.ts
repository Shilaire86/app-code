/**
 * Generates an RFC4122 v4-format UUID string without relying on
 * `crypto.randomUUID()`, whose availability varies across Hermes/RN
 * versions. Only used as a client-side idempotency key (e.g. deduping
 * offline-queued writes) — not for anything security-sensitive, so
 * Math.random-based entropy is fine here.
 */
export function generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
