import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export function useAuth() {
    const { setAuth, user, session, initialized } = useAuthStore();

    useEffect(() => {
        // Check for initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setAuth(session);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setAuth(session);
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, [setAuth]);

    return { user, session, initialized };
}
