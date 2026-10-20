'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageList } from '@/components/chat/MessageList';
import { MessageComposer } from '@/components/chat/MessageComposer';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { InfoDrawer } from '@/components/chat/InfoDrawer';
import { ReportModal } from '@/components/chat/ReportModal';
import { AddMemberModal } from '@/components/chat/AddMemberModal';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeChat } from '@/hooks/useRealtimeChat';
import { usePresence } from '@/hooks/usePresence';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import type { ExtendedConversation, ExtendedMessage, MessageAttachment } from '@/types/database.types';

interface PendingAttachment {
  file: File;
  previewUrl?: string;
  category: 'image' | 'video' | 'file';
}

export default function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = use(params);
  const router = useRouter();
  const { user, profile } = useAuth();
  const { isUserOnline } = usePresence();
  const { playSentSound, playReceivedSound } = useSoundEffects();

  const [conversation, setConversation] = useState<ExtendedConversation | null>(null);
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [isLoadingConv, setIsLoadingConv] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // States
  const [replyingTo, setReplyingTo] = useState<ExtendedMessage | null>(null);
  const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [reportingMessage, setReportingMessage] = useState<ExtendedMessage | null>(null);
  const [isReportingOpen, setIsReportingOpen] = useState(false);

  // 1. Fetch Conversation Details
  const fetchConversationDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}`);
      if (res.ok) {
        const json = await res.json();
        setConversation(json.conversation);
      } else {
        // Conversation not found or forbidden
        router.push('/chat');
      }
    } catch (err) {
      console.error('Failed to load conversation details:', err);
    } finally {
      setIsLoadingConv(false);
    }
  }, [conversationId, router]);

  // 2. Fetch Messages with pagination
  const fetchMessages = useCallback(
    async (cursor?: string | null) => {
      try {
        const url = `/api/messages?conversation_id=${conversationId}${
          cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''
        }&limit=50`;

        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          const fetched: ExtendedMessage[] = json.messages || [];

          if (cursor) {
            setMessages((prev) => [...fetched, ...prev]);
          } else {
            setMessages(fetched);
          }

          setNextCursor(json.next_cursor);
          setHasMore(Boolean(json.next_cursor));
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [conversationId]
  );

  // 3. Mark Conversation as Read
  const markAsRead = useCallback(async () => {
    try {
      await fetch(`/api/conversations/${conversationId}/read`, { method: 'POST' });
    } catch {
      // Ignore
    }
  }, [conversationId]);

  useEffect(() => {
    fetchConversationDetails();
    fetchMessages();
    markAsRead();
  }, [fetchConversationDetails, fetchMessages, markAsRead]);

  // 4. Supabase Realtime Listener Handlers
  const handleNewRealtimeMessage = useCallback(
    (msg: ExtendedMessage) => {
      setMessages((prev) => {
        // Prevent duplicate messages by matching DB ID
        const existingIdx = prev.findIndex((m) => m.id === msg.id);
        if (existingIdx !== -1) {
          const updated = [...prev];
          updated[existingIdx] = { ...updated[existingIdx], ...msg };
          return updated;
        }

        // Check if there is an optimistic temp message from the current user matching this
        if (msg.sender_id === user?.id) {
          const tempIdx = prev.findIndex(
            (m) =>
              m.id.startsWith('temp-') &&
              m.sender_id === user.id &&
              m.content === msg.content &&
              m.message_type === msg.message_type
          );
          if (tempIdx !== -1) {
            const updated = [...prev];
            updated[tempIdx] = msg;
            return updated;
          }
        }

        return [...prev, msg];
      });

      if (msg.sender_id === user?.id) {
        playSentSound();
      } else {
        playReceivedSound();
        markAsRead();
      }
    },
    [user?.id, playSentSound, playReceivedSound, markAsRead]
  );

  const handleRealtimeMessageDeleted = useCallback((msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, deleted_at: new Date().toISOString(), content: 'This message was deleted' } : m))
    );
  }, []);

  const handleRealtimeMessagesRead = useCallback((msgId: string, readUserId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId) {
          const reads = m.reads || [];
          if (!reads.some((r) => r.user_id === readUserId)) {
            return {
              ...m,
              reads: [...reads, { id: 'temp', message_id: msgId, user_id: readUserId, read_at: new Date().toISOString() }],
            };
          }
        }
        return m;
      })
    );
  }, []);

  const { typingUsers, sendTyping } = useRealtimeChat({
    conversationId,
    onNewMessage: handleNewRealtimeMessage,
    onMessageDeleted: handleRealtimeMessageDeleted,
    onMessagesRead: handleRealtimeMessagesRead,
  });

  // 5. Send Message Action with Optimistic Insertion
  const handleSendMessage = async (content: string, attachments?: PendingAttachment[]) => {
    if (!user || !profile) return;

    const trimmedContent = content.trim();
    if (!trimmedContent && (!attachments || attachments.length === 0)) return;

    // A. Upload attachments if present
    const uploadedAttachments: {
      storage_path: string;
      file_name: string;
      mime_type: string;
      file_size: number;
    }[] = [];

    if (attachments && attachments.length > 0) {
      for (const att of attachments) {
        const formData = new FormData();
        formData.append('file', att.file);
        formData.append('conversationId', conversationId);
        formData.append('type', 'chat-media');

        const uploadRes = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadJson = await uploadRes.json();
          uploadedAttachments.push({
            storage_path: uploadJson.storage_path,
            file_name: uploadJson.file_name,
            mime_type: uploadJson.mime_type,
            file_size: uploadJson.file_size,
          });
        }
      }
    }

    // Determine message type
    let messageType: 'text' | 'image' | 'video' | 'file' = 'text';
    if (uploadedAttachments.length > 0) {
      const firstMime = uploadedAttachments[0].mime_type;
      if (firstMime.startsWith('image/')) messageType = 'image';
      else if (firstMime.startsWith('video/')) messageType = 'video';
      else messageType = 'file';
    }

    // B. Optimistic message creation
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const currentReply = replyingTo;
    const optimisticMsg: ExtendedMessage = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user.id,
      content: trimmedContent,
      message_type: messageType,
      reply_to_message_id: currentReply?.id || null,
      reply_to: currentReply
        ? {
            id: currentReply.id,
            content: currentReply.content,
            sender: currentReply.sender
              ? {
                  id: currentReply.sender.id,
                  full_name: currentReply.sender.full_name,
                  username: currentReply.sender.username,
                }
              : undefined,
            message_type: currentReply.message_type,
          }
        : null,
      sender: profile,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      deleted_at: null,
      attachments: uploadedAttachments.map((a, i) => ({
        id: `att-temp-${i}`,
        message_id: tempId,
        conversation_id: conversationId,
        storage_path: a.storage_path,
        file_name: a.file_name,
        mime_type: a.mime_type,
        file_size: a.file_size,
        created_at: new Date().toISOString(),
      })),
      reads: [],
      status: 'sending',
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setReplyingTo(null);

    // C. Send message to API
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          content: trimmedContent,
          message_type: messageType,
          reply_to_message_id: currentReply?.id || null,
          attachments: uploadedAttachments,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.message) {
          handleNewRealtimeMessage(json.message);
        }
      } else {
        // Mark temp message as failed
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m))
        );
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m))
      );
    }
  };

  // 6. Delete Message Action
  const handleDeleteMessage = async (messageId: string) => {
    try {
      const res = await fetch(`/api/messages/${messageId}`, { method: 'DELETE' });
      if (res.ok) {
        handleRealtimeMessageDeleted(messageId);
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  // 7. Remove Member Action
  const handleRemoveMember = async (targetUserId: string) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/members?userId=${targetUserId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchConversationDetails();
      }
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  // 8. Leave Group Action
  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group?')) return;
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/chat');
      }
    } catch (err) {
      console.error('Failed to leave group:', err);
    }
  };

  if (isLoadingConv || !conversation || !user) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-[#070a13]">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const isOtherOnline = isUserOnline(conversation.other_user?.id);

  return (
    <div className="flex-1 h-full flex overflow-hidden bg-[#070a13]">
      {/* Main Chat Stream View */}
      <div className="flex-1 h-full flex flex-col min-w-0 bg-[#070a13] relative">
        {/* Chat Header */}
        <ChatHeader
          conversation={conversation}
          isOnline={isOtherOnline}
          onToggleInfoDrawer={() => setIsInfoDrawerOpen(!isInfoDrawerOpen)}
          isInfoDrawerOpen={isInfoDrawerOpen}
        />

        {/* Message Stream */}
        <MessageList
          messages={messages}
          currentUserId={user.id}
          isGroup={conversation.type === 'group'}
          isLoading={isLoadingMessages}
          hasMore={hasMore}
          onLoadMore={() => fetchMessages(nextCursor)}
          onReply={(msg) => setReplyingTo(msg)}
          onDelete={handleDeleteMessage}
          onReport={(msg) => {
            setReportingMessage(msg);
            setIsReportingOpen(true);
          }}
        />

        {/* Real-time Typing Status */}
        <TypingIndicator typingUsers={typingUsers} />

        {/* Message Input Composer */}
        <MessageComposer
          onSendMessage={handleSendMessage}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          onTyping={sendTyping}
        />
      </div>

      {/* Right Details Drawer */}
      <InfoDrawer
        conversation={conversation}
        currentUserId={user.id}
        isOpen={isInfoDrawerOpen}
        onClose={() => setIsInfoDrawerOpen(false)}
        onAddMember={() => setIsAddMemberOpen(true)}
        onRemoveMember={handleRemoveMember}
        onLeaveGroup={handleLeaveGroup}
        onReport={() => {
          setReportingMessage(null);
          setIsReportingOpen(true);
        }}
        isOnlineMap={isUserOnline}
      />

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        conversationId={conversationId}
        existingMembers={conversation.members}
        onMemberAdded={fetchConversationDetails}
      />

      {/* Abuse & Content Report Modal */}
      <ReportModal
        isOpen={isReportingOpen}
        onClose={() => {
          setIsReportingOpen(false);
          setReportingMessage(null);
        }}
        targetMessage={reportingMessage}
        conversationId={conversationId}
      />
    </div>
  );
}
