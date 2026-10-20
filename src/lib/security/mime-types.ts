export interface AllowedFileType {
  mime: string;
  extensions: string[];
  maxSize: number; // in bytes
  category: 'image' | 'video' | 'file';
}

export const ALLOWED_FILE_TYPES: AllowedFileType[] = [
  // Images - max 10MB
  { mime: 'image/jpeg', extensions: ['jpg', 'jpeg'], maxSize: 10 * 1024 * 1024, category: 'image' },
  { mime: 'image/png', extensions: ['png'], maxSize: 10 * 1024 * 1024, category: 'image' },
  { mime: 'image/webp', extensions: ['webp'], maxSize: 10 * 1024 * 1024, category: 'image' },
  { mime: 'image/gif', extensions: ['gif'], maxSize: 10 * 1024 * 1024, category: 'image' },

  // Videos - max 50MB
  { mime: 'video/mp4', extensions: ['mp4'], maxSize: 50 * 1024 * 1024, category: 'video' },
  { mime: 'video/webm', extensions: ['webm'], maxSize: 50 * 1024 * 1024, category: 'video' },
  { mime: 'video/quicktime', extensions: ['mov'], maxSize: 50 * 1024 * 1024, category: 'video' },

  // Documents & Archives - max 25MB
  { mime: 'application/pdf', extensions: ['pdf'], maxSize: 25 * 1024 * 1024, category: 'file' },
  { mime: 'application/zip', extensions: ['zip'], maxSize: 25 * 1024 * 1024, category: 'file' },
  { mime: 'text/plain', extensions: ['txt', 'log', 'csv', 'json', 'md'], maxSize: 10 * 1024 * 1024, category: 'file' },
  { mime: 'application/msword', extensions: ['doc'], maxSize: 25 * 1024 * 1024, category: 'file' },
  {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extensions: ['docx'],
    maxSize: 25 * 1024 * 1024,
    category: 'file',
  },
  { mime: 'application/vnd.ms-excel', extensions: ['xls'], maxSize: 25 * 1024 * 1024, category: 'file' },
  {
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extensions: ['xlsx'],
    maxSize: 25 * 1024 * 1024,
    category: 'file',
  },
];

export function validateFile(file: { name: string; type: string; size: number }): {
  valid: boolean;
  error?: string;
  category?: 'image' | 'video' | 'file';
} {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension) {
    return { valid: false, error: 'File must have a valid extension' };
  }

  // Find matching allowed type by MIME or extension
  const matched = ALLOWED_FILE_TYPES.find(
    (item) => item.mime === file.type || item.extensions.includes(extension)
  );

  if (!matched) {
    return {
      valid: false,
      error: `File type "${file.type || extension}" is not supported for security reasons`,
    };
  }

  // Validate extension matches registered MIME category
  if (!matched.extensions.includes(extension)) {
    return {
      valid: false,
      error: `Mismatch between file extension (.${extension}) and MIME type (${file.type})`,
    };
  }

  if (file.size > matched.maxSize) {
    const maxMb = Math.round(matched.maxSize / (1024 * 1024));
    return {
      valid: false,
      error: `File size exceeds the ${maxMb}MB limit for ${matched.category}s`,
    };
  }

  return { valid: true, category: matched.category };
}
