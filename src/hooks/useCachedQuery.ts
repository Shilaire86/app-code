import { useEffect, useRef, useState } from 'react';

type CacheEntry<T> = {
    data: T;
    timestamp: number;
};

const queryCache = new Map<string, CacheEntry<unknown>>();

interface UseCachedQueryOptions {
    staleTimeMs?: number;
    enabled?: boolean;
}

export function useCachedQuery<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: UseCachedQueryOptions = {}
) {
    const { staleTimeMs = 60_000, enabled = true } = options;
    const cached = queryCache.get(key) as CacheEntry<T> | undefined;
    const isFresh = cached ? Date.now() - cached.timestamp < staleTimeMs : false;

    const [data, setData] = useState<T | null>(cached?.data ?? null);
    const [error, setError] = useState<Error | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(enabled && !cached);
    const isMounted = useRef(true);

    const runFetch = async (showLoading: boolean) => {
        if (!enabled) return;
        if (showLoading) setIsLoading(true);
        setError(null);

        try {
            const result = await fetcher();
            queryCache.set(key, { data: result, timestamp: Date.now() });
            if (isMounted.current) {
                setData(result);
            }
        } catch (err) {
            if (isMounted.current) {
                setError(err as Error);
            }
        } finally {
            if (isMounted.current) {
                setIsLoading(false);
            }
        }
    };

    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    useEffect(() => {
        if (!enabled) return;
        if (!cached || !isFresh) {
            runFetch(!cached);
        }
    }, [key, enabled]);

    const refetch = () => runFetch(true);

    return { data, error, isLoading, refetch };
}
