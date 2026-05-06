// Simple in-process async mutex. Sufficient for the claim-a-record path
// because Vercel will usually route a small app's traffic to a single warm
// instance, and 3-4 concurrent users are nowhere near triggering instance
// fan-out. If you ever scale beyond that, swap this for a Redis lock
// (e.g. Upstash) — same API.

type Resolver = () => void;

class Mutex {
  private queue: Resolver[] = [];
  private locked = false;

  async acquire(): Promise<() => void> {
    if (!this.locked) {
      this.locked = true;
      return () => this.release();
    }
    return new Promise<() => void>((resolve) => {
      this.queue.push(() => {
        this.locked = true;
        resolve(() => this.release());
      });
    });
  }

  private release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.locked = false;
    }
  }
}

const claimMutex = new Mutex();

export async function withClaimLock<T>(fn: () => Promise<T>): Promise<T> {
  const release = await claimMutex.acquire();
  try {
    return await fn();
  } finally {
    release();
  }
}
