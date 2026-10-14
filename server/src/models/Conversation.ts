import mongoose, { Document, Schema } from 'mongoose';

export type ConversationStatus = 'Open' | 'Closed';

export interface IConversation extends Document {
  participants: mongoose.Types.ObjectId[];
  customerId: mongoose.Types.ObjectId;
  assignedStaffId?: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  status: ConversationStatus;
  lastMessageId?: mongoose.Types.ObjectId;
  lastMessageText?: string;
  lastMessageAt?: Date;
  unreadCustomerCount: number;
  unreadStaffCount: number;
  closedAt?: Date;
  closedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedStaffId: { type: Schema.Types.ObjectId, ref: 'User' },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
    status: { type: String, enum: ['Open', 'Closed'], default: 'Open' },
    lastMessageId: { type: Schema.Types.ObjectId, ref: 'Message' },
    lastMessageText: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now },
    unreadCustomerCount: { type: Number, default: 0 },
    unreadStaffCount: { type: Number, default: 0 },
    closedAt: { type: Date },
    closedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

ConversationSchema.index({ customerId: 1, status: 1 });
ConversationSchema.index({ branchId: 1, status: 1 });
ConversationSchema.index({ assignedStaffId: 1, status: 1 });
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ lastMessageAt: -1 });

export const Conversation = mongoose.model<IConversation>(
  'Conversation',
  ConversationSchema
);
