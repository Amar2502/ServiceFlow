# ServiceFlow — manual test checklist (frontend + API)

Use this while the **backend** is running and `frontend` has the correct **`NEXT_PUBLIC_API_URL`** (see `frontend/.env.local.example`). Check items in order where it helps; skip sections that do not apply to your role.

1. **Environment** — Open the site; confirm no console errors about failed API base URL or CORS (fix origin/URL if you see blocked requests).
2. **Landing (`/`)** — Hero, product sections, and footer render; primary CTA goes to register; “Sign in” / API console links go to login; layout looks correct on a narrow viewport.
3. **Register (`/register`)** — Create a new tenant admin account with valid data; success path logs you in or sends you to login as designed; duplicate or invalid data shows a clear error (toast or message).
4. **Login (`/login`)** — Sign in with valid credentials; you land on `/dashboard`; wrong password shows an error and does not leave a fake session.
5. **Session persistence** — After login, refresh the page; you stay on the dashboard (session in localStorage, not cleared).
6. **Logout** — Use logout from the dashboard shell; you return to a public route and `/dashboard` redirects to login when visited again.
7. **Auth gate** — While logged out, open `/dashboard`, `/dashboard/complaints`, etc.; you are redirected to login (or equivalent) without a broken blank page.
8. **Admin dashboard (`/dashboard`)** — Stats and recent complaints (or placeholders) load without infinite spinners; errors surface as toasts if the API fails.
9. **Complaints (`/dashboard/complaints`)** — List loads; filters/search if present work; creating or updating a complaint (if the UI allows) matches backend rules; status changes behave as expected for an **admin**.
10. **Employees (`/dashboard/employees`)** — Active and deleted lists load; create invite works and shows copyable link or token; accepting invite flow is tested separately (item 15).
11. **Departments (`/dashboard/departments`)** — List loads; create/update/delete (if available) succeed and lists refresh.
12. **API Keys (`/dashboard/apikeys`)** — List keys; generate a new key with a name; new key is shown once (or masked) per your UI; revoke/delete if supported updates the list.
13. **Settings (`/dashboard/settings`)** — As **admin**: tenant name and routing mode save and persist after refresh; as **agent**: profile/name update works when `employeeId` exists; errors are readable.
14. **API Docs (`/dashboard/api-docs`)** — Page loads; examples show your configured API base; copy-paste snippets use the same auth style your backend expects (`Bearer` vs API key as documented).
15. **Invite (`/invite/[token]`)** — Open a valid invite URL; complete registration; session includes role and **employeeId** when returned; invalid/expired token shows a clear message.
16. **Agent nav** — Log in as **AGENT**: sidebar shows Dashboard, My Assignments, API Docs, Settings; **does not** show admin-only items (Complaints, Employees, Departments, API Keys).
17. **My Assignments (`/dashboard/my-assignments`)** — As agent with `employeeId`, list loads; empty state is sensible; if the UI allows status updates, confirm whether the **backend** allows agents (expect 401 otherwise).
18. **Direct URL as agent** — While logged in as agent, manually open `/dashboard/complaints` or `/dashboard/apikeys`; UI should block, redirect, or show forbidden—no silent broken state.
19. **Mobile / narrow layout** — Open the dashboard on a small width; hamburger/sheet menu opens, navigates, and closes; content is scrollable and not clipped.
20. **Error handling** — Stop the backend temporarily; trigger a page that fetches data; user sees a toast or error state, not an uncaught exception overlay.

---

Optional: after changes, run `npm run build` in `frontend/` to confirm production build still passes.
