import React from 'react';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vespera | Real-time Ephemeral Messaging',
  description: 'Secure, multi-user real-time messaging with 24-hour automatic retention cycles.',
};

export default function AppChatLayout({ children }: { children: React.ReactNode }) {
  return <ChatLayout>{children}</ChatLayout>;
}
