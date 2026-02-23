# Client Portal — Feature Plan

Invite clients via email so they can view time records for their projects only.  
Client A's invited users see only Client A's data — never Client B or C.

---

## 1. Overview

| Actor | Current | New |
|-------|---------|-----|
| **Freelancer (owner)** | Signs up, manages clients, logs time, invoices | Same + can invite clients to portal |
| **Client (invited)** | No login; just receives invoices by email | Signs up via invite link, sees read-only dashboard with their projects & time logs |

**Access rule:** A client user linked to Client A can only see:
- Client A's profile (name, etc.)
- Projects under Client A
- Time logs for those projects (work done by the freelancer for Client A)

---

## 2. Data Model

### New tables

**`client_invites`**
```
id              uuid PK
client_id       uuid FK → clients(id)
email           text NOT NULL
token           text UNIQUE NOT NULL  (secure random, for invite URL)
status          text ('pending' | 'accepted' | 'expired')
invited_by      uuid FK → auth.users(id)
expires_at      timestamptz
created_at      timestamptz
```

**`client_portal_access`**
```
id              uuid PK
client_id       uuid FK → clients(id)
user_id         uuid FK → auth.users(id)  (the invited person)
invited_by      uuid FK → auth.users(id)
created_at      timestamptz

UNIQUE(client_id, user_id)  -- one user can't be linked twice to same client
```

### Optional: `profiles.role`

Add `role text ('owner' | 'client')` to profiles to simplify routing:
- **owner:** has at least one client where `clients.user_id = auth.uid()`
- **client:** has `client_portal_access` but no clients as owner

You can derive this from existing tables instead of storing it.

---

## 3. RLS Policies (critical)

Current policies assume `auth.uid() = user_id` (owner). We need **additional SELECT** policies for client portal users.

**Clients** — client can see clients they have access to:
```sql
CREATE POLICY "Client portal users can view linked clients"
  ON public.clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.client_portal_access cpa
      WHERE cpa.client_id = clients.id AND cpa.user_id = auth.uid()
    )
  );
```

**Projects** — client can see projects for their clients:
```sql
CREATE POLICY "Client portal users can view projects of linked clients"
  ON public.projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.client_portal_access cpa
      WHERE cpa.client_id = projects.client_id AND cpa.user_id = auth.uid()
    )
  );
```

**Time logs** — client can see logs for their projects (via project → client):
```sql
CREATE POLICY "Client portal users can view time logs of linked clients"
  ON public.time_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.client_portal_access cpa ON cpa.client_id = p.client_id
      WHERE p.id = time_logs.project_id AND cpa.user_id = auth.uid()
    )
  );
```

**No INSERT/UPDATE/DELETE** for client portal users on these tables — read-only.

---

## 4. Auth & Sign Up

### Current sign up

- Page: `/login` (toggle "Sign up")
- Supabase `signUp({ email, password })`
- Creates `auth.users` + `profiles` via trigger

### Invite flow — new sign up path

**Invite link:** `https://yourapp.com/accept-invite?token=abc123`

1. Freelancer clicks "Invite to portal" on Client detail.
2. Enters email → creates `client_invites` row (status=pending), sends email with link.
3. Client clicks link → lands on `/accept-invite?token=xxx`.
4. Page loads token, fetches invite (server) → shows email (read-only), password field.
5. Client submits → `signUp({ email, password })`.
6. On success → server action `linkInviteToUser(token)`:
   - Validates token
   - Ensures invite email = signed-up user email
   - Creates `client_portal_access`
   - Sets invite status = 'accepted'
7. Redirect to `/client` dashboard.

### Sign up form changes

**Option A (recommended):** Keep `/login` as-is for owners. Add `/accept-invite` only for clients.

**Option B:** Add optional "Full name" to sign up if you want it in profiles. Supabase supports `signUp({ email, password, options: { data: { full_name: "..." } } })` — it goes into `raw_user_meta_data` and your `handle_new_user` trigger can read it.

---

## 5. Client Dashboard (new routes)

### Route structure

```
/client                    → Client dashboard (list of clients they can access)
/client/[clientId]         → Client detail: projects, time logs
/client/[clientId]/logs    → Time logs for that client (optional sub-page)
```

### Client dashboard UI

**`/client`**
- List of clients the user has access to (name, maybe project count).
- Click a client → `/client/[id]`.

**`/client/[clientId]`**
- Client name.
- Projects list (name, status).
- Time logs table: date, project, description, duration, billable, billed.
- Optional: summary (total hours, unbilled, billed).

All read-only. No edit/delete.

---

## 6. Owner UI — Invite flow

### Where to add "Invite"

- **Client detail page** (`/clients/[id]`) — button "Invite to portal".
- **Client slide-over** — optional "Invite" action.

### Invite flow (owner)

1. Click "Invite to portal".
2. Modal/slide-over: email input (required).
3. Submit → server action:
   - Create `client_invites` (client_id, email, token, invited_by).
   - Send email (Resend) with link: `{APP_URL}/accept-invite?token={token}`.
4. Show "Invite sent to x@y.com".
5. Optional: list pending invites with "Resend" / "Revoke".

---

## 7. Middleware & access control

### Logic

```
if not authenticated:
  allow /login, /accept-invite
  redirect rest to /login

if authenticated:
  is_owner = has any clients where user_id = auth.uid()
  is_client = has any client_portal_access where user_id = auth.uid()

  if is_owner:
    allow /, /clients, /invoices, /logs, etc.
    block /client/* if you want strict separation
  if is_client (and not is_owner):
    allow /client, /client/[id]
    redirect / to /client
  if both:
    allow all; show nav with "My workspace" + "Client portals"
```

### Implementation

- Middleware: read `auth.uid()`, query `client_portal_access` and clients (or use a small helper/view).
- Redirect:
  - Owner visiting `/client` → allow (optional future "view as client").
  - Client-only visiting `/` → redirect to `/client`.

---

## 8. Email template

**Subject:** You're invited to view [Freelancer Name]'s time records for [Client Name]

**Body:**
- Greeting.
- "You've been invited to view time records for [Client Name]."
- CTA: [Set up your account] → `{APP_URL}/accept-invite?token={token}`
- Expiry note: "This link expires in 7 days."
- Optional: Timvo branding.

---

## 9. Implementation phases

### Phase 1 — Database & RLS ✓
- Migration: `client_invites`, `client_portal_access`. ✓
- RLS policies for client read access. ✓
- `accept_client_invite(token)` function for linking users on invite accept. ✓

### Phase 2 — Invite flow (owner) ✓
- "Invite to portal" on client detail. ✓
- Server action: create invite, generate token, send email. ✓
- Pending invites list. ✓

### Phase 3 — Accept invite & sign up ✓
- `/accept-invite` page (read token, show form). ✓
- `acceptInvite` calls `accept_client_invite` RPC. ✓
- Redirect to `/client` after success. ✓

### Phase 4 — Client dashboard ✓
- `/client` layout (client portal shell). ✓
- Client list. ✓
- Client detail with projects + time logs. ✓
- Middleware: client-only users redirected from `/` to `/client`. ✓

### Phase 5 — Polish ✓
- Invite expiry (7 days). ✓
- Revoke invite. ✓
- Resend invite email. ✓

---

## 10. Security checklist

- [ ] Invite token is long and random (e.g. 32 bytes hex).
- [ ] Token single-use (mark accepted).
- [ ] Invite email must match sign-up email.
- [ ] RLS restricts client users to SELECT on relevant tables.
- [ ] Client users cannot see other clients' data.
- [ ] Client users cannot see owner-only data (services, settings, etc.).

---

## 11. Open questions

1. **Multiple clients per user?** One person invited by different freelancers (different apps) — each app would have its own `client_portal_access`. In your app, one user could have access to Client A and Client B (if same freelancer invited them to both). Plan supports this.
2. **What exactly can clients see?** Time logs only, or also invoices sent to them? Phase 1: time logs only.
3. **Invite expiry?** Recommended: 7 days.
4. **Can a client have multiple portal users?** Yes — multiple invites for the same client (different emails) = multiple users with access.
