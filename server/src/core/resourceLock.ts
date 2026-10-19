// Shared by booking, inventory, transfers and maintenance in this Node process.
const locks = new Map<string, Promise<void>>();

export const withResourceLock = async <T>(key: string, task: () => Promise<T>): Promise<T> => {
  const previous = locks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  const chained = previous.then(() => pending);
  locks.set(key, chained);
  await previous;
  try { return await task(); }
  finally {
    release();
    if (locks.get(key) === chained) locks.delete(key);
  }
};
