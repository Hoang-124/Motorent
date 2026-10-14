import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
  status?: 'SUCCESS' | 'FAILED';
  statusCode?: number;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true, trim: true },
    entity: { type: String, required: true, trim: true },
    entityId: { type: String, trim: true },
    details: { type: Schema.Types.Mixed },
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
AuditLogSchema.index({ timestamp: -1 });
// Configurable TTL index: Automatically expire and purge audit logs after 365 days (1 year)
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
