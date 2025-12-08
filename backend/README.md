# Sanat Merkezi Backend API

Backend API for the Art Center Management System.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` file (copy from `.env.example`):

```bash
copy .env.example .env
```

3. Update `.env` with your PostgreSQL credentials

4. Initialize database:

```bash
npm run init-db
```

## Running the Server

Development mode (with auto-reload):

```bash
npm run dev
```

Production mode:

```bash
npm start
```

## Default Users

After running `npm run init-db`:

**Admin:**

- Email: admin@sanatmerkezi.com
- Password: admin123

**Teacher:**

- Email: teacher@sanatmerkezi.com
- Password: teacher123

## API Endpoints

### Authentication

- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Students

- `GET /api/students` - Get all students
- `GET /api/students/:id` - Get student by ID
- `POST /api/students` - Create student (admin)
- `PUT /api/students/:id` - Update student (admin)
- `DELETE /api/students/:id` - Delete student (admin)
- `POST /api/students/enroll` - Enroll student in course (admin)

### Teachers

- `GET /api/teachers` - Get all teachers
- `GET /api/teachers/:id` - Get teacher by ID
- `POST /api/teachers` - Create teacher (admin)
- `PUT /api/teachers/:id` - Update teacher (admin)
- `DELETE /api/teachers/:id` - Delete teacher (admin)
- `POST /api/teachers/assign` - Assign teacher to course (admin)

### Courses

- `GET /api/courses` - Get all courses
- `GET /api/courses/:id` - Get course by ID
- `POST /api/courses` - Create course (admin)
- `PUT /api/courses/:id` - Update course (admin)
- `DELETE /api/courses/:id` - Delete course (admin)

### Schedules

- `GET /api/schedules` - Get all schedules (role-based)
- `GET /api/schedules/:id` - Get schedule by ID
- `POST /api/schedules` - Create schedule (admin)
- `PUT /api/schedules/:id` - Update schedule (admin)
- `DELETE /api/schedules/:id` - Delete schedule (admin)

### Payments

- `GET /api/payments/plans` - Get all payment plans
- `GET /api/payments/plans/:id` - Get payment plan by ID
- `POST /api/payments/plans` - Create payment plan (admin)
- `PUT /api/payments/plans/:id` - Update payment plan (admin)
- `POST /api/payments/record` - Record a payment (admin)
- `GET /api/payments/student/:studentId` - Get payments by student
- `GET /api/payments/pending` - Get pending payments
