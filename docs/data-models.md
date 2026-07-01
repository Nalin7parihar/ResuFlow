# Data Models

## `users`

Backed by `backend/model/user.py`.

Fields:

- `id`: UUID primary key
- `email`: unique text field
- `password_hash`: hashed password (bcrypt)
- `created_at`: timestamp

Relationships:

- One user has many tasks.

## `tasks`

Backed by `backend/model/task.py`.

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

Backed by `backend/model/resume_result.py`.

### Parsed Fields (LLM-extracted)

- `id`: UUID primary key
- `task_id`: unique foreign key to `tasks.id` (cascade delete)
- `name`: parsed candidate name
- `email`: parsed email address
- `phone`: parsed phone number
- `skills`: PostgreSQL text array of matched skills
- `experience_years`: parsed years of experience
- `raw_text`: extracted resume text
- `summary`: 2-3 sentence professional summary (LLM-only)
- `education`: text array of degrees/certifications (LLM-only)
- `work_experience`: JSON array of `{company, title, duration, highlights}` (LLM-only)

### Embedding

- `embedding`: pgvector `Vector(384)` — MiniLM embedding of the resume text

### RAG Analysis Fields (Gemini-powered)

- `overall_score`: integer 0-100 quality score
- `summary_verdict`: 2-3 sentence overall assessment
- `section_feedback`: JSON array of `{section, score, strengths[], weaknesses[]}`
- `suggestions`: text array of actionable improvement tips
- `ats_tips`: text array of ATS compatibility advice
- `keywords_missing`: text array of important missing industry keywords

### Metadata

- `created_at`: timestamp

## `resume_embeddings`

Managed by `langchain-postgres` PGVectorStore (not a hand-written SQLAlchemy model).

This table is auto-provisioned by `embedding_service.py` on first use via `PGEngine.ainit_vectorstore_table()`.

Fields (managed by langchain-postgres):

- `id`: document ID (set to `task_id`)
- `content`: the resume text
- `embedding`: vector column (384 dimensions)
- `metadata`: JSONB containing `task_id`, `user_id`, `name`, `email`, `skills`

Used for:

- Similarity search scoped by `user_id` via metadata filtering
- RAG retrieval during the analysis pipeline

## Pydantic Schemas

All in `backend/schema/`.

### `schema/auth.py`

- `LoginRequest` — email + password
- `TokenResponse` — access_token + token_type

### `schema/user.py`

- `UserCreate` — email + password for registration
- `UserUpdate` — optional email and/or password
- `UserResponse` — id, email, created_at

### `schema/task.py`

- Task status literal: `queued | processing | completed | failed`
- `TaskResponse` — full task state including retry_count

### `schema/resume_result.py`

- `ResumeResultCreate` — all parsed + analysis fields for insertion
- `ResumeResultResponse` — full response shape with all fields:
  - Parsed: name, email, phone, skills, experience_years, raw_text, summary, education, work_experience
  - Analysis: overall_score, summary_verdict, section_feedback, suggestions, ats_tips, keywords_missing
  - Metadata: id, task_id, created_at

## LLM-Specific Schemas

These Pydantic models drive Gemini's structured output (not persisted directly):

### `services/llm_parser.py`

- `WorkExperience` — company, title, duration, highlights
- `ParsedResume` — name, email, phone, skills, experience_years, summary, education, work_experience

### `services/resume_analyzer.py`

- `SectionFeedback` — section name, score (0-100), strengths, weaknesses
- `ResumeAnalysis` — overall_score, summary_verdict, section_feedback, suggestions, ats_tips, keywords_missing