# Zorvyn Finance Dashboard

A comprehensive financial tracking system built with Node.js, Express, TypeScript, Prisma, PostgreSQL, and a React frontend.

## 📌 Project Overview
Zorvyn provides a single integrated dashboard allowing users to log income and expenses, map categories, and drill down into financial trends via detailed visual analytics.

## 🚀 Setup Steps

### 1. Backend Setup
1. Open a terminal and navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables:
   Copy `.env.example` to `.env` and fill in your PostgreSQL `DATABASE_URL` and `JWT_ACCESS_SECRET`.
4. Initialize the database and seed the data:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   npm run seed
   ```
5. Start the backend development server:
   ```bash
   npm run dev
   ```

### 2. Frontend Setup
1. Open a new terminal and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` (ensure `VITE_API_URL` points to your backend).
4. Run the frontend development server:
   ```bash
   npm run dev
   ```

## 🔐 Roles Explanation
Zorvyn includes a robust Role-Based Access Control (RBAC) system:

* **ADMIN**: Has unrestricted access. Can view all dashboard KPIs, query all transactions, create new transactions, update existing records, and delete any transaction.
* **ANALYST**: Has read-only access to all transactions and dashboard analytics. They can monitor trends, view category breakdowns, and see the full transaction list, but they **cannot** create, modify, or delete any transactions.
* **VIEWER**: Can only view the high-level dashboard visualizations (Total Income, Total Expense, Net Balance, Recent Activity). They do not have access to the deep-dive transactions list.

## 🌐 API Endpoints

Our backend acts as a RESTful JSON API.

**Authentication**
* `POST /api/v1/auth/register` - Register a new user
* `POST /api/v1/auth/login` - Login to receive a JWT access token
* `GET /api/v1/auth/me` - Validate the current token and get user profile

**Dashboard Analytics**
* `GET /api/v1/dashboard/summary` - Returns Total Income, Expense, Net Balance, and Recent Activity.
* `GET /api/v1/dashboard/categories` - Returns aggregated transaction sums grouped by category.
* `GET /api/v1/dashboard/trends` - Returns aggregated data over time. Accepts `months` and `granularity` (`week` or `month`) filters.

**Transactions** *(Requires ADMIN or ANALYST)*
* `GET /api/v1/transactions` - Fetch paginated, filterable transactions
* `POST /api/v1/transactions` *(ADMIN only)* - Log a new transaction
* `GET /api/v1/transactions/:id` - Fetch a single transaction
* `PATCH /api/v1/transactions/:id` *(ADMIN only)* - Edit an existing transaction
* `DELETE /api/v1/transactions/:id` *(ADMIN only)* - Soft-delete a transaction

## 📚 Swagger UI Documentation
We have integrated **Swagger** for interactive OpenAPI documentation!
Once the backend is running, you can explore, test, and interact with the physical API directly through the browser.

* 🔗 **Swagger UI Address**: `http://localhost:4000/api-docs/`

*(Make sure your backend is running on port 4000. Use the `/auth/login` endpoint directly in the Swagger UI and copy the JWT token into the top-right "Authorize" button to test protected endpoints).*

## 🏗️ Assumptions Made
1. **Soft-Deletes**: Transaction history is vital for financial platforms. When an ADMIN deletes a transaction, we assume it should be conditionally hidden rather than purged natively from the PostgreSQL database.
2. **Database Choice**: PostgreSQL was utilized due to standard enterprise constraints demanding ACID relational integrity for financial calculations.
3. **Currency Storage**: Financial data is always stored utilizing Prisma `Decimal` instances (`numeric(14,2)`) in the database to prevent javascript `.1 + .2 = .300004` floating-point precision math bugs.
4. **Timezones**: Dates are inherently stored in UTC format. Trend groupings calculate ISO calendar weeks or exact calendar months using UTC math.
5. **Session Management**: Assumed JWT stored in `localStorage` is sufficient for this scope. In a strict prod environment, httpOnly cookies combined with CSRF tactics might be utilized instead.

## 🤔 Trade-Offs Considered
* **Database Aggregation vs. Application Math**: Instead of fetching all transaction records and calculating dashboard totals incrementally in Node.js (which consumes memory/bandwidth), we pushed the heavy lifting to PostgreSQL (via `_sum` and `groupBy`). *Trade-off*: Slightly higher CPU load on the database engine, but massively improved API latency and significantly lower server memory usage.
* **Pagination Over Infinite Scroll**: We chose standard offset-limit pagination (`skip`/`take`) for the transactions list for simplicity and exact page tracking, skipping complex cursor-based pagination (which provides better performance over millions of rows but is overkill for a standard financial ledger view).
* **Global vs. Field-Level Errors**: Upgraded from flat standard Zod error objects to a recursively mapped `Record<string, string[]>` structure so the frontend can easily target UI inputs (e.g., displaying `amount: Required` exactly under the amount field).
