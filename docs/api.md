# API Reference

Base URL: `http://localhost:8000`

All protected routes expect `Authorization: Bearer <token>`.

---

## Health

### `GET /`

Returns service health status.

Response: `200 OK`

```json
{
  "status": "ok",
  "service": "ResuFlow"
}
```

---

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

Response: `201 Created` with `UserResponse`.

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
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer"
}
```

---

## Users

### `POST /api/v1/users/`

Creates a user record (admin/internal-use endpoint).

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

---

## Resumes

### `POST /api/v1/resumes/upload`

Uploads a resume file and queues an asynchronous processing job.

Accepted file types: `.pdf`, `.docx`, `.txt`

Response: `202 Accepted` with `TaskResponse`:

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "task_type": "resume_processing",
  "status": "queued",
  "file_url": "uploads/<user_id>/<filename>",
  "retry_count": 0,
  "error_message": null,
  "created_at": "2026-07-01T12:00:00",
  "updated_at": "2026-07-01T12:00:00"
}
```

### `GET /api/v1/resumes/tasks`

Lists all tasks for the authenticated user, newest first.

### `GET /api/v1/resumes/tasks/{task_id}`

Returns a single task if it belongs to the authenticated user.

### `GET /api/v1/resumes/tasks/{task_id}/result`

Returns the full parsed resume result including RAG analysis for a completed task.

Response: `200 OK` with `ResumeResultResponse`:

```json
{
  "id": "uuid",
  "task_id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1-555-0123",
  "skills": ["Python", "FastAPI", "PostgreSQL"],
  "experience_years": 5,
  "raw_text": "Full extracted resume text...",
  "summary": "Experienced backend engineer...",
  "education": ["B.Tech in CS — IIT Delhi (2020)"],
  "work_experience": [
    {
      "company": "Acme Corp",
      "title": "Senior Engineer",
      "duration": "Jan 2022 – Present",
      "highlights": ["Led team of 5", "Reduced latency by 40%"]
    }
  ],
  "overall_score": 72,
  "summary_verdict": "Solid technical resume with quantified achievements...",
  "section_feedback": [
    {
      "section": "Work Experience",
      "score": 80,
      "strengths": ["Quantified achievements", "Strong action verbs"],
      "weaknesses": ["Missing context for some roles"]
    }
  ],
  "suggestions": [
    "Add a professional summary section",
    "Quantify impact in bullet points",
    "Include links to portfolio or GitHub"
  ],
  "ats_tips": [
    "Use standard section headings",
    "Avoid tables and multi-column layouts"
  ],
  "keywords_missing": ["Docker", "Kubernetes", "CI/CD"],
  "created_at": "2026-07-01T12:00:05"
}
```

Behavior:

- `409 Conflict` if the task is not completed yet
- `403 Forbidden` if the task belongs to another user
- `404 Not Found` if no result record exists

---

## Worker Processing Pipeline

When the worker consumes a resume job from Kafka, it executes this pipeline:

1. **Parse** — Gemini structured extraction (name, email, phone, skills, experience, summary, education, work history). Falls back to regex if LLM fails.
2. **Save** — Insert `ResumeResult` row with parsed data.
3. **Embed** — Generate 384-dim MiniLM embedding, store in pgvector (non-critical, continues on failure).
4. **Analyse** — RAG pipeline: retrieve from pgvector → Gemini generates overall score, section feedback, suggestions, ATS tips, missing keywords (non-critical, continues on failure).
5. **Update** — Enrich `ResumeResult` row with analysis fields, mark task `completed`.

## Retry and DLQ Behavior

- Failed worker attempts increment `tasks.retry_count`.
- The worker republishes the job to `resume-processing` until `RESUME_MAX_RETRIES` is exceeded.
- Once the retry limit is exceeded, the job is published to `resume-processing-dlq` and the task is marked `failed`.
- Embedding and analysis failures are **non-critical** — the parsed result is still saved and the task completes.

## Error Patterns

- `401 Unauthorized` — missing or invalid bearer tokens
- `403 Forbidden` — ownership checks
- `404 Not Found` — missing users or tasks
- `409 Conflict` — duplicate users or premature result access
- `400 Bad Request` — unsupported upload file types