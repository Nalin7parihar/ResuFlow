# Data Models

## `users`

Backed by `model/user.py`.

Fields:

- `id`: UUID primary key
- `email`: unique text field
- `password_hash`: hashed password
- `created_at`: timestamp

Relationships:

- One user has many tasks.

## `tasks`

Backed by `model/task.py`.

Fields:

- `id`: UUID primary key
- `user_id`: foreign key to `users.id`
- `task_type`: text, currently `resume_processing`
- `status`: one of `queued`, `processing`, `completed`, or `failed`
- `file_url`: path to the uploaded file on disk
- `retry_count`: integer retry counter
- `error_message`: nullable failure text
- `created_at`: timestamp
- `updated_at`: timestamp

Relationships:

- Many tasks belong to one user.
- One task has at most one resume result.

Operational meaning:

- `retry_count` is incremented by the worker on each failed attempt.
- `status` remains `queued` while the worker is still retrying.
- `status` becomes `failed` once the retry limit is exceeded and the job is moved to the DLQ.

## `resume_results`

Backed by `model/resume_result.py`.

Fields:

- `id`: UUID primary key
- `task_id`: unique foreign key to `tasks.id`
- `name`: parsed candidate name
- `email`: parsed email address
- `phone`: parsed phone number
- `skills`: PostgreSQL text array of matched skills
- `experience_years`: parsed years of experience
- `raw_text`: extracted resume text
- `created_at`: timestamp

## Pydantic Schemas

- `schema/auth.py` defines `LoginRequest` and `TokenResponse`.
- `schema/user.py` defines `UserCreate`, `UserUpdate`, and `UserResponse`.
- `schema/task.py` defines the task status enum-like literal and request/response models.
- `schema/resume_result.py` defines the resume parsing response shape.