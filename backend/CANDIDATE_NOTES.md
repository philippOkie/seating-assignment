# Seat-hold API changes

## Failure and fix

Two requests could both finish the asynchronous availability check before either wrote its hold. Each then returned success for the same seat. The store now checks the complete basket and writes the hold in one synchronous section after the simulated I/O delay. A competing request in the same Node process sees the committed hold. A conflict rejects the entire basket.

A hold stops blocking at its five-minute expiry even if periodic cleanup has not run. The seat listing uses the same expiry boundary. Duplicate seat IDs are rejected. A retry key is scoped to event and customer. Reordering the same seats replays the existing hold; reusing the key for a different basket returns a conflict. Replaying an old key never renews the hold.

## Verification

Run with Node 22.13+ (22.x) or Node 24+:

```sh
npm ci
npm run typecheck
npm test
```

The original simultaneous HTTP request test is now enabled. Four additional regression tests cover overlapping baskets and the losing seat remaining free, concurrent idempotent retries and key scope, exact expiry before cleanup, and rejecting invalid baskets without a partial write.

All four regression tests passed locally. An additional in-process Express route check verified one 201 and one 409 for overlapping concurrent requests, retries, cancellation, reuse after cancellation, listing, the seat limit and rejection of a reserved seat. Source typechecking and that route check used locally available packages (Express 5 and Zod 4). The starter locks Express 4 and Zod 3. The exact locked HTTP suite remains unverified in this environment because Supertest was unavailable and registry access was blocked.

## Trade-offs and production design

This store is process-local and loses data on restart. Active inventory is checked at read/write time, but historical hold status can still say active until cleanup. Retry history grows without eviction. The mock identity and cancellation route would need authenticated ownership checks before deployment.

With several API instances, use a shared database transaction. Lock each requested event-seat inventory row in a deterministic order, evaluate expiry using database time, then commit the entire basket and the customer-scoped idempotency record together. Bound retry history retention. Checkout must verify ownership and an unexpired hold in the same transaction that marks seats sold. Only publish seat-change events after commit.

AI assistance was used for implementation, tests and documentation.
