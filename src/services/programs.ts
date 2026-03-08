import { supabase } from '@/lib/supabase';

export async function fetchPrograms() {
    const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('is_active', true)
        // TEMP: There is no `is_published`/`status`/`published_at` field on `programs` yet.
        // Until we add a real publish flag in the DB, hide obvious seed/demo programs by name.
        .not('name', 'ilike', 'demo%')
        .not('name', 'ilike', 'sample%')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
}
