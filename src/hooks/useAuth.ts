import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export function useAuth() {
    const { setAuth, user, session, initialized } = useAuthStore();
    const initializedRef = useRef(initialized);

    useEffect(() => {
        initializedRef.current = initialized;
    }, [initialized]);

    useEffect(() => {
        // Check for initial session
        const sessionTimeout = setTimeout(() => {
            if (!initializedRef.current) {
                console.warn('[useAuth] Session check timed out, forcing initialization');
                setAuth(null);
            }
        }, 10000);

        supabase.auth.getSession().then(({ data: { session }, error }) => {
            clearTimeout(sessionTimeout);
            if (error) {
                // Invalid refresh token or other auth error → clear session gracefully
                console.warn('[useAuth] Session error (clearing):', error.message);
                supabase.auth.signOut().catch((signOutError) => {
                    console.error('[useAuth] Failed to clear invalid session:', signOutError);
                });
                setAuth(null);
                return;
            }
            console.log('[useAuth] Initial session found:', !!session);
            setAuth(session);
        }).catch(err => {
            clearTimeout(sessionTimeout);
            console.error('[useAuth] Error getting session:', err);
            setAuth(null); // Fallback to null session so app can proceed to login
        });


        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (event === 'TOKEN_REFRESHED') {
                    console.log('[useAuth] Token refreshed successfully');
                }
                if (event === 'SIGNED_OUT') {
                    console.log('[useAuth] User signed out');
                    setAuth(null);
                    return;
                }
                setAuth(session);
            }
        );

        return () => {
            clearTimeout(sessionTimeout);
            subscription.unsubscribe();
        };
    }, [setAuth]);

    return { user, session, initialized };
}
