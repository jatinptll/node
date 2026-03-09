/**
 * Feedback database operations
 */
import { supabase } from '@/integrations/supabase/client';

const db: any = supabase;

export interface FeedbackRecord {
    id?: string;
    created_at?: string;
    user_id: string;
    type: 'bug' | 'feature' | 'feedback';
    title: string;
    description: string;
    severity?: 'low' | 'medium' | 'high' | null;
    areas?: string[];
    impact_rating?: string | null;
    attachment_url?: string | null;
    system_info?: Record<string, any> | null;
    submitter_name?: string | null;
    submitter_email?: string | null;
    is_anonymous?: boolean;
    status?: string;
    admin_notes?: string | null;
    priority?: string | null;
    reviewed_at?: string | null;
    resolved_at?: string | null;
}

export async function submitFeedback(record: FeedbackRecord): Promise<string> {
    const { data, error } = await db
        .from('feedback')
        .insert(record)
        .select('id')
        .single();

    if (error) throw error;
    return data.id;
}

export async function fetchUserFeedback(userId: string): Promise<FeedbackRecord[]> {
    const { data, error } = await db
        .from('feedback')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) throw error;
    return data || [];
}

export async function uploadFeedbackAttachment(
    userId: string,
    feedbackId: string,
    file: File
): Promise<string> {
    const ext = file.name.split('.').pop();
    const path = `${userId}/${feedbackId}/${Date.now()}.${ext}`;

    const { error } = await db.storage
        .from('feedback-attachments')
        .upload(path, file, {
            contentType: file.type,
            upsert: false,
        });

    if (error) throw error;

    // Get a signed URL that expires in 7 days
    const { data: urlData } = await db.storage
        .from('feedback-attachments')
        .createSignedUrl(path, 60 * 60 * 24 * 7);

    return urlData?.signedUrl || path;
}
