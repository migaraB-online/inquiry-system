\# Customer Inquiry Management System



A small full-stack app where staff sign in, record customer inquiries, find them later, and move them through New → In Progress → Resolved.



\*\*Stack:\*\* Next.js (React, TypeScript, Tailwind) · Node.js + Express · PostgreSQL



\## Prerequisites



\- Node.js 20+

\- PostgreSQL 14+ (with `psql` available)



\## Setup



\### 1. Database



```

psql -U postgres -c "CREATE DATABASE inquiry\_db;"

psql -U postgres -d inquiry\_db -f backend/db/schema.sql

```



\### 2. Backend



```

cd backend

npm install

```



Create `backend/.env`:



```

PORT=4000

DATABASE\_URL=postgresql://postgres:YOUR\_PASSWORD@localhost:5432/inquiry\_db

JWT\_SECRET=any\_long\_random\_string

```



Seed the test accounts and start the API:



```

node db/seed.js

npm run dev

```



API runs on http://localhost:4000



\### 3. Frontend



In a new terminal:



```

cd frontend

npm install

npm run dev

```



App runs on http://localhost:3000



\## Test accounts



| Email | Password |

|---|---|

| alice@coffeeninja.lk | Password123! |

| bob@coffeeninja.lk | Password123! |



\## Running tests



```

cd backend \&\& npm test

cd frontend \&\& npm test

```



The backend tests need the database running (they create and delete their own temporary users).



\## Project structure



\- `backend/src` - Express app (auth, inquiries routes)

\- `backend/db` - schema and seed script

\- `backend/tests` - API tests

\- `frontend/app` - pages (login, list, new, detail)

\- `frontend/lib/api.ts` - API client

\- `frontend/\_\_tests\_\_` - UI tests

