import { supabase } from '@/lib/supabase';

export async function fetchCoachPosts() {
    const { data, error } = await supabase
        .from('coach_posts')
        .select(`
            *,
            post_likes(count)
        `)
        .eq('is_published', true)
        .order('published_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(post => ({
        ...post,
        like_count: post.post_likes?.[0]?.count || 0,
    }));
}

export async function fetchAllPosts() {
    const { data, error } = await supabase
        .from('coach_posts')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
}

export async function createPost(title: string, content: string, authorId: string) {
    const { data, error } = await supabase
        .from('coach_posts')
        .insert({
            title,
            content,
            author_id: authorId,
            is_published: false,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updatePost(id: string, updates: { title?: string; content?: string; is_published?: boolean }) {
    const updateData: any = { ...updates };
    if (updates.is_published === true) {
        updateData.published_at = new Date().toISOString();
    }

    const { data, error } = await supabase
        .from('coach_posts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deletePost(id: string) {
    const { error } = await supabase
        .from('coach_posts')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export async function toggleLike(postId: string, userId: string) {
    // Check if already liked
    const { data: existing } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();

    if (existing) {
        // Unlike
        const { error } = await supabase
            .from('post_likes')
            .delete()
            .eq('id', existing.id);
        if (error) throw error;
        return false; // Now unliked
    } else {
        // Like
        const { error } = await supabase
            .from('post_likes')
            .insert({ post_id: postId, user_id: userId });
        if (error) throw error;
        return true; // Now liked
    }
}

export async function fetchUserLikes(userId: string) {
    const { data, error } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', userId);

    if (error) throw error;
    return (data ?? []).map(l => l.post_id);
}

export async function fetchComments(postId: string) {
    const { data, error } = await supabase
        .from('post_comments')
        .select(`
            *,
            profiles (
                full_name,
                role
            )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data ?? [];
}

export async function addComment(postId: string, userId: string, content: string) {
    const { data, error } = await supabase
        .from('post_comments')
        .insert({ post_id: postId, user_id: userId, content })
        .select(`
            *,
            profiles (
                full_name,
                role
            )
        `)
        .single();

    if (error) throw error;
    return data;
}

export async function deleteComment(commentId: string) {
    const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId);

    if (error) throw error;
}

export async function fetchRecentActivities() {
    const { data, error } = await supabase
        .from('user_activities')
        .select(`
            *,
            profiles (
                full_name,
                avatar_url
            )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) throw error;
    return data ?? [];
}

export async function logActivity(userId: string, type: 'workout_complete' | 'pr_set' | 'milestone', data: any) {
    const { error } = await supabase
        .from('user_activities')
        .insert({
            user_id: userId,
            activity_type: type,
            activity_data: data
        });

    if (error) throw error;
}

export async function fetchAffiliateOffers() {
    const { data, error } = await supabase
        .from('affiliate_offers')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
}
