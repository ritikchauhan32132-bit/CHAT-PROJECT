-- ==============================================================================
-- VESPERA CHAT: FULL PRODUCTION DATABASE SCHEMA, RLS & 24H RETENTION ENGINE
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. ENUMS & CORE TABLES
-- ==============================================================================

-- User Role & Conversation Types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE conversation_type AS ENUM ('direct', 'group');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE member_role AS ENUM ('member', 'admin', 'owner');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE message_type_enum AS ENUM ('text', 'image', 'video', 'file', 'system');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'dismissed', 'actioned');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Profiles Table (Synced with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT DEFAULT '',
    role user_role NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_online BOOLEAN NOT NULL DEFAULT false,
    last_seen TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT username_format CHECK (username ~* '^[a-zA-Z0-9_]{3,30}$')
);

-- Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type conversation_type NOT NULL DEFAULT 'direct',
    name TEXT,
    avatar_url TEXT,
    description TEXT DEFAULT '',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conversation Members Table
CREATE TABLE IF NOT EXISTS public.conversation_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role member_role NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (conversation_id, user_id)
);

-- Messages Table (Strict 24h Expiration Engine)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL DEFAULT '',
    message_type message_type_enum NOT NULL DEFAULT 'text',
    reply_to_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT content_or_media_check CHECK (length(content) > 0 OR message_type != 'text')
);

-- Message Attachments Table
CREATE TABLE IF NOT EXISTS public.message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Message Reads Table (Per-user read tracking)
CREATE TABLE IF NOT EXISTS public.message_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (message_id, user_id)
);

-- User Reports & Abuse Protection Table
CREATE TABLE IF NOT EXISTS public.user_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status report_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Rate Limiting Table (Anti-bot / abuse token bucket)
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    reset_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 3. INDEXES FOR HIGH-PERFORMANCE QUERYING & SEARCH
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles USING gin(to_tsvector('english', full_name));
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON public.conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_conv ON public.conversation_members(conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON public.messages(expires_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_reply ON public.messages(reply_to_message_id);

CREATE INDEX IF NOT EXISTS idx_attachments_message ON public.message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_attachments_conversation ON public.message_attachments(conversation_id);

CREATE INDEX IF NOT EXISTS idx_message_reads_message ON public.message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user ON public.message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON public.rate_limits(key, reset_at);

-- ==============================================================================
-- 4. TRIGGERS & AUTOMATION
-- ==============================================================================

-- A. Auto-create Profile on Supabase Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_username TEXT;
    v_full_name TEXT;
    v_avatar TEXT;
    v_base_username TEXT;
    v_counter INT := 1;
BEGIN
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
    v_avatar := NEW.raw_user_meta_data->>'avatar_url';
    
    -- Extract or generate sanitized username
    v_base_username := regexp_replace(
        lower(COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))),
        '[^a-z0-9_]',
        '',
        'g'
    );
    IF length(v_base_username) < 3 THEN
        v_base_username := 'user_' || substr(md5(random()::text), 1, 6);
    END IF;

    v_username := v_base_username;
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) LOOP
        v_username := v_base_username || v_counter;
        v_counter := v_counter + 1;
    END LOOP;

    INSERT INTO public.profiles (id, username, full_name, avatar_url, role, is_active)
    VALUES (
        NEW.id,
        v_username,
        v_full_name,
        v_avatar,
        'user',
        true
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- B. Automatically update conversations.updated_at on new message
CREATE OR REPLACE FUNCTION public.handle_new_message_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET updated_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_message_created_update_conversation ON public.messages;
CREATE TRIGGER on_message_created_update_conversation
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_message_timestamp();

-- ==============================================================================
-- 5. STORED PROCEDURES (BUSINESS LOGIC)
-- ==============================================================================

-- A. Atomic Direct Conversation Creator/Finder
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(p_target_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_current_user_id UUID := auth.uid();
    v_conversation_id UUID;
BEGIN
    IF v_current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF v_current_user_id = p_target_user_id THEN
        RAISE EXCEPTION 'Cannot start a direct conversation with yourself';
    END IF;

    -- Verify target user exists and is active
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_target_user_id AND is_active = true) THEN
        RAISE EXCEPTION 'User not found or account is deactivated';
    END IF;

    -- Check if a direct conversation already exists between both users
    SELECT c.id INTO v_conversation_id
    FROM public.conversations c
    JOIN public.conversation_members cm1 ON c.id = cm1.conversation_id AND cm1.user_id = v_current_user_id
    JOIN public.conversation_members cm2 ON c.id = cm2.conversation_id AND cm2.user_id = p_target_user_id
    WHERE c.type = 'direct'
    LIMIT 1;

    IF v_conversation_id IS NOT NULL THEN
        RETURN v_conversation_id;
    END IF;

    -- Create new direct conversation
    INSERT INTO public.conversations (type, created_by)
    VALUES ('direct', v_current_user_id)
    RETURNING id INTO v_conversation_id;

    -- Add both participants
    INSERT INTO public.conversation_members (conversation_id, user_id, role)
    VALUES
        (v_conversation_id, v_current_user_id, 'member'),
        (v_conversation_id, p_target_user_id, 'member');

    RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- B. 24-Hour Expiration Deletion Stored Procedure
-- Returns the storage_paths of deleted attachments so server/cron can purge Supabase Storage
CREATE OR REPLACE FUNCTION public.delete_expired_messages(p_batch_size INT DEFAULT 500)
RETURNS TABLE (deleted_count INT, storage_paths TEXT[]) AS $$
DECLARE
    v_deleted_count INT := 0;
    v_paths TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- 1. Collect storage paths of attachments attached to expired messages
    SELECT COALESCE(array_agg(ma.storage_path), ARRAY[]::TEXT[])
    INTO v_paths
    FROM public.message_attachments ma
    JOIN public.messages m ON ma.message_id = m.id
    WHERE m.expires_at <= now()
    LIMIT p_batch_size;

    -- 2. Delete expired messages (Cascades to message_attachments and message_reads)
    WITH deleted AS (
        DELETE FROM public.messages
        WHERE id IN (
            SELECT id FROM public.messages
            WHERE expires_at <= now()
            ORDER BY expires_at ASC
            LIMIT p_batch_size
        )
        RETURNING id
    )
    SELECT count(*) INTO v_deleted_count FROM deleted;

    RETURN QUERY SELECT v_deleted_count, v_paths;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- C. Mark conversation messages as read
CREATE OR REPLACE FUNCTION public.mark_conversation_as_read(p_conversation_id UUID)
RETURNS VOID AS $$
DECLARE
    v_current_user_id UUID := auth.uid();
BEGIN
    IF v_current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Ensure caller is a member
    IF NOT EXISTS (
        SELECT 1 FROM public.conversation_members
        WHERE conversation_id = p_conversation_id AND user_id = v_current_user_id
    ) THEN
        RAISE EXCEPTION 'Not a member of this conversation';
    END IF;

    -- Update member last_read_at
    UPDATE public.conversation_members
    SET last_read_at = now()
    WHERE conversation_id = p_conversation_id AND user_id = v_current_user_id;

    -- Insert reads for all active unexpired messages sent by others
    INSERT INTO public.message_reads (message_id, user_id, read_at)
    SELECT m.id, v_current_user_id, now()
    FROM public.messages m
    WHERE m.conversation_id = p_conversation_id
      AND m.sender_id != v_current_user_id
      AND m.expires_at > now()
      AND NOT EXISTS (
          SELECT 1 FROM public.message_reads mr
          WHERE mr.message_id = m.id AND mr.user_id = v_current_user_id
      )
    ON CONFLICT (message_id, user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Helper function: is current user an admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: is user a member of conversation?
CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conv_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.conversation_members
        WHERE conversation_id = p_conv_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --- PROFILES POLICIES ---
-- Any authenticated active user can view profiles (for user search, conversation participants)
CREATE POLICY "Profiles are viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (is_active = true OR id = auth.uid() OR public.is_admin());

-- Users can update only their own profile
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid()
        -- Prevent privilege escalation: normal user cannot change role or is_active
        AND (role = (SELECT role FROM public.profiles WHERE id = auth.uid()) OR public.is_admin())
    );

-- --- CONVERSATIONS POLICIES ---
-- Members or admins can view conversations
CREATE POLICY "Conversations viewable by members or admins"
    ON public.conversations FOR SELECT
    TO authenticated
    USING (public.is_conversation_member(id) OR public.is_admin());

-- Authenticated active users can create conversations
CREATE POLICY "Authenticated users can create conversations"
    ON public.conversations FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active = true)
    );

-- Group admins or conversation creator can update conversation details
CREATE POLICY "Conversation admins can update conversation"
    ON public.conversations FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_members
            WHERE conversation_id = id AND user_id = auth.uid() AND role IN ('admin', 'owner')
        )
        OR public.is_admin()
    );

-- --- CONVERSATION MEMBERS POLICIES ---
-- Members can view co-members of their conversations
CREATE POLICY "Members viewable by conversation participants"
    ON public.conversation_members FOR SELECT
    TO authenticated
    USING (public.is_conversation_member(conversation_id) OR public.is_admin());

-- Members can be added by group admins/owners or direct chat procedure
CREATE POLICY "Members can be added by group admins or system"
    ON public.conversation_members FOR INSERT
    TO authenticated
    WITH CHECK (
        -- For direct chat creation
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.conversation_members
            WHERE conversation_id = conversation_members.conversation_id
              AND user_id = auth.uid()
              AND role IN ('admin', 'owner')
        )
        OR public.is_admin()
    );

-- Members can leave or be removed by group admins
CREATE POLICY "Members can leave or be removed by admins"
    ON public.conversation_members FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.conversation_members
            WHERE conversation_id = conversation_members.conversation_id
              AND user_id = auth.uid()
              AND role IN ('admin', 'owner')
        )
        OR public.is_admin()
    );

-- --- MESSAGES POLICIES ---
-- View messages only if: member of conversation, unexpired, not deleted (or admin)
CREATE POLICY "Messages viewable by conversation members"
    ON public.messages FOR SELECT
    TO authenticated
    USING (
        (
            public.is_conversation_member(conversation_id)
            AND expires_at > now()
            AND (deleted_at IS NULL OR sender_id = auth.uid())
        )
        OR (public.is_admin() AND expires_at > now())
    );

-- Insert messages only if member of conversation, active, and sender matches auth.uid()
CREATE POLICY "Members can insert messages"
    ON public.messages FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
        AND public.is_conversation_member(conversation_id)
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active = true)
        AND expires_at > now()
    );

-- Update messages (e.g. soft-delete own message)
CREATE POLICY "Senders can update own messages"
    ON public.messages FOR UPDATE
    TO authenticated
    USING (sender_id = auth.uid() OR public.is_admin())
    WITH CHECK (sender_id = auth.uid() OR public.is_admin());

-- Delete messages (senders can delete own messages)
CREATE POLICY "Senders can delete own messages"
    ON public.messages FOR DELETE
    TO authenticated
    USING (sender_id = auth.uid() OR public.is_admin());

-- --- MESSAGE ATTACHMENTS POLICIES ---
CREATE POLICY "Attachments viewable by conversation members"
    ON public.message_attachments FOR SELECT
    TO authenticated
    USING (public.is_conversation_member(conversation_id) OR public.is_admin());

CREATE POLICY "Senders can insert attachments"
    ON public.message_attachments FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_conversation_member(conversation_id)
        AND EXISTS (
            SELECT 1 FROM public.messages
            WHERE id = message_attachments.message_id AND sender_id = auth.uid()
        )
    );

-- --- MESSAGE READS POLICIES ---
CREATE POLICY "Reads viewable by conversation members"
    ON public.message_reads FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.messages m
            WHERE m.id = message_reads.message_id
              AND public.is_conversation_member(m.conversation_id)
        )
        OR public.is_admin()
    );

CREATE POLICY "Users can mark messages as read"
    ON public.message_reads FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- --- USER REPORTS POLICIES ---
CREATE POLICY "Users can create reports"
    ON public.user_reports FOR INSERT
    TO authenticated
    WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Admins can view and manage reports"
    ON public.user_reports FOR ALL
    TO authenticated
    USING (public.is_admin());

-- ==============================================================================
-- 7. REALTIME PUBLICATION SETUP
-- ==============================================================================
-- Add tables to the supabase_realtime publication
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reads;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION
    WHEN others THEN null;
END $$;
