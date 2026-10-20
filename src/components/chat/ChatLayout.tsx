'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { ConversationList } from './ConversationList';
import { NewChatModal } from './NewChatModal';
import { CreateGroupModal } from './CreateGroupModal';
import { ProfileModal } from '@/components/profile/ProfileModal';
import { usePresence } from '@/hooks/usePresence';
import { useSupabase } from '@/hooks/useSupabase';
import { useAuth } from '@/hooks/useAuth';
import type { ExtendedConversation } from '@/types/database.types';

interface ChatLayoutProps {
  children?: React.ReactNode;
}

export function ChatLayout({ children }: ChatLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useSupabase();
  const { user } = useAuth();
  const { isUserOnline } = usePresence();

  const [conversations, setConversations] = useState<ExtendedConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  // Modals
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Extract active conversation ID from URL path (e.g. /chat/abc-123)
  const activeConversationId = pathname.startsWith('/chat/')
    ? pathname.replace('/chat/', '').split('/')[0]
    : null;

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const json = await res.json();
        setConversations(json.conversations || []);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const debouncedFetchConversations = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchConversations();
    }, 400);
  }, [fetchConversations]);

  useEffect(() => {
    let isMounted = true;
    async function initialLoad() {
      try {
        const res = await fetch('/api/conversations');
        if (res.ok) {
          const json = await res.json();
          if (isMounted) {
            setConversations(json.conversations || []);
          }
        }
      } catch (err) {
        console.error('Failed to fetch conversations:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initialLoad();
    return () => {
      isMounted = false;
    };
  }, []);

  // Subscribe to real-time conversation updates with coalesced debouncing
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('conversations-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => {
          debouncedFetchConversations();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_members' },
        () => {
          debouncedFetchConversations();
        }
      )
      .subscribe();

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [supabase, user, debouncedFetchConversations]);

  const handleConversationCreated = (conversationId: string) => {
    fetchConversations();
    router.push(`/chat/${conversationId}`);
  };

  // Determine mobile view visibility: if inside /chat/[id], hide conversation list on mobile
  const isConversationOpen = Boolean(activeConversationId);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#070a13] text-slate-100">
      {/* 1. Global Leftmost Nav Sidebar */}
      <Sidebar
        onOpenProfile={() => setIsProfileOpen(true)}
        isSoundEnabled={isSoundEnabled}
        onToggleSound={() => setIsSoundEnabled(!isSoundEnabled)}
      />

      {/* 2. Conversations List Pane (Visible on desktop or when no conversation is selected on mobile) */}
      <div
        className={`h-full ${
          isConversationOpen ? 'hidden md:flex' : 'flex w-full md:w-auto'
        }`}
      >
        <ConversationList
          conversations={conversations}
          activeConversationId={activeConversationId}
          isLoading={isLoading}
          onOpenNewChat={() => setIsNewChatOpen(true)}
          onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
          isOnlineMap={isUserOnline}
        />
      </div>

      {/* 3. Main Active Chat Conversation or Empty View */}
      <div
        className={`flex-1 h-full overflow-hidden ${
          !isConversationOpen ? 'hidden md:flex' : 'flex'
        }`}
      >
        {children}
      </div>

      {/* Global Modals */}
      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        onConversationCreated={handleConversationCreated}
      />

      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onGroupCreated={handleConversationCreated}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
}
