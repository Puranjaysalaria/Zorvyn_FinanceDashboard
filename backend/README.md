# Zorvyn Backend

Finance Data Processing and Access Control Backend built with Node.js, TypeScript, Express, Prisma, and PostgreSQL.

## Features

- JWT authentication
- Role-based access control (ADMIN, ANALYST, VIEWER)
- User management with status control (ACTIVE, INACTIVE)
- Transaction CRUD with filters and pagination
- Dashboard summary APIs (income, expense, net, category totals, monthly trends)
- Zod validation with centralized error handling
- Soft delete for transactions

## Tech Stack

- Node.js + Express + TypeScript
- PostgreSQL + Prisma ORM
- Zod for validation
- JWT + bcrypt for auth

## Folder Structure

- src/config: environment and DB client
- src/controllers: request handlers
- src/services: business logic
- src/routes: route definitions
- src/middleware: auth, RBAC, validation, error handlers
- src/validation: zod schemas
- prisma: schema and migrations

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and set values:

- DATABASE_URL
- JWT_ACCESS_SECRET

3. Generate Prisma client:

```bash
npm run prisma:generate
```

4. Run migrations:

```bash
npm run prisma:migrate -- --name init
```

5. Seed sample data:

```bash
npm run seed
```

6. Start dev server:

```bash
npm run dev
```

Base URL: `http://localhost:4000/api/v1`

## Role Access Matrix

- VIEWER: dashboard read only
- ANALYST: read transactions + dashboard
- ADMIN: full access to users and transactions + dashboard

## Main Endpoints

### Auth

- POST /auth/register
- POST /auth/login
- GET /auth/me

### Users (Admin only)

- POST /users
- GET /users
- GET /users/:id
- PATCH /users/:id
- PATCH /users/:id/deactivate

### Transactions

- GET /transactions (ADMIN, ANALYST)
- GET /transactions/:id (ADMIN, ANALYST)
- POST /transactions (ADMIN)
- PATCH /transactions/:id (ADMIN)
- DELETE /transactions/:id (ADMIN)

### Dashboard

- GET /dashboard/summary
- GET /dashboard/categories
- GET /dashboard/trends?months=6&granularity=month
- GET /dashboard/trends?months=6&granularity=week
- GET /dashboard/monthly-trends?months=6 (backward-compatible alias)

## Seed Users

- admin@zorvyn.com / Admin@123
- analyst@zorvyn.com / Analyst@123
- viewer@zorvyn.com / Viewer@123

## Assumptions

- Public register creates VIEWER users by default.
- Transactions are soft deleted.
- Monthly trend is generated from transaction date fields.
