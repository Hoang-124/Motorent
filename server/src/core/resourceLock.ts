import crypto from 'crypto';
import mongoose from 'mongoose';

const localLocks = new Map<string, Promise<void>>();
let ttlIndexEnsured = false;

const LOCK_COLLECTION = 'resourcelocks';
const DEFAULT_LEASE_MS = 15_000;
const RETRY_DELAY_MS = 60;
const MAX_WAIT_MS = 12_000;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const ensureDistributedIndex = async (): Promise<void> => {
  if (ttlIndexEnsured || mongoose.connection.readyState !== 1 || !mongoose.connection.db) return;
  try {
    await mongoose.connection.db
      .collection(LOCK_COLLECTION)
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, background: true });
    ttlIndexEnsured = true;
  } catch {
    // Non-fatal if index already exists or permissions restricted
  }
};

const acquireDistributedLease = async (key: string, owner: string): Promise<boolean> => {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    return false;
  }
  await ensureDistributedIndex();
  const col = mongoose.connection.db.collection<{ _id: string; owner: string; expiresAt: Date }>(LOCK_COLLECTION);
  const deadline = Date.now() + MAX_WAIT_MS;

  while (Date.now() < deadline) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + DEFAULT_LEASE_MS);
    try {
      const res = await col.updateOne(
        {
          _id: key,
          $or: [{ expiresAt: { $lte: now } }, { owner }],
        },
        {
          $set: { owner, expiresAt, updatedAt: now },
        },
        { upsert: true }
      );
      if (res.modifiedCount > 0 || res.upsertedCount > 0) {
        return true;
      }
    } catch (err: unknown) {
      const code = typeof err === 'object' && err !== null && 'code' in err ? (err as { code?: number }).code : 0;
      // E11000 duplicate key means another Node instance currently holds the active lease
      if (code !== 11000) {
        return false;
      }
    }
    await sleep(RETRY_DELAY_MS);
  }
  throw new Error(`Hệ thống đang xử lý giao dịch khác trên tài nguyên (${key}). Vui lòng thử lại sau giây lát.`);
};

const releaseDistributedLease = async (key: string, owner: string): Promise<void> => {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) return;
  try {
    await mongoose.connection.db
      .collection<{ _id: string; owner: string }>(LOCK_COLLECTION)
      .deleteOne({ _id: key, owner });
  } catch {
    // Lease expires automatically via TTL if connection drops
  }
};

/**
 * Dual-layer concurrency lock:
 * 1. Fast FIFO in-memory promise queue for concurrent requests on the same Node process.
 * 2. Distributed MongoDB atomic TTL lease lock across horizontal server instances when DB is active.
 */
export const withResourceLock = async <T>(key: string, task: () => Promise<T>): Promise<T> => {
  const previous = localLocks.get(key) ?? Promise.resolve();
  let releaseLocal!: () => void;
  const pending = new Promise<void>((resolve) => {
    releaseLocal = resolve;
  });
  const chained = previous.then(() => pending);
  localLocks.set(key, chained);

  await previous;
  const owner = crypto.randomUUID();
  let hasDistributedLease = false;

  try {
    hasDistributedLease = await acquireDistributedLease(key, owner);
    return await task();
  } finally {
    if (hasDistributedLease) {
      await releaseDistributedLease(key, owner);
    }
    releaseLocal();
    if (localLocks.get(key) === chained) {
      localLocks.delete(key);
    }
  }
};
