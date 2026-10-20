import { NextResponse } from 'next/server';
import { requireAuth, verifyConversationMembership } from '@/lib/security/authorization';
import { createClient } from '@/lib/supabase/server';
import { validateFile } from '@/lib/security/mime-types';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();

    // Rate limit: 10 uploads per minute per user
    const rateCheck = await checkRateLimit(`upload:${auth.user.id}`, { limit: 10, windowMs: 60000 });
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'You are uploading files too quickly. Please slow down.' },
        { status: 429 }
      );
    }

    const formData = await request.formData();

    const file = formData.get('file') as File | null;
    const conversationId = formData.get('conversationId') as string | null;
    const uploadType = (formData.get('type') as string) || 'chat-media'; // 'chat-media' | 'avatar'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 1. Validate file format and size
    const validation = validateFile({
      name: file.name,
      type: file.type,
      size: file.size,
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const supabase = await createClient();
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitize filename
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);

    if (uploadType === 'avatar') {
      const bucketName = 'avatars';
      const storagePath = `${auth.user.id}/${timestamp}_${randomSuffix}_${cleanName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }

      const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(storagePath);

      return NextResponse.json({
        url: publicData.publicUrl,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size,
        category: validation.category,
      });
    }

    // Otherwise, chat media upload
    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required for chat media' }, { status: 400 });
    }

    const isMember = await verifyConversationMembership(conversationId, auth.user.id);
    if (!isMember && auth.profile.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized for this conversation' }, { status: 403 });
    }

    const bucketName = 'chat-media';
    const storagePath = `conversations/${conversationId}/${timestamp}_${randomSuffix}_${cleanName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Generate signed URL with 24 hours validity (matching message expiration)
    const { data: signedData, error: signError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(storagePath, 24 * 60 * 60);

    if (signError || !signedData?.signedUrl) {
      console.error('Failed to generate signed URL after upload:', signError);
      return NextResponse.json(
        { error: 'File uploaded but failed to generate access URL. Contact support.' },
        { status: 500 }
      );
    }

    const mediaUrl = signedData.signedUrl;

    return NextResponse.json({
      url: mediaUrl,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      file_size: file.size,
      category: validation.category,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
