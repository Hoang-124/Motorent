import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  clientMsgId?: string;
  content: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    clientMsgId: { type: String, trim: true },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: true }
);

MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ conversationId: 1, clientMsgId: 1 }, { sparse: true });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
