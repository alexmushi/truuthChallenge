# Applicant Document Submission Portal

Monorepo containing:

- `frontend/` React + TypeScript UI with Login, Selection, and Document Upload pages.
- `backend/` Express BFF, Prisma (MySQL), and Python Truuth integration client used by backend routes.

## Features

- Username/password login with secure httpOnly cookie session.
- Upload and status tracking for 3 required docs: Australian Passport, Australian Driver Licence, Resume.
- Upload progress and persistent statuses across logout/login.
- Truuth classifier gate for passport/licence; resume bypasses classifier.
- Truuth verify submission + stored `documentVerifyId` + polling every 5s until DONE/FAILED.
- View Result modal with copy/download JSON.
- No permanent file storage (in-memory upload only).

## Local setup

### Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Environment variables (`backend/.env`)

See `backend/.env.example`.

## Serverless

- `backend/vercel.json`: Vercel API function routing.
- `backend/serverless.yml`: AWS Lambda style deployment definition.
