# Backend Take-Home: Inherited Seat Hold API

## Overview

You are inheriting a small TypeScript API for an event seating product. Users can create temporary holds for seats before checkout. Support has reported occasional seat availability issues, especially when multiple users interact with popular seats at the same time.

Your task is to inspect the existing implementation, identify the highest-risk problems, and improve it in a focused way.

This is intentionally not a greenfield assignment. We are interested in how you read existing code, identify dangerous assumptions, make trade-offs, verify behaviour, and explain what remains unfinished.

AI tools, documentation, and normal development tooling are allowed. You are responsible for understanding and validating the final result.

## Time expectation

Aim for roughly **90–120 minutes**. You do not need to solve every possible production issue. Prefer a small, well-explained improvement over a broad rewrite.

## Product rules

The API supports temporary seat holds for an event:

- A customer may hold between 1 and 8 seats at a time.
- Sold or reserved seats cannot be held.
- A seat that is currently held by another active hold cannot be held.
- Holds expire after 5 minutes.
- Hold creation should be all-or-nothing: either all requested seats are held, or none are.
- The API should return meaningful conflict responses when requested seats are unavailable.
- The system should behave sensibly if a client retries a request after a timeout.

The most important invariant is:

> Two active holds must never exist for the same event seat.

## Existing API

The inherited API exposes these endpoints:

```txt
GET    /health
GET    /events/:eventId/seats
POST   /events/:eventId/holds
GET    /holds/:holdId
DELETE /holds/:holdId
```

Most requests use a lightweight mock customer identity via the `x-customer-id` header.

Example hold request:

```http
POST /events/arena-01/holds
x-customer-id: customer-a
Content-Type: application/json
```

```json
{
  "seatIds": ["A-1-01", "A-1-02"],
  "idempotencyKey": "optional-client-generated-key"
}
```

## Your task

Please submit a repository or zip containing your changes.

You should:

1. Inspect the current implementation and identify the highest-risk issues.
2. Fix at least one important issue affecting correctness or reliability. Prioritise the double-hold / concurrency class of problems if you can.
3. Add or update automated tests that prove the behaviour you changed.
4. Add a short `CANDIDATE_NOTES.md` explaining:
   - what you found,
   - what you changed,
   - which trade-offs you made,
   - what remains unsafe or incomplete,
   - what you would change for a production system with multiple API instances.

Do not feel obligated to rewrite the entire app or introduce a real database. If you do introduce new dependencies, explain why.

## Runtime

Recommended Node.js version: 20 LTS or newer.

This package includes a `package-lock.json`, and the current test tooling expects Node.js 20.19.0 or newer, or Node.js 22.12.0 or newer. If you use a different runtime version, please mention it in your notes.

## Setup

```bash
npm install
npm test
npm run dev
```

Examples use npm because this package includes a `package-lock.json`. `pnpm`, `yarn`, or another package manager is also fine if you prefer it.

The API starts on port `3000` by default.

```bash
curl http://localhost:3000/health
curl http://localhost:3000/events/arena-01/seats
```

## Evaluation criteria

We will primarily evaluate:

- Correctness of the seat-hold rules.
- Handling of concurrent or repeated requests.
- Quality and focus of the investigation.
- Automated tests for the important behaviour.
- Clarity of trade-offs and production notes.
- Ability to explain your decisions in a follow-up discussion.

We care less about visual polish, framework preferences, or adding many features. A small, safe, well-tested change is better than a broad rewrite with unclear correctness.
