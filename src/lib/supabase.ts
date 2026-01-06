import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Variables from .env file
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
        'Supabase URL or Anon Key is missing. Check your .env file.',
    );
}

export const supabase = createClient(
    supabaseUrl || '',
    supabaseAnonKey || '',
);
