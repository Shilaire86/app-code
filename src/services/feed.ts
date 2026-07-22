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

export async function createPost(title: string, content: string, authorId: string, audience: 'all' | 'founders' = 'all') {
    const { data, error } = await supabase
        .from('coach_posts')
        .insert({
            title,
            content,
            author_id: authorId,
            is_published: false,
            audience,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updatePost(id: string, updates: { title?: string; content?: string; is_published?: boolean; audience?: 'all' | 'founders' }) {
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
            profile_public (
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
            profile_public (
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
            profile_public (
                full_name
            )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) throw error;
    return data ?? [];
}

export async function logActivity(userId: string, type: 'workout_complete' | 'pr_set' | 'milestone' | 'stage_up', data: any) {
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

// ─── User posts ───────────────────────────────────────────────────────────────

export type UserPostType = 'thread' | 'workout_share' | 'milestone_share';
export type UserPostStatus = 'published' | 'flagged' | 'removed';

export async function fetchUserPosts() {
    const { data, error } = await supabase
        .from('user_posts')
        .select(`
            *,
            profile_public (full_name, role, founder_status, founder_number),
            user_post_likes(count)
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(post => ({
        ...post,
        like_count: post.user_post_likes?.[0]?.count || 0,
    }));
}

export async function fetchAllUserPosts() {
    const { data, error } = await supabase
        .from('user_posts')
        .select(`
            *,
            profile_public (full_name, role)
        `)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
}

export async function createUserPost(
    authorId: string,
    content: string,
    postType: UserPostType,
    title?: string,
    activityData?: Record<string, any>,
) {
    const { data, error } = await supabase
        .from('user_posts')
        .insert({
            author_id: authorId,
            content,
            post_type: postType,
            title: title ?? null,
            activity_data: activityData ?? null,
        })
        .select(`*, profile_public (full_name, role)`)
        .single();

    if (error) throw error;
    return data;
}

export async function updateUserPostStatus(id: string, status: UserPostStatus) {
    const { error } = await supabase
        .from('user_posts')
        .update({ status })
        .eq('id', id);

    if (error) throw error;
}

export async function deleteUserPost(id: string) {
    const { error } = await supabase
        .from('user_posts')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export async function toggleUserPostLike(postId: string, userId: string) {
    const { data: existing } = await supabase
        .from('user_post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();

    if (existing) {
        const { error } = await supabase
            .from('user_post_likes')
            .delete()
            .eq('id', existing.id);
        if (error) throw error;
        return false;
    } else {
        const { error } = await supabase
            .from('user_post_likes')
            .insert({ post_id: postId, user_id: userId });
        if (error) throw error;
        return true;
    }
}

export async function fetchUserPostLikes(userId: string) {
    const { data, error } = await supabase
        .from('user_post_likes')
        .select('post_id')
        .eq('user_id', userId);

    if (error) throw error;
    return (data ?? []).map(l => l.post_id);
}

export async function reportContent(
    reporterId: string,
    contentType: 'user_post' | 'comment',
    contentId: string,
    reason?: string,
) {
    const { error } = await supabase
        .from('reported_content')
        .insert({ reporter_id: reporterId, content_type: contentType, content_id: contentId, reason: reason ?? null });

    if (error) throw error;
}

export async function fetchPendingReports() {
    const { data, error } = await supabase
        .from('reported_content')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
}

export async function updateReportStatus(id: string, status: 'reviewed' | 'dismissed') {
    const { error } = await supabase
        .from('reported_content')
        .update({ status })
        .eq('id', id);

    if (error) throw error;
}

// ─── Affiliate ────────────────────────────────────────────────────────────────

export async function logAffiliateClick(userId: string, offerId: string, offerTitle: string) {
    try {
        await supabase
            .from('user_activities')
            .insert({
                user_id: userId,
                activity_type: 'affiliate_click',
                activity_data: { offer_id: offerId, offer_title: offerTitle },
            });
        console.log(`[Affiliate] Logged click for offer: ${offerTitle}`);
    } catch (e) {
        // Non-blocking — don't let tracking failures interrupt UX
        console.warn('[Affiliate] Failed to log click:', e);
    }
}
