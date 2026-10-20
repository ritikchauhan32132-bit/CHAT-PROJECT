# 🌌 Vespera Chat — Production Setup & Architecture Guide

**Vespera** is a full-stack, multi-user real-time messaging application engineered with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase (PostgreSQL, Realtime, Storage, Auth, RLS)** featuring a strict **24-Hour Automated Message & Media Expiration Engine**.

---

## 🏗️ Architecture Summary

```
                +---------------------------------------+
                |        Next.js App Router (SSR)       |
                |  - Protected Routes via Middleware    |
                |  - Server Actions & REST API Routes   |
                |  - Role-Based Server Authorization    |
                +-------------------+-------------------+
                                    |
            +-----------------------+-----------------------+
            |                                               |
+-----------v-----------+                       +-----------v-----------+
|     Supabase Auth     |                       |  Supabase Storage     |
| - Email Verification  |                       | - avatars (public)    |
| - Password Reset Flow |                       | - chat-media (private)|
| - Secure HttpOnly JWT |                       | - 24h Signed URLs     |
+-----------+-----------+                       +-----------+-----------+
            |                                               |
            +-----------------------+-----------------------+
                                    |
                +-------------------v-------------------+
                |        PostgreSQL Database            |
                |  - Row-Level Security (RLS)           |
                |  - expires_at = now() + 24 Hours      |
                |  - delete_expired_messages() Stored   |
                |  - Realtime Publication Broadcast     |
                +---------------------------------------+
```

---

## 🚀 Step-by-Step Setup Guide

### 1. Create a Supabase Project
1. Navigate to [supabase.com](https://supabase.com) and create a new project.
2. Note down your **Project URL**, **Anon Public Key**, and **Service Role Key** (under *Project Settings -> API*).

---

### 2. Apply Database Schema & Migrations
1. In your Supabase Dashboard, open the **SQL Editor**.
2. Run the migration script located in [`supabase/migrations/20260930000001_vespera_schema.sql`](file:///c:/Users/PC/Downloads/CHATING%20PROJECT/supabase/migrations/20260930000001_vespera_schema.sql).
3. Run the storage & admin bootstrap script in [`supabase/migrations/20260930000002_storage_and_bootstrap.sql`](file:///c:/Users/PC/Downloads/CHATING%20PROJECT/supabase/migrations/20260930000002_storage_and_bootstrap.sql).

This provisions:
- `profiles`, `conversations`, `conversation_members`, `messages`, `message_attachments`, `message_reads`, `user_reports`, `rate_limits`
- PostgreSQL triggers for profile auto-creation on auth signup
- 24-hour expiration stored procedures
- Complete Row-Level Security (RLS) policies
- Supabase Realtime publication setup

---

### 3. Configure Supabase Storage
Verify that the following two buckets are present in **Storage**:
1. `chat-media` (Private, 50MB file size limit, allowed MIME types for images, videos, documents).
2. `avatars` (Public, 5MB file size limit for profile photos).

*(Both buckets and their RLS policies are created automatically by migration 000002).*

---

### 4. Configure Authentication & Redirect URLs
In Supabase Dashboard -> **Authentication** -> **URL Configuration**:
- **Site URL**: `http://localhost:3000` (or your production domain `https://your-domain.vercel.app`)
- **Redirect URLs**:
  - `http://localhost:3000/**`
  - `http://localhost:3000/api/auth/callback`
  - `http://localhost:3000/reset-password`
  - `https://your-domain.vercel.app/**`
  - `https://your-domain.vercel.app/api/auth/callback`

---

### 5. Set Environment Variables
Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your project credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
CRON_SECRET=create_a_64_char_secure_random_string_here
ADMIN_BOOTSTRAP_SECRET=create_a_secure_admin_bootstrap_secret_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

### 6. Install Dependencies & Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### 7. Creating Your First Administrator Securely

To prevent privilege escalation, ordinary registration always assigns the `user` role.

To safely promote your registered account to `admin`:

#### Option A: Using the Secure API Endpoint
Send a POST request to `/api/admin/bootstrap`:
```bash
curl -X POST http://localhost:3000/api/admin/bootstrap \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "YOUR_ADMIN_BOOTSTRAP_SECRET_HERE",
    "user_email": "admin@example.com"
  }'
```

#### Option B: Directly via Supabase SQL Editor
```sql
SELECT public.promote_user_to_admin('admin@example.com');
```

Once promoted, accessing `/admin` displays the **Admin Control Center**, user moderation tools, telemetric stats, and the **Admin Chat Viewer**.

---

### 8. 24-Hour Expiration Engine

Every message is stamped with `expires_at = created_at + interval '24 hours'`.

#### How Cleanup Operates:
1. All client and admin queries filter `WHERE expires_at > now()`.
2. The `/api/cron/cleanup-expired` endpoint is protected via `Bearer <CRON_SECRET>`.
3. When invoked:
   - Deletes expired messages from PostgreSQL.
   - Deletes associated storage objects from the `chat-media` bucket.
4. **Vercel Cron** (`vercel.json`) automatically triggers this endpoint every hour.
5. Administrators can also trigger immediate batch purges from the **Admin Dashboard** (`/admin`).

---

### 9. Deploying to Vercel
1. Push your repository to GitHub / GitLab.
2. Import project into Vercel.
3. In Project Settings -> Environment Variables, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CRON_SECRET`
   - `ADMIN_BOOTSTRAP_SECRET`
   - `NEXT_PUBLIC_APP_URL`
4. Deploy. Vercel Cron will automatically pick up `vercel.json` and schedule the expiration engine.
