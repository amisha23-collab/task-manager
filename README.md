# Task Management Application

A full-stack task manager built for the KoderTroop assessment. Users register, log in, and manage their own tasks. The task list is cached in Redis and search is powered by Elasticsearch.

## Features

- Register and log in (JWT, bcrypt-hashed passwords)
- Create, read, update, delete tasks; mark them done or not done
- Every user sees only their own tasks (enforced on the server)
- `getTasks` is cached in Redis per user (10 minute TTL) and the cache is invalidated on every change
- `searchTasks` uses Elasticsearch to search title and description (typo tolerant, partial words)
- MongoDB and Elasticsearch stay in sync on create, update and delete
- Filter by status (all / to do / done), sort (newest, oldest, title), search with debounce
- Responsive React UI with loading, empty and error states, form validation, and delete confirmation
- In-app notifications for tasks that are due soon or overdue, with an inbox and read/unread state
- Optional email reminders can be configured with SMTP environment settings; email delivery is not enabled until those settings are supplied
- Redis or Elasticsearch down? The app keeps working (see [Error Handling](#error-handling))

## Technology Stack

| Area | Tools |
|---|---|
| Backend | Node.js 20, Express, Apollo Server 4 (GraphQL), Mongoose, MongoDB, ioredis (Redis), @elastic/elasticsearch 8, jsonwebtoken, bcryptjs |
| Frontend | React 18, Vite, Apollo Client 3, React Router, Context API, Tailwind CSS |
| Infra | Docker Compose for MongoDB, Redis, Elasticsearch |

## Architecture

```
React (Apollo Client) --GraphQL + JWT--> Express + Apollo Server
                                              |
                                resolvers (thin, check auth)
                                              |
                                  services (business rules)
                          ____________________|____________________
                         |                    |                    |
                  MongoDB (truth)      Redis (task list cache)   Elasticsearch (search)
```

- **Resolvers** only check authentication and call a service.
- **Services** hold the logic: validation, ownership checks, cache and search sync.
- **MongoDB is the source of truth.** Redis and Elasticsearch are helpers that can be rebuilt.
- Dependencies are injected in one place (`src/container.js`), which makes the services easy to unit test with fakes.

## Project Structure

```
task-manager/
  docker-compose.yml
  backend/
    src/
      config/         env.js (validated config), db.js (Mongo connection)
      models/         User.js, Task.js, Notification.js (Mongoose)
      graphql/        typeDefs.js, resolvers/ (auth.js, task.js)
      services/       authService.js, taskService.js, notificationService.js, reminderService.js
      auth/           jwt.js, context.js (reads token), guard.js (requireAuth)
      redis/          client.js, taskCache.js
      elasticsearch/  client.js, taskSearch.js
      utils/          errors.js, validators.js, mappers.js
      container.js    wires everything together
      app.js          Express + Apollo setup
      server.js       startup and shutdown
    scripts/reindex.js
    tests/
  frontend/
    src/
      components/     TaskForm, TaskItem, TaskToolbar, ConfirmDialog, Alert, ...
      pages/          LoginPage, RegisterPage, DashboardPage, profile and notification pages
      context/        AuthContext.jsx
      hooks/          useAuth, useDebounce, useTaskActions
      graphql/        operations.js (all queries and mutations)
      services/       apolloClient.js, tokenStorage.js
      utils/          validation.js, errors.js
```

## Prerequisites

- Node.js 20 or newer (`node -v`)
- Docker Desktop (easiest way to run MongoDB, Redis, Elasticsearch)
- Elasticsearch needs about 1 GB of free RAM

## Environment Variables

Create real `.env` files from the examples. They are git-ignored, so secrets are never committed.

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**PowerShell (Windows):**

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

On Windows PowerShell, use:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

**backend/.env**

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | 4000 | API port |
| `CORS_ORIGIN` | http://localhost:5173 | Allowed frontend origin |
| `MONGODB_URI` | mongodb://localhost:27017/task-manager | MongoDB connection (required) |
| `JWT_SECRET` | none | Signing secret, 16+ characters (required) |
| `JWT_EXPIRES_IN` | 7d | Token lifetime |
| `REDIS_URL` | redis://localhost:6379 | Redis connection |
| `REDIS_TASKS_TTL_SECONDS` | 600 | Cache lifetime (10 minutes) |
| `ELASTICSEARCH_URL` | http://localhost:9200 | Elasticsearch URL |
| `ELASTICSEARCH_TASKS_INDEX` | tasks | Index name |

Generate a strong secret and paste it into `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**frontend/.env**: `VITE_GRAPHQL_URL=http://localhost:4000/graphql`

## MongoDB Setup

Docker (recommended): `docker compose up -d` from the project root starts MongoDB on port 27017. No further setup; the database and collections are created on first use.
Without Docker: install MongoDB Community Edition and keep the default `MONGODB_URI`, or use a MongoDB Atlas connection string.

## Redis Setup

Docker: started by the same `docker compose up -d` command (port 6379).
Without Docker: install Redis 7 and run `redis-server`.
Check it works: `docker compose exec redis redis-cli ping` should print `PONG`.

## Elasticsearch Setup

Docker: started by the same command (port 9200). Security is turned off for local development only.
Wait about 30 to 60 seconds on first start, then check: `curl http://localhost:9200` should return JSON with a version number.
The backend creates the `tasks` index with the correct mapping automatically.
Linux note: if Elasticsearch exits immediately, run `sudo sysctl -w vm.max_map_count=262144`.

## Installation

```bash
git clone <your-repo-url> task-manager
cd task-manager

docker compose up -d            # MongoDB + Redis + Elasticsearch
docker compose ps               # wait until all three show "healthy"

cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

## Running the Backend

```bash
cd backend
npm run dev        # auto-restarts on change; use `npm start` for plain run
```
Look for: `[mongo] connected`, `[redis] connected`, `[elasticsearch] index ready`, then `GraphQL ready at http://localhost:4000/graphql`.
Health check: http://localhost:4000/health. In development, opening `/graphql` in a browser shows Apollo Sandbox for trying queries.

## Running the Frontend

```bash
cd frontend
npm run dev        # http://localhost:5173
```

## GraphQL API

All task operations need the header `Authorization: Bearer <token>`.

```graphql
# Register (returns token + user)
mutation { register(name: "Ami", email: "ami@example.com", password: "password123") { token user { id name email } } }

# Login
mutation { login(email: "ami@example.com", password: "password123") { token user { id name } } }

# Current user
query { me { id name email } }

# Create
mutation { createTask(input: { title: "Write report", description: "Q3 numbers" }) { id title completed createdAt } }

# List (Redis cached; getTasks returns a TaskList object)
query { getTasks { tasks { id title description completed createdAt updatedAt } } }

# Update (any of title, description, completed)
mutation { updateTask(id: "TASK_ID", input: { completed: true }) { id completed updatedAt } }

# Delete
mutation { deleteTask(id: "TASK_ID") { id } }

# Search (Elasticsearch)
query { searchTasks(query: "report") { id title description } }
```

Error codes (in `errors[0].extensions.code`): `UNAUTHENTICATED`, `BAD_USER_INPUT` (with a `fields` object), `NOT_FOUND`, `SERVICE_UNAVAILABLE`.

## Authentication

1. `register` or `login` checks the input, then returns a signed **JWT** containing the user id (`sub`) and an expiry.
2. Passwords are hashed with bcrypt (10 rounds). They are never stored or returned in plain text, and the hash is excluded from queries by default.
3. The frontend stores the token in `localStorage` and sends it on every request as `Authorization: Bearer <token>`.
4. For each request the server verifies the signature and expiry. A valid token gives `context.user`; otherwise `context.user` is `null`.
5. Every task resolver starts with `requireAuth(context)`, which throws `UNAUTHENTICATED` if there is no user.
6. **Authorization:** every database query includes the logged-in user's id (`{ _id, userId }`). Someone else's task simply is not found, so users cannot read, edit or delete each other's tasks, and cannot learn that those tasks exist.
7. Login uses one generic error for wrong email and wrong password, so attackers cannot discover which emails are registered.

## Redis Caching

| Item | Value |
|---|---|
| Key | `tasks:user:<userId>` (one per user) |
| Value | JSON array of the user's tasks |
| TTL | 600 seconds (10 minutes), set with `EX` |

- **Cache hit:** `getTasks` finds the key in Redis and returns it. MongoDB is not touched.
- **Cache miss:** it reads MongoDB, saves the result in Redis with the TTL, and returns it.
- **Invalidation:** `createTask`, `updateTask` and `deleteTask` delete the user's key after a successful write. Without this, a user could add a task and still see the old list for up to 10 minutes.
- **Redis down:** the client does not queue commands, so calls fail fast, are logged, and the app reads from MongoDB.

Try it: run `getTasks` twice, then `docker compose exec redis redis-cli` and `GET tasks:user:<id>` / `TTL tasks:user:<id>`. Create a task and the key disappears.

## Elasticsearch

- **Document id = MongoDB task id**, so the two always line up.
- **Indexing:** `createTask` indexes the new task. **Updating:** `updateTask` re-indexes it (same id replaces the document). **Deleting:** `deleteTask` removes the document.
- **Searching:** `searchTasks` queries the `title` (boosted x2) and `description` fields with typo tolerance and partial-word matching, filtered by the user's id so results are private.
- Writes use `refresh: wait_for`, so a task is searchable right after the mutation returns.
- **Resync:** if Elasticsearch was down during some changes, run `cd backend && npm run reindex` to rebuild the index from MongoDB.

## In-App Notifications and Reminders

The app includes a notification flow for tasks that are approaching their due time or are overdue. Reminder processing creates user-specific notification records in MongoDB, and the frontend provides an inbox where a signed-in user can view notifications and mark them as read. Notification queries and updates are protected and scoped to the current user.

Email reminders are optional and require valid SMTP configuration in the backend environment. Without SMTP settings, use the in-app notification inbox; do not assume email delivery is active.

## Error Handling

- Input is validated on the frontend (instant feedback) and again on the backend (never trust the client). Failures return `BAD_USER_INPUT` with a readable message.
- Missing or invalid token gives `UNAUTHENTICATED`; the frontend then logs the user out.
- Unknown id, invalid id, or another user's task gives `NOT_FOUND` / `BAD_USER_INPUT`.
- Redis or Elasticsearch failures while writing are logged and do not fail the request (MongoDB already has the data).
- Search with Elasticsearch down returns `SERVICE_UNAVAILABLE` with a friendly message.
- In production, unexpected server errors are masked so internals are not leaked.
- Missing `.env` values stop the server at startup with a clear message.

## Testing

Backend unit tests use Node's built-in test runner and in-memory fakes, so no databases are needed:

```bash
cd backend && npm test
```

They cover: registration, login, password hashing, JWT creation and verification, tampered/expired tokens, create/get/update/delete, authorization (user B cannot touch user A's tasks), Redis hit/miss and invalidation, Redis and Elasticsearch outages, and search by title and description.

Manual end-to-end check (with Docker services running):
1. Register two users in two browsers (or one normal and one private window).
2. Add tasks as user A. Confirm user B sees none.
3. Search for a word from a title, then from a description.
4. Edit, complete and delete a task; the list and search results update.
5. Stop Redis (`docker compose stop redis`) and Elasticsearch; the list still loads, search shows a friendly error.

## Notifications and Reminders

The application supports in-app reminders for tasks that are due soon and tasks that are overdue. Notifications are stored in MongoDB and scoped to the authenticated user.

- **Due soon:** creates a `DUE_SOON` notification for an approaching task deadline.
- **Overdue:** creates an `OVERDUE` notification for a task whose deadline has passed.
- **Inbox:** the frontend displays notifications and supports marking them as read.
- **Duplicate prevention:** stable reminder keys prevent the same reminder event from being inserted repeatedly.
- **Email:** delivery is optional and requires SMTP configuration. It is not enabled automatically when SMTP settings are absent.

To verify notifications, log in to the frontend and use Apollo Sandbox at `http://localhost:4000/graphql` with the request header `Authorization: Bearer <your-token>`:

```graphql
query {
  notifications(unreadOnly: false) {
    id
    title
    message
    type
    readAt
  }
}
```

Never commit real JWTs, SMTP passwords, or `.env` files. Use the example environment files as templates.

## GitHub Setup

```bash
git init
git add .
git commit -m "Task management app: GraphQL, MongoDB, Redis, Elasticsearch, React"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

## Design Decisions

- **GraphQL:** the UI asks for exactly the fields it needs through one endpoint, and the schema documents the API.
- **Apollo Server + Express:** Express gives the standard Node server and a `/health` route; Apollo gives validation, errors and tooling.
- **Service layer with injected dependencies:** keeps resolvers thin and makes testing simple.
- **Cache the full task list per user and invalidate on write:** simple and always correct. Filtering and sorting happen in the browser, so one cache entry serves every view.
- **Direct sync to Elasticsearch on each mutation** (an option the assignment allows) instead of a background worker: simpler and instant. A `reindex` script covers missed syncs.
- **Elasticsearch instead of MongoDB text search:** better ranking, typo tolerance and partial matching, and it keeps heavy search work off the main database.
- **Redis and Elasticsearch are best-effort:** they speed things up but are not the source of truth, so their failure should not stop users from saving tasks.
- **JWT in localStorage:** simple for a single-page app. Trade-off: scripts on the page could read it, so a production app might prefer httpOnly cookies.
- **Context API for auth:** only the user and login state are shared, so Redux would be overkill.
- **Apollo Client with `refetchQueries`:** after any change the visible list is reloaded from the server, so the UI never drifts.
- **Implemented extension:** in-app due-soon and overdue notifications are included. Email delivery depends on optional SMTP configuration. Further possible extensions include pagination, task priorities, and profile management.

## Assessment Checklist

| Requirement | Implemented? | Where |
|---|---|---|
| Node.js + Express server | Yes | `backend/src/app.js`, `server.js` |
| GraphQL API (Apollo Server) | Yes | `backend/src/graphql/` |
| JWT authentication | Yes | `backend/src/auth/`, `services/authService.js` |
| Registration and login | Yes | `authService.js`, `LoginPage.jsx`, `RegisterPage.jsx` |
| MongoDB + Mongoose | Yes | `backend/src/models/`, `config/db.js` |
| Task model: title, description, completed, userId (ObjectId ref), createdAt, updatedAt | Yes | `models/Task.js` |
| Redis cache for task list, per user | Yes | `redis/taskCache.js`, `taskService.getTasks` |
| Cache expiry (10 min) | Yes | `REDIS_TASKS_TTL_SECONDS=600`, `EX` in `taskCache.set` |
| Cache invalidation | Yes | `taskService` create/update/delete call `cache.invalidate` |
| Elasticsearch search by title and description | Yes | `elasticsearch/taskSearch.js` |
| Sync on create / update / delete | Yes | `taskService.js` (index / re-index / remove), `scripts/reindex.js` |
| `createTask` | Yes | `resolvers/task.js` |
| `getTasks` (Redis when available) | Yes | `resolvers/task.js`, `taskService.js` |
| `updateTask` (title, description, completed) | Yes | `resolvers/task.js` |
| `deleteTask` (Mongo + Elasticsearch) | Yes | `taskService.deleteTask` |
| `searchTasks` via Elasticsearch | Yes | `taskService.searchTasks` |
| User only sees own tasks | Yes | `ownedBy()` filter and `userId` in queries |
| React.js app | Yes | `frontend/` |
| Login and registration pages | Yes | `frontend/src/pages/` |
| Task list from GraphQL | Yes | `DashboardPage.jsx`, `graphql/operations.js` |
| Add task form (title, description) | Yes | `TaskForm.jsx` |
| Edit, delete, mark completed | Yes | `TaskItem.jsx` |
| Search UI using `searchTasks` | Yes | `TaskToolbar.jsx`, `DashboardPage.jsx` |
| Context API for auth state | Yes | `context/AuthContext.jsx` |
| Filter / sort by completion status | Yes | `TaskToolbar.jsx` |
| Responsive design (Tailwind) | Yes | Tailwind classes throughout |
| Form validation and error handling | Yes | `utils/validation.js`, `validators.js` |
| Setup docs incl. Redis and Elasticsearch | Yes | This README, `docker-compose.yml` |
| Documented decisions | Yes | Design Decisions section |
| In-app due-soon / overdue notifications | Yes | Notification model/service and frontend notification inbox |
| Email reminders | Optional configuration | Requires valid SMTP settings; not enabled by default |
| Pagination / priorities | Not documented as implemented | Optional future extensions |
