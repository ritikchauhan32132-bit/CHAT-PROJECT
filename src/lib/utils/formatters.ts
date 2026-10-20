import { format, isToday, isYesterday, formatDistanceToNowStrict, differenceInSeconds } from 'date-fns';

export function formatMessageTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return '';
  return format(date, 'h:mm a');
}

export function formatConversationTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return '';

  if (isToday(date)) {
    return format(date, 'h:mm a');
  }
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  return format(date, 'MMM d');
}

export function formatRelativeTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return 'Offline';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return 'Offline';

  const diffSec = differenceInSeconds(new Date(), date);
  if (diffSec < 60) {
    return 'Just now';
  }
  return `${formatDistanceToNowStrict(date)} ago`;
}

export function formatExpirationCountdown(expiresAt: string | Date): {
  text: string;
  isExpiringSoon: boolean;
  percentageRemaining: number;
} {
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  const now = new Date();
  const diffSec = differenceInSeconds(expiry, now);

  if (diffSec <= 0) {
    return { text: 'Expiring...', isExpiringSoon: true, percentageRemaining: 0 };
  }

  const totalSec24h = 24 * 3600;
  const percentage = Math.min(100, Math.max(0, (diffSec / totalSec24h) * 100));
  const isExpiringSoon = diffSec < 3600; // Less than 1 hour

  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);

  if (hours > 0) {
    return {
      text: `${hours}h ${minutes}m left`,
      isExpiringSoon,
      percentageRemaining: percentage,
    };
  }

  const seconds = diffSec % 60;
  return {
    text: `${minutes}m ${seconds}s left`,
    isExpiringSoon: true,
    percentageRemaining: percentage,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getInitials(name?: string | null): string {
  if (!name || name.trim().length === 0) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_GRADIENTS = [
  'from-indigo-600 to-purple-600',
  'from-purple-600 to-pink-600',
  'from-cyan-600 to-blue-600',
  'from-emerald-600 to-teal-600',
  'from-rose-600 to-orange-600',
  'from-amber-600 to-red-600',
  'from-violet-600 to-indigo-600',
];

export function getAvatarGradient(name?: string | null): string {
  if (!name) return AVATAR_GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
}
