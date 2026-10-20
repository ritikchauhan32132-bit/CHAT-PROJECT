import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/authorization';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/admin/cleanup
 * Admin-authenticated endpoint to manually trigger the 24h expiration purge.
 * Uses requireAdmin() for auth instead of CRON_SECRET (which is for Vercel Cron).
 */
export async function POST() {
  try {
    await requireAdmin();

    const adminSupabase = createAdminClient();
    const nowIso = new Date().toISOString();

    // 1. Fetch expired messages and their attachments
    const { data: expiredMessages, error: queryError } = await adminSupabase
      .from('messages')
      .select('id, attachments:message_attachments(storage_path)')
      .lte('expires_at', nowIso)
      .limit(500);

    if (queryError) {
      console.error('Error fetching expired messages:', queryError);
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    if (!expiredMessages || expiredMessages.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No expired messages found',
        deleted_messages_count: 0,
        deleted_media_count: 0,
        timestamp: new Date().toISOString(),
      });
    }

    const expiredIds = expiredMessages.map((m) => m.id);
    const storagePaths: string[] = [];

    expiredMessages.forEach((m) => {
      if (Array.isArray(m.attachments)) {
        m.attachments.forEach((att: { storage_path: string }) => {
          if (att.storage_path) {
            storagePaths.push(att.storage_path);
          }
        });
      }
    });

    // 2. Delete messages from database (cascades to attachments and reads)
    const { error: deleteError } = await adminSupabase
      .from('messages')
      .delete()
      .in('id', expiredIds);

    if (deleteError) {
      console.error('Error deleting expired messages:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // 3. Delete associated media from Supabase Storage
    let deletedFilesCount = 0;
    if (storagePaths.length > 0) {
      const { data: storageResult, error: storageError } = await adminSupabase.storage
        .from('chat-media')
        .remove(storagePaths);

      if (storageError) {
        console.error('Storage purge failed after DB deletion:', storageError);
        return NextResponse.json(
          {
            success: false,
            error: 'Database messages were deleted, but storage media deletion failed',
            details: storageError.message,
            deleted_messages_count: expiredIds.length,
            deleted_media_count: 0,
            failed_storage_paths: storagePaths,
            timestamp: new Date().toISOString(),
          },
          { status: 502 }
        );
      } else if (storageResult) {
        deletedFilesCount = storageResult.length;
      }
    }

    return NextResponse.json({
      success: true,
      deleted_messages_count: expiredIds.length,
      deleted_media_count: deletedFilesCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cleanup failed';
    const status = message.includes('FORBIDDEN') ? 403 : message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
