-- ==============================================================================
-- VESPERA CHAT: STORAGE BUCKETS, POLICIES & SECURE ADMIN PROVISIONING
-- ==============================================================================

-- 1. Create Storage Buckets if they don't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    (
        'chat-media',
        'chat-media',
        false,
        52428800, -- 50 MB
        ARRAY[
            'image/jpeg', 'image/png', 'image/webp', 'image/gif',
            'video/mp4', 'video/webm', 'video/quicktime',
            'application/pdf', 'application/zip', 'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ]
    ),
    (
        'avatars',
        'avatars',
        true,
        5242880, -- 5 MB
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    )
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage Row Level Security Policies

-- A. Avatar Storage Policies
CREATE POLICY "Public avatar access"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can update/delete own avatar"
    ON storage.objects FOR ALL
    TO authenticated
    USING (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- B. Chat Media Storage Policies
-- Storage paths follow format: "conversations/{conversation_id}/{message_id}/{filename}"
CREATE POLICY "Conversation members can read chat media"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'chat-media'
        AND (
            public.is_admin()
            OR public.is_conversation_member(((storage.foldername(name))[2])::uuid)
        )
    );

CREATE POLICY "Conversation members can upload chat media"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'chat-media'
        AND (storage.foldername(name))[1] = 'conversations'
        AND public.is_conversation_member(((storage.foldername(name))[2])::uuid)
    );

CREATE POLICY "Admin or system can delete chat media"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'chat-media'
        AND public.is_admin()
    );

-- ==============================================================================
-- 3. SECURE ADMIN BOOTSTRAP FUNCTION
-- ==============================================================================
-- This function can only be invoked by postgres / service_role or with a secure secret key
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(p_user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = p_user_email;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found in auth.users', p_user_email;
    END IF;

    UPDATE public.profiles
    SET role = 'admin', updated_at = now()
    WHERE id = v_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
