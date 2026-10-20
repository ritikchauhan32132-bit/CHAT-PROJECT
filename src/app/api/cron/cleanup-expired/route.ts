import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  return handleCleanup(request);
}

export async function POST(request: Request) {
  return handleCleanup(request);
}

async function handleCleanup(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const querySecret = searchParams.get('secret');

    const expectedSecret = process.env.CRON_SECRET;
    const providedSecret = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : querySecret;

    // Strict security check: require secret in production or if configured
    if (process.env.NODE_ENV === 'production' && !expectedSecret) {
      console.error('CRON_SECRET is not configured in production environment');
      return NextResponse.json({ error: 'Server configuration error: CRON_SECRET required' }, { status: 500 });
    }

    if (expectedSecret && providedSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized: Invalid cron secret' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // 1. Fetch expired messages and their attachments
    const nowIso = new Date().toISOString();
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

    // 2. Delete messages from database (Cascades to message_attachments and message_reads)
    const { error: deleteError } = await adminSupabase
      .from('messages')
      .delete()
      .in('id', expiredIds);

    if (deleteError) {
      console.error('Error deleting expired messages from database:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // 3. Delete associated files from Supabase Storage
    let deletedFilesCount = 0;
    if (storagePaths.length > 0) {
      const { data: storageResult, error: storageError } = await adminSupabase.storage
        .from('chat-media')
        .remove(storagePaths);

      if (storageError) {
        console.error('Error purging files from storage:', storageError);
        // Do not report successful cleanup if media deletion failed!
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
    console.error('Cleanup engine error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal cleanup error' },
      { status: 500 }
    );
  }
}
