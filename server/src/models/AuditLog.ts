import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  userId?: mongoose.Types.ObjectId;
  action: string;
  entity: string;
  entityId?: string;
  changes?: Record<string, unknown>;
  details?: Record<string, unknown>;
  method?: string;
  path?: string;
  status?: 'SUCCESS' | 'FAILED';
  statusCode?: number;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    action: { type: String, required: true, trim: true },
    entity: { type: String, required: true, trim: true },
    entityId: { type: String, trim: true, default: '' },
    changes: { type: Schema.Types.Mixed },
    details: { type: Schema.Types.Mixed },
    method: { type: String, trim: true, default: '' },
    path: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['SUCCESS', 'FAILED'], default: 'SUCCESS' },
    statusCode: { type: Number, default: 200 },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// High performance audit query indexes
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ entity: 1, entityId: 1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ timestamp: -1 });
// Configurable TTL index: Automatically expire and purge audit logs after 365 days (1 year)
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
