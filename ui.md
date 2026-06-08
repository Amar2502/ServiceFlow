# ServiceFlow UI guide

## UI stack (how it’s built)

- **Framework**: Next.js App Router (`frontend/src/app/*`) with client components where needed (`"use client"`).
- **Styling**: Tailwind CSS **v4** via `@import "tailwindcss";` in `frontend/src/app/globals.css` (there is **no** `tailwind.config.*` in this repo).
- **Component system**: **shadcn/ui** (style: **new-york**, Radix primitives) configured in `frontend/components.json`.
- **Icons**: `lucide-react`.
- **Motion**: `framer-motion` on auth pages (login/register/invite) for small entrance animations.
- **Toasts**: `sonner` via shadcn’s `Toaster`, mounted in `frontend/src/components/providers.tsx`.
- **Charts**: `recharts` (used in dashboard overview sample).

## App layout overview (routes & shells)

The UI is split into three visual “surfaces” with distinct theming:

### 1) Marketing landing page (`/`)

- **File**: `frontend/src/app/page.tsx`
- **Look**: dark, terminal/emerald accent.
- **Header**: sticky top nav with logo mark and links to sections (`#product`, `#how`, `#faq`) + login/register CTAs.
- **Content**: hero with a terminal-like curl snippet card; product cards; “3 steps” section; FAQ accordion; CTA card; footer.
- **Color direction**: deep charcoal background with emerald highlights (see palette section).

### 2) Auth + invite flow (`/login`, `/register`, `/invite/[token]`)

- **Files**:
  - `frontend/src/app/login/page.tsx`
  - `frontend/src/app/register/page.tsx`
  - `frontend/src/app/invite/[token]/page.tsx`
- **Look**: warm tan gradient background + centered card, “paper” aesthetic.
- **Common pattern**:
  - Full-screen gradient container
  - `Card` as the form surface (shadowed, borderless)
  - Inputs use custom border + focus ring shades
  - Primary button uses a warm brown (`#8c6d4e`) with darker hover (`#725a3f`)
- **Invite page**:
  - Accepts a `token` from the URL param.
  - Form fields: name, email, title, password (password visibility toggle).
  - Submits to `POST /api/invite/login` and logs the user in via `AuthProvider`.

### 3) Dashboard console (`/dashboard/*`)

- **Shell file**: `frontend/src/app/dashboard/layout.tsx`
- **Look**: warm “paper” background with a tan sidebar and cocoa text.
- **Auth gating**:
  - If not ready or not logged in, shows a loading view / redirects to `/login`.
  - Role-based navigation: ADMIN sees all, AGENT sees a subset.

## Dashboard sidebar & mobile menu (the “invite/sidebar/etc” part)

### Desktop sidebar

In `frontend/src/app/dashboard/layout.tsx`:

- **Layout**: `md:flex-row` with an `aside` shown only on `md+`.
- **Sidebar**:
  - Width: `w-64`
  - Background: `bg-[#EED9C4]`
  - Border: `border-r border-[#dfc7ae]`
  - Header: small “terminal” icon tile + “ServiceFlow” + “Routing API” label.
  - Nav links:
    - Active link: `bg-[#c9a382]/40 text-[#3d2a1c] font-medium`
    - Hover link: `hover:bg-[#dfc7ae]/80 text-[#4a3728]`
  - Footer:
    - Role + userId snippet card
    - “Log out” button (ghost variant) with red hover background.

### Mobile header + slide-out menu

Also in `frontend/src/app/dashboard/layout.tsx`:

- On `md:hidden`, the dashboard uses a **top header** with a hamburger button.
- The hamburger opens a shadcn **`Sheet`** from the **left**:
  - `SheetContent side="left" className="bg-[#EED9C4] border-[#dfc7ae] w-72"`
  - It reuses the same `NavLinks` component.

### Dashboard navigation items

The sidebar links are defined in `navItems` in `frontend/src/app/dashboard/layout.tsx`:

- Dashboard
- My Assignments
- Complaints (**ADMIN only**)
- Employees (**ADMIN only**)
- Departments (**ADMIN only**)
- API Keys (**ADMIN only**)
- API Docs
- Settings

## Theme & colors (what shades are used)

There are two sources of “theme” in this project:

### A) shadcn/Tailwind tokens (CSS variables)

`frontend/src/app/globals.css` defines CSS variables for shadcn-style tokens (background/foreground/card/muted/etc.) using **OKLCH**, with both `:root` and `.dark` variants.

Important notes:

- **Tailwind v4** maps the `--background`, `--foreground`, etc. into `--color-background`, `--color-foreground`, etc. via `@theme inline { ... }`.
- Many pages still use **explicit hex colors** for the “brand” palette instead of relying solely on token colors.

### B) Project “brand” palette (hard-coded hex)

You’ll see these repeatedly (especially in dashboard + auth):

#### Dashboard “paper” palette

- **App background**: `#faf6f2`
- **Sidebar background**: `#EED9C4`
- **Sidebar borders / separators**: `#dfc7ae`
- **Nav active background tint**: `#c9a382` (often with `/40`)
- **Primary cocoa text**: `#3d2a1c`
- **Secondary cocoa text**: `#4a3728`, `#6b5344`, `#554635`
- **Link accent (docs)**: `#8c6d4e`
- **Cards**: typically `bg-white` with `border-[#EED9C4]`
- **Row hover (recent complaints)**: `#f5eadf`

#### Auth/invite “tan gradient” palette

- **Background gradient**: `from-[#f2dab6] to-[#e8c9a0]`
- **Heading text**: `#5a3e2b`
- **Inputs**:
  - Border: `#d6bfa0`
  - Focus ring: `#8c6d4e`
- **Primary button**: `#8c6d4e` (hover `#725a3f`)

#### Marketing landing (dark + emerald)

- **Base background**: `#0c0f14` (sections also use `#0a0d12`, code card uses `#080a0d`)
- **Accent**: emerald scale via Tailwind utilities:
  - Examples: `text-emerald-400`, `bg-emerald-500`, `ring-emerald-500/40`, `from-emerald-900/30`

## shadcn/ui components used (what to “download”)

This repo already contains these shadcn components under `frontend/src/components/ui/`:

- `accordion`
- `avatar`
- `badge`
- `button`
- `card`
- `checkbox`
- `dialog`
- `dropdown-menu`
- `input`
- `label`
- `select`
- `sheet`
- `sonner` (Toaster wrapper)
- `table`
- `tabs`

If you’re setting up the same UI from scratch (or regenerating), these are the ones to add:

```bash
cd frontend
npx shadcn@latest add accordion avatar badge button card checkbox dialog dropdown-menu input label select sheet sonner table tabs
```

## Where to look in code (quick map)

- **Root app wiring**: `frontend/src/app/layout.tsx` (fonts + `Providers`)
- **Global theme tokens**: `frontend/src/app/globals.css`
- **Providers (auth + toaster)**: `frontend/src/components/providers.tsx`
- **Session/auth state**: `frontend/src/components/auth-provider.tsx` + `frontend/src/lib/session.ts`
- **Dashboard shell (sidebar + mobile sheet)**: `frontend/src/app/dashboard/layout.tsx`
- **Invite flow**: `frontend/src/app/invite/[token]/page.tsx`
- **Landing page**: `frontend/src/app/page.tsx`

