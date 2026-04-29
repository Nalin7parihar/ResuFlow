# ResuFlow

> **Scalable Resume Processing Pipeline** — An asynchronous, event-driven system for parsing and analysing resumes at scale.

ResuFlow ingests resume uploads via a REST API, fans them out to background workers through Kafka, and returns structured candidate data — all while keeping API response times in the millisecond range.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Key Design Decisions](#key-design-decisions)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Data Models](#data-models)
- [API Reference](#api-reference)
- [Roadmap](#roadmap)

---

## Architecture Overview

```
                         ┌──────────────┐
  Client ──► HTTP ──────►│  FastAPI App  │
                         └──────┬───────┘
                                │ Produce Job
                                ▼
                         ┌──────────────┐      ┌─────────────────────┐
                         │    Kafka     │─────►│   Resume Worker(s)  │
                         │  (Producer/  │      │  (Consumer Group)   │
                         │  Consumer)   │      └────────┬────────────┘
                         └──────────────┘               │
                                │                       │ Write result
                         Dead-Letter                    ▼
                           Queue (DLQ)          ┌──────────────┐
                                                │  PostgreSQL  │
                         ┌──────────────┐       │  (results +  │
                         │    Redis     │       │   task state)│
                         │ (Task State  │       └──────────────┘
                         │  + Locking)  │
                         └──────────────┘
```




## License

This project is licensed under the MIT License.
