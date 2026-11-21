\# Decisions



\## Assumptions

\- Staff are pre-created (seeded); no registration.

\- One inquiry belongs to the staff member who created it.

\- Contact is free text (phone or email).



\## Key design choices



\*\*1. Ownership: staff only see their own inquiries.\*\*

The rule lives in the SQL (`WHERE owner\_id = $user`) so it cannot be skipped by a forgotten check elsewhere. Another user's inquiry returns 404 (not 403), so the API does not reveal that the record exists.



\*\*2. Status rules.\*\*

New → In Progress → Resolved, and Resolved → In Progress (reopen). New → Resolved and Resolved → New are rejected with 422. The UI shows only valid buttons, but the API enforces the rules independently.



\*\*3. Stale data (two tabs).\*\*

Optimistic locking: the client sends the `updated\_at` it last saw. The UPDATE only applies if it still matches; otherwise the API returns 409 with the latest version, and the UI shows it with a notice. Duplicates: the same owner, contact and subject within 5 minutes returns 409 with a link to the existing inquiry.



\*\*Validation\*\* is done in the UI for quick feedback and again in the API with zod. The DB also has a CHECK constraint on status.



\## Trade-off accepted

The JWT is stored in `localStorage` for simplicity. It is exposed to XSS; an httpOnly cookie would be safer in production. Also, no real-time updates: a stale tab only finds out when the user tries to change something.



\## Testing gaps

\- Backend tests use the same database as development (they clean up after themselves); a separate test database would be better.

\- One frontend test (empty form validation). Not covered: detail page status changes, list filtering, the 409 stale UI.



\## What I would improve next

\- Separate test database and migrations tool

\- httpOnly cookie auth

\- Pagination for the list

\- Activity history per inquiry (who changed what, when)



\## Use of AI

I used an AI assistant to guide setup and generate initial code. I reviewed and ran everything myself. Example of a change: the first status update compared `updated\_at` exactly, which always returned 409 because PostgreSQL stores microseconds while JavaScript only keeps milliseconds. We fixed it by storing timestamps as `TIMESTAMPTZ(3)`. I also changed Next.js config to disable Cache Components, which caused a dev warning with this client-side app.

