export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'user' | 'admin';
export type ConversationType = 'direct' | 'group';
export type MemberRole = 'member' | 'admin' | 'owner';
export type MessageType = 'text' | 'image' | 'video' | 'file' | 'system';
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'actioned';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          full_name: string;
          avatar_url: string | null;
          bio: string;
          role: UserRole;
          is_active: boolean;
          is_online: boolean;
          last_seen: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          full_name: string;
          avatar_url?: string | null;
          bio?: string;
          role?: UserRole;
          is_active?: boolean;
          is_online?: boolean;
          last_seen?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          full_name?: string;
          avatar_url?: string | null;
          bio?: string;
          role?: UserRole;
          is_active?: boolean;
          is_online?: boolean;
          last_seen?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          type: ConversationType;
          name: string | null;
          avatar_url: string | null;
          description: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          type?: ConversationType;
          name?: string | null;
          avatar_url?: string | null;
          description?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          type?: ConversationType;
          name?: string | null;
          avatar_url?: string | null;
          description?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      conversation_members: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          role: MemberRole;
          joined_at: string;
          last_read_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          role?: MemberRole;
          joined_at?: string;
          last_read_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string;
          role?: MemberRole;
          joined_at?: string;
          last_read_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          message_type: MessageType;
          reply_to_message_id: string | null;
          created_at: string;
          expires_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content?: string;
          message_type?: MessageType;
          reply_to_message_id?: string | null;
          created_at?: string;
          expires_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string;
          message_type?: MessageType;
          reply_to_message_id?: string | null;
          created_at?: string;
          expires_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      message_attachments: {
        Row: {
          id: string;
          message_id: string;
          conversation_id: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          file_size: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          conversation_id: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          file_size: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          conversation_id?: string;
          storage_path?: string;
          file_name?: string;
          mime_type?: string;
          file_size?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      message_reads: {
        Row: {
          id: string;
          message_id: string;
          user_id: string;
          read_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          user_id: string;
          read_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          user_id?: string;
          read_at?: string;
        };
        Relationships: [];
      };
      user_reports: {
        Row: {
          id: string;
          reporter_id: string;
          reported_user_id: string | null;
          conversation_id: string | null;
          reason: string;
          status: ReportStatus;
          created_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          reported_user_id?: string | null;
          conversation_id?: string | null;
          reason: string;
          status?: ReportStatus;
          created_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          reported_user_id?: string | null;
          conversation_id?: string | null;
          reason?: string;
          status?: ReportStatus;
          created_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Relationships: [];
      };
      rate_limits: {
        Row: {
          id: string;
          key: string;
          count: number;
          reset_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          count?: number;
          reset_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          count?: number;
          reset_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_or_create_direct_conversation: {
        Args: { p_target_user_id: string };
        Returns: string;
      };
      delete_expired_messages: {
        Args: { p_batch_size?: number };
        Returns: { deleted_count: number; storage_paths: string[] }[];
      };
      mark_conversation_as_read: {
        Args: { p_conversation_id: string };
        Returns: void;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_conversation_member: {
        Args: { p_conv_id: string };
        Returns: boolean;
      };
      promote_user_to_admin: {
        Args: { p_user_email: string };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      conversation_type: ConversationType;
      member_role: MemberRole;
      message_type_enum: MessageType;
      report_status: ReportStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Domain Model Helpers
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Conversation = Database['public']['Tables']['conversations']['Row'];
export type ConversationMember = Database['public']['Tables']['conversation_members']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type MessageAttachment = Database['public']['Tables']['message_attachments']['Row'];
export type MessageRead = Database['public']['Tables']['message_reads']['Row'];
export type UserReport = Database['public']['Tables']['user_reports']['Row'];

// Extended / Rich UI Types
export interface ExtendedMessage extends Message {
  sender?: Profile;
  attachments?: MessageAttachment[];
  reads?: MessageRead[];
  reply_to?: {
    id: string;
    content: string;
    sender?: {
      id: string;
      full_name: string;
      username: string;
    };
    message_type: MessageType;
  } | null;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export interface ExtendedConversationMember extends ConversationMember {
  profile: Profile;
}

export interface ExtendedConversation extends Conversation {
  members: ExtendedConversationMember[];
  last_message?: ExtendedMessage | null;
  unread_count: number;
  other_user?: Profile; // For direct conversations
}

export interface TypingState {
  [userId: string]: {
    username: string;
    fullName: string;
    timestamp: number;
  };
}
