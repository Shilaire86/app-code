import { supabase } from '@/lib/supabase';

export type MealEstimate = {
    name: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    items: string[];
    confidence: 'low' | 'medium' | 'high';
};

// Sends a base64 meal photo to the analyze-meal-photo edge function and returns
// an editable macro estimate. The function gates access to VIP/Elite server-side.
export async function estimateMealFromPhoto(
    imageBase64: string,
    mediaType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg',
): Promise<MealEstimate> {
    const { data, error } = await supabase.functions.invoke('analyze-meal-photo', {
        body: { imageBase64, mediaType },
    });

    if (error) {
        // supabase-js wraps non-2xx as FunctionsHttpError; surface the server message when present.
        const ctx = (error as any)?.context;
        const serverMsg = ctx?.error || ctx?.message;
        throw new Error(serverMsg || error.message || 'Failed to analyze meal photo.');
    }

    if (!data?.estimate) {
        throw new Error('No estimate returned.');
    }
    return data.estimate as MealEstimate;
}
