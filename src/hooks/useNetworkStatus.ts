import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useSyncQueueStore } from '@/stores/syncQueueStore';

export function useNetworkStatus() {
    const [isConnected, setIsConnected] = useState<boolean>(true);
    const { processQueue } = useSyncQueueStore();

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            const connected = !!state.isConnected && !!state.isInternetReachable;

            // If we just regained connection, try to sync the queue
            if (!isConnected && connected) {
                console.log('[Network] Connection restored, processing sync queue...');
                processQueue().catch(console.error);
            }

            setIsConnected(connected);
        });

        return () => {
            unsubscribe();
        };
    }, [isConnected, processQueue]);

    return { isConnected };
}
