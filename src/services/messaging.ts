import { supabase } from '@/lib/supabase';

export type ThreadStatus = 'open' | 'closed';
export type ThreadCategory = 'training' | 'program' | 'app_issue' | 'content' | 'other';

export type MessageThread = {
    id: string;
    created_at: string;
    created_by: string;
    status: ThreadStatus;
    category: ThreadCategory;
    subject: string | null;
    last_message_at: string;
    diagnostics: any | null;
};

export type ThreadMessage = {
    id: string;
    created_at: string;
    thread_id: string;
    sender_id: string;
    body: string;
};

function throwOnError(error: any, fallback: string) {
    if (!error) return;
    const msg = typeof error?.message === 'string' ? error.message : fallback;
    throw new Error(msg);
}

export async function createThread(params: {
    category: ThreadCategory;
    subject?: string;
    body: string;
    diagnostics?: any;
}): Promise<{ threadId: string }> {
    const body = params.body.trim();
    if (!body) throw new Error('Message body is required.');

    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('Not signed in.');

    // 1) Create thread
    const { data: thread, error: threadError } = await supabase
        .from('message_threads')
        .insert({
            created_by: userId,
            category: params.category,
            subject: params.subject?.trim() || null,
            status: 'open',
            diagnostics: params.category === 'app_issue' ? (params.diagnostics ?? null) : null,
            last_message_at: new Date().toISOString(),
        })
        .select('id')
        .single();
    throwOnError(threadError, 'Failed to create thread.');
    if (!thread?.id) throw new Error('Failed to create thread (missing id).');

    // 2) Insert first message
    const { error: msgError } = await supabase
        .from('messages')
        .insert({
            thread_id: thread.id,
            sender_id: userId,
            body,
        });
    throwOnError(msgError, 'Failed to send message.');

    return { threadId: thread.id };
}

export async function listMyThreads(): Promise<MessageThread[]> {
    const { data, error } = await supabase
        .from('message_threads')
        .select('id,created_at,created_by,status,category,subject,last_message_at,diagnostics')
        .order('last_message_at', { ascending: false });
    throwOnError(error, 'Failed to load threads.');
    return (data || []) as any;
}

export async function listAdminThreads(filter?: { status?: ThreadStatus }): Promise<MessageThread[]> {
    let q = supabase
        .from('message_threads')
        .select('id,created_at,created_by,status,category,subject,last_message_at,diagnostics')
        .order('last_message_at', { ascending: false });

    if (filter?.status) q = q.eq('status', filter.status);

    const { data, error } = await q;
    throwOnError(error, 'Failed to load admin threads.');
    return (data || []) as any;
}

export async function listMessages(threadId: string): Promise<ThreadMessage[]> {
    const { data, error } = await supabase
        .from('messages')
        .select('id,created_at,thread_id,sender_id,body')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });
    throwOnError(error, 'Failed to load messages.');
    return (data || []) as any;
}

export async function sendMessage(threadId: string, body: string): Promise<void> {
    const text = body.trim();
    if (!text) throw new Error('Message body is required.');

    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('Not signed in.');

    const now = new Date().toISOString();

    const { error: msgError } = await supabase
        .from('messages')
        .insert({
            thread_id: threadId,
            sender_id: userId,
            body: text,
        });
    throwOnError(msgError, 'Failed to send message.');

    const { error: threadError } = await supabase
        .from('message_threads')
        .update({ last_message_at: now })
        .eq('id', threadId);
    throwOnError(threadError, 'Failed to update thread.');
}

export async function updateThreadStatus(threadId: string, status: ThreadStatus): Promise<void> {
    const { error } = await supabase
        .from('message_threads')
        .update({ status })
        .eq('id', threadId);
    throwOnError(error, 'Failed to update thread status.');
}
