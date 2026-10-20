'use client';

import React from 'react';

interface TypingIndicatorProps {
  typingUsers: { username: string; fullName: string }[];
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (!typingUsers || typingUsers.length === 0) return null;

  let text = '';
  if (typingUsers.length === 1) {
    text = `${typingUsers[0].fullName || typingUsers[0].username} is typing...`;
  } else if (typingUsers.length === 2) {
    text = `${typingUsers[0].fullName || typingUsers[0].username} and ${typingUsers[1].fullName || typingUsers[1].username} are typing...`;
  } else {
    text = 'Several people are typing...';
  }

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-indigo-300/80 animate-in fade-in duration-200">
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
      </div>
      <span className="font-medium">{text}</span>
    </div>
  );
}
