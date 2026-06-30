# API Reference

All protected routes expect `Authorization: Bearer <token>`.

## Auth

### `POST /api/v1/auth/register`

Creates a new user account.

Request body:

```json
{
  "email": "candidate@example.com",
  "password": "secret123"
}
```

Response: `201 Created` with a `UserResponse` body.

### `POST /api/v1/auth/login`

Authenticates a user and returns a JWT access token.

Request body:

```json
{
  "email": "candidate@example.com",
  "password": "secret123"
}
```

Response: `200 OK` with `TokenResponse`:

```json
{
  "access_token": "...",
  "token_type": "bearer"
}
```

## Users

### `POST /api/v1/users/`

Creates a user record. This is described in the code as an admin or internal-use endpoint.

### `GET /api/v1/users/me`

Returns the authenticated user profile.

### `GET /api/v1/users/`

Returns all users. Requires authentication.

### `GET /api/v1/users/{user_id}`

Returns a specific user by ID.

### `PATCH /api/v1/users/{user_id}`

Updates a user email and/or password.

### `DELETE /api/v1/users/{user_id}`

Deletes a user by ID and returns `204 No Content`.

## Resumes

### `POST /api/v1/resumes/upload`

Uploads a resume file and queues an asynchronous parsing job.

Accepted file types:

- `.pdf`
- `.docx`
- `.txt`

Response: `202 Accepted` with a `TaskResponse` body.

The returned task includes `retry_count`, which starts at `0` and increases each time the worker retries the job.

### `GET /api/v1/resumes/tasks`

Lists all tasks for the authenticated user, newest first.

### `GET /api/v1/resumes/tasks/{task_id}`

Returns a single task if it belongs to the authenticated user.

### `GET /api/v1/resumes/tasks/{task_id}/result`

Returns the parsed resume result for a completed task.

Behavior:

- `409 Conflict` if the task is not completed yet
- `403 Forbidden` if the task belongs to another user
- `404 Not Found` if no result record exists

## Retry and DLQ Behavior

- Failed worker attempts increment `tasks.retry_count`.
- The worker republishes the job to `resume-processing` until `RESUME_MAX_RETRIES` is exceeded.
- Once the retry limit is exceeded, the job is published to `resume-processing-dlq` and the task is marked `failed`.

## Error Patterns

- `401 Unauthorized` for missing or invalid bearer tokens
- `403 Forbidden` for ownership checks
- `404 Not Found` for missing users or tasks
- `409 Conflict` for duplicate users or premature result access
- `400 Bad Request` for unsupported upload file types