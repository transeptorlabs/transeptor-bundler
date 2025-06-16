# `AuditLogQueue` - Bounded Buffer with Strict Backpressure

> Classic Producer–Consumer problem with a circular buffer, mutex for thread-safe writes, and semaphore for enforcing fixed capacity.

- Implementation: `./src/logger/audit/audit-queue.ts`

## Key Features

| Concept                    | Description                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------ |
| **Concurrency control**    | Producer and consumer access the ring buffer via a shared `Mutex`.                   |
| **Backpressure mechanism** | `Semaphore(bufferCapacity)` ensures that `enqueue()` **blocks** when buffer is full. |
| **Deterministic memory**   | The ring buffer has a fixed size; no overflow or elastic structures.                 |
| **Durability**             | No events are dropped — if producers can't enqueue, they wait.                       |
| **Flush scheduling**       | The worker drains at `flushIntervalMs` intervals, regardless of load.                |
| **Final flush**            | `shutdown()` drains remaining items before shutdown completes.                       |


## Mental model

```bash
                     ┌────────────────────────────┐
                     │    Producer(s)             │
                     └──────────┬─────────────────┘
                                │
                        await emptySlots.acquire()
                                │
                                ▼
                         ┌──────────────┐   bufferLock (Mutex)
                         │ Event Buffer │◄────────────┐
                         │ (Ring Buffer)│             │
                         └─────┬────────┘             │
                               │                      │
                               ▼                      │
                        enqueue(event)                │
                               │                      │
                         tail = (tail + 1) % N        │
                               │                      │
                         release bufferLock ──────────┘
                               │
                               ▼
                         ┌──────────────┐
                         │ Worker Loop  │ (drain every flushIntervalMs)
                         └────┬─────────┘
                              │
                              ▼
                         while buffer not empty:
                             - lock buffer
                             - read from head
                             - head = (head + 1) % N
                             - unlock
                             - write to auditLogWriter
                             - emptySlots.release()
```

## Future Improvements (per TODO left in module implementation)

If you decide to evolve toward the elastic hybrid model:

- Replace Semaphore.acquire() with a soft strategy (warn on pressure, flush early).
- Add a non-blocking enqueue()
- Optionally add fallback disk-based buffer for "durability under overload."
