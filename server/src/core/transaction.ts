import mongoose from 'mongoose';

const isStandaloneTransactionError = (err: unknown): boolean => {
  if (!err || typeof err !== 'object') return false;
  const record = err as { code?: number; codeName?: string; message?: string };
  if (record.code === 20 || record.codeName === 'IllegalOperation') return true;
  const msg = String(record.message || '');
  return (
    msg.includes('Transaction numbers are only allowed on a replica set member or mongos') ||
    msg.includes('transactions are not supported')
  );
};

/**
 * Runs multi-collection writes inside an ACID MongoDB transaction when connected
 * to a Replica Set / Atlas cluster, while gracefully falling back on standalone
 * local MongoDB instances or mocked unit test environments.
 */
export const withOptionalTransaction = async <T>(
  work: (session?: mongoose.ClientSession) => Promise<T>
): Promise<T> => {
  if (mongoose.connection.readyState !== 1 || typeof mongoose.startSession !== 'function') {
    return work(undefined);
  }

  let session: mongoose.ClientSession | undefined;
  try {
    session = await mongoose.startSession();
  } catch {
    return work(undefined);
  }

  try {
    session.startTransaction();
    const result = await work(session);
    await session.commitTransaction();
    return result;
  } catch (err: unknown) {
    try {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
    } catch {
      // Ignore abort errors
    }

    if (isStandaloneTransactionError(err)) {
      await session.endSession().catch(() => {});
      return work(undefined);
    }
    throw err;
  } finally {
    await session.endSession().catch(() => {});
  }
};
