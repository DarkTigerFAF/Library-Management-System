# Library Management System (Node.js + PostgreSQL)

Simple RESTful API to manage books, borrowers, and loans. Built with Express and Sequelize, using PostgreSQL. Includes validation, error handling, JWT auth with RBAC, rate limiting on selected endpoints, Redis caching, and CSV export reports.

## Setup

1) Create a `.env` file (see `.env.example`):

```
PORT=3000
DB_HOST=localhost
DB_PORT=5433
DB_NAME=mydatabase
DB_USER=myuser
DB_PASSWORD=mypassword
DATABASE_URL=postgres://myuser:mypassword@localhost:5432/mydatabase
JWT_SECRET=supersecretjwt
REDIS_HOST=localhost
REDIS_PORT=6379
```

2) Start Postgres (Docker):

```
docker-compose up -d
```

3) Install deps and run:

```
npm install
npm start
```

Server will run on http://localhost:3000
Swagger UI: http://localhost:3000/docs

## API Summary

- Books: `POST /api/books`, `PUT /api/books/:id`, `DELETE /api/books/:id`, `GET /api/books` (supports q/author/title/isbn), `GET /api/books/:id`
- Borrowers: `GET /api/borrowers` (admin), `GET /api/borrowers/:id` (owner/admin), `PUT /api/borrowers/:id` (owner/admin)
- Loans: `POST /api/loans` (checkout), `POST /api/loans/{id}/return`, `GET /api/loans/me`, `GET /api/loans/overdue` (admin)
- Reports (CSV): `GET /api/reports/overdue/last-month.csv`, `GET /api/reports/borrows/last-month.csv`

All endpoints return JSON unless CSV export.

## Database Schema

Tables:
- books(id, title, author, isbn, available_quantity, shelf_location, created_at, updated_at)
- users(id, name, email, password_hash, role, registered_date, created_at, updated_at)
- borrow_records(id, book_id, user_id, due_date, returned_at, idempotency_key, created_at, updated_at)

Indexes:
- books: idx on title, author; unique on isbn
- borrow_records: idx on due_date, returned_at

## Testing

```
npm test
```

Test uses the same DB connection; ensure your DB is running or set a separate test database in env variables.

## Notes

- JWT-based RBAC with roles: ADMIN, BORROWER. Admin can manage the catalog and users; borrowers can read the catalog and manage their own profile/loans.
- Validation prevents common injection and malformed inputs.
- Rate limiting: `GET /api/books` uses a dynamic limiter—tighter limit when `q` is provided (search), looser when listing.
- Redis cache-aside for hot reads on the books list/search with short TTL.
