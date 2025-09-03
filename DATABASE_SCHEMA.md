# Library Management System - Database Schema

## Database Schema Diagram

```sql
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE SCHEMA                               │
│                         Library Management System                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐         ┌─────────────────────────────┐
│           USERS             │         │           BOOKS             │
├─────────────────────────────┤         ├─────────────────────────────┤
│ id (PK)              INT    │         │ id (PK)              INT    │
│ name                 VARCHAR│         │ title                VARCHAR│
│ email (UNIQUE)       VARCHAR│         │ author               VARCHAR│
│ password_hash        VARCHAR│         │ isbn (UNIQUE)        VARCHAR│
│ role                 ENUM   │         │ available_quantity   INT    │
│ registered_date      DATE   │         │ shelf_location       VARCHAR│
│ created_at          TIMESTAMP        │ created_at          TIMESTAMP
│ updated_at          TIMESTAMP        │ updated_at          TIMESTAMP
└─────────────────────────────┘         └─────────────────────────────┘
            │                                         │
            │                                         │
            │ 1                                    1  │
            │                                         │
            │                                         │
            └─────────────────┐       ┌───────────────┘
                              │       │
                              ▼       ▼
                    ┌─────────────────────────────┐
                    │       BORROW_RECORDS        │
                    ├─────────────────────────────┤
                    │ id (PK)              INT    │
                    │ user_id (FK)         INT    │
                    │ book_id (FK)         INT    │
                    │ due_date             DATE   │
                    │ returned_at          TIMESTAMP
                    │ idempotency_key      VARCHAR│
                    │ created_at          TIMESTAMP
                    │ updated_at          TIMESTAMP
                    └─────────────────────────────┘
                              ∞       ∞
```

## Table Details

### 1. USERS Table
**Purpose**: Stores user information for both admins and borrowers

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Unique user identifier |
| name | VARCHAR(255) | NOT NULL | User's full name |
| email | VARCHAR(255) | UNIQUE, NOT NULL, VALID EMAIL | User's email address |
| password_hash | VARCHAR(255) | NOT NULL | Hashed password for authentication |
| role | ENUM('ADMIN', 'BORROWER') | NOT NULL, DEFAULT 'BORROWER' | User role for authorization |
| registered_date | DATE | NULLABLE | Date when user registered |
| created_at | TIMESTAMP | AUTO | Record creation timestamp |
| updated_at | TIMESTAMP | AUTO | Record last update timestamp |

**Indexes**:
- UNIQUE INDEX on `email`
- INDEX on `role`

### 2. BOOKS Table
**Purpose**: Stores book information and availability

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Unique book identifier |
| title | VARCHAR(255) | NOT NULL | Book title |
| author | VARCHAR(255) | NOT NULL | Book author |
| isbn | VARCHAR(20) | UNIQUE, NOT NULL, PATTERN MATCH | International Standard Book Number |
| available_quantity | INTEGER | NOT NULL, DEFAULT 0, MIN 0 | Number of copies available |
| shelf_location | VARCHAR(50) | NULLABLE | Physical location in library |
| created_at | TIMESTAMP | AUTO | Record creation timestamp |
| updated_at | TIMESTAMP | AUTO | Record last update timestamp |

**Indexes**:
- INDEX on `title` (for search performance)
- INDEX on `author` (for search performance)
- UNIQUE INDEX on `isbn`

### 3. BORROW_RECORDS Table
**Purpose**: Tracks book borrowing transactions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Unique borrow record identifier |
| user_id | INTEGER | FOREIGN KEY, NOT NULL | References users.id |
| book_id | INTEGER | FOREIGN KEY, NOT NULL | References books.id |
| due_date | DATE | NOT NULL | Date when book should be returned |
| returned_at | TIMESTAMP | NULLABLE | Actual return timestamp (NULL = not returned) |
| idempotency_key | VARCHAR(64) | UNIQUE, NULLABLE | For preventing duplicate borrows |
| created_at | TIMESTAMP | AUTO | Record creation timestamp |
| updated_at | TIMESTAMP | AUTO | Record last update timestamp |

**Indexes**:
- INDEX on `due_date` (for overdue queries)
- INDEX on `returned_at` (for current loans queries)
- UNIQUE INDEX on `idempotency_key` (where NOT NULL)
- INDEX on `user_id` (for user's loans queries)

## Relationships

```
USERS (1) ──────────── (∞) BORROW_RECORDS
  │                           │
  └── One user can have ──────┘
      multiple borrow records

BOOKS (1) ──────────── (∞) BORROW_RECORDS  
  │                           │
  └── One book can have ──────┘
      multiple borrow records
```

### Relationship Details:

1. **Users → Borrow Records** (One-to-Many)
   - One user can have multiple borrow records
   - Foreign Key: `borrow_records.user_id` → `users.id`
   - Cascade: Restrict deletion if user has active loans

2. **Books → Borrow Records** (One-to-Many)
   - One book can have multiple borrow records
   - Foreign Key: `borrow_records.book_id` → `books.id`
   - Cascade: Restrict deletion if book has active loans

## Business Rules

### Data Integrity Rules:
1. **Email Uniqueness**: Each user must have a unique email address
2. **ISBN Uniqueness**: Each book must have a unique ISBN
3. **Quantity Validation**: Available quantity cannot be negative
4. **Role Validation**: User role must be either 'ADMIN' or 'BORROWER'
5. **Due Date**: Must be a future date when creating a borrow record

### Operational Rules:
1. **Borrowing**: Book's available_quantity decreases when borrowed
2. **Returning**: Book's available_quantity increases when returned
3. **Overdue Detection**: Books where due_date < current_date AND returned_at IS NULL
4. **Current Loans**: Records where returned_at IS NULL
5. **Idempotency**: Duplicate borrow requests with same idempotency_key are ignored