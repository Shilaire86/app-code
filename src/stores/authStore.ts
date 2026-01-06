import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';

interface AuthState {
    user: User | null;
    session: Session | null;
    initialized: boolean;
    setAuth: (session: Session | null) => void;
    signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    session: null,
    initialized: false,
    setAuth: (session) =>
        set({
            session,
            user: session?.user ?? null,
            initialized: true,
        }),
    signOut: () =>
        set({
            session: null,
            user: null,
            initialized: true,
        }),
}));
