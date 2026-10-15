import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Send,
  UserCheck,
  CheckCircle2,
  RotateCcw,
  MessageSquare,
  Phone,
  Mail,
  Clock,
  CheckCheck,
  RefreshCw,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../services/api';
import { getChatSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import type { ChatConversation, ChatMessage, ChatSender, Branch } from '../types';

const STAFF_QUICK_REPLIES = [
  'Dạ Motorent đã xác nhận giao dịch cọc VietQR và khóa biển số xe riêng cho bạn rồi ạ!',
  'Nhân viên điều phối đã chuẩn bị xong xe kèm 02 mũ bảo hiểm khử khuẩn UV tại quầy giao nhận.',
  'Hồ sơ định danh eKYC của bạn đã được phê duyệt. Bạn không cần để lại CCCD gốc khi nhận xe nhé!',
  'Bạn có thể trả xe linh hoạt tại chi nhánh Sân bay hoặc Biển Mỹ Khê hoàn toàn miễn phí phụ thu ạ.',
];

export const StaffChatConsole: React.FC = () => {
  const { user } = useAuth();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [adminBranchId, setAdminBranchId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'Open' | 'Closed' | 'All'>('Open');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [replyText, setReplyText] = useState<string>('');
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [typingCustomer, setTypingCustomer] = useState<string>('');
  const [feedbackBanner, setFeedbackBanner] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    api
      .get('/branches')
      .then((res) => {
        const list: Branch[] = res.data?.data || [];
        setBranches(list);
        if (list.length > 0 && !adminBranchId) {
          setAdminBranchId(list[0]._id);
        }
      })
      .catch(() => {});
  }, [adminBranchId]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  }, []);

  const fetchConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      const branchQuery =
        user?.roles === 'SystemAdmin' && adminBranchId ? `&branchId=${adminBranchId}` : '';
      const res = await api.get(
        `/chat/staff/conversations?status=${statusFilter}${branchQuery}`
      );
      const items: ChatConversation[] = res.data?.data?.items || [];
      setConversations(items);

      setSelectedConv((prev) => {
        if (prev) {
          const found = items.find((c) => c._id === prev._id);
          if (found) return found;
        }
        return items[0] || null;
      });
    } catch (err) {
      console.error('Không thể tải danh sách hội thoại khách hàng:', err);
    } finally {
      setLoadingList(false);
    }
  }, [statusFilter, user?.roles, adminBranchId]);

  const fetchMessagesForConv = useCallback(
    async (convId: string) => {
      setLoadingMessages(true);
      try {
        const res = await api.get(`/chat/${convId}/messages?limit=80`);
        const list: ChatMessage[] = res.data?.data?.messages || [];
        setMessages(list);
        scrollToBottom();

        // Mark as read by staff
        await api.put(`/chat/${convId}/read`);
        setConversations((prev) =>
          prev.map((c) => (c._id === convId ? { ...c, unreadStaffCount: 0 } : c))
        );
      } catch (err) {
        console.error('Không thể tải lịch sử tin nhắn:', err);
      } finally {
        setLoadingMessages(false);
      }
    },
    [scrollToBottom]
  );

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedConv?._id) {
      fetchMessagesForConv(selectedConv._id);
    } else {
      setMessages([]);
    }
  }, [selectedConv?._id, fetchMessagesForConv]);

  // Connect to Socket.IO /chat namespace and join branch-scoped room + selected conversation
  useEffect(() => {
    const socket = getChatSocket();
    const activeConvId = selectedConv?._id;

    const handleConnect = () => {
      setSocketConnected(true);
      if (user?.roles === 'SystemAdmin' && adminBranchId) {
        socket.emit('join_staff_console', adminBranchId);
      } else {
        socket.emit('join_staff_console');
      }
      if (activeConvId) {
        socket.emit('join_conversation', activeConvId);
      }
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
    };

    const handleReceive = (newMsg: ChatMessage) => {
      // Update active chat window if matching conversation
      if (activeConvId && newMsg.conversationId === activeConvId) {
        setMessages((prev) => {
          if (
            prev.some(
              (m) =>
                m._id === newMsg._id ||
                (newMsg.clientMsgId && m.clientMsgId === newMsg.clientMsgId)
            )
          ) {
            return prev.map((m) =>
              newMsg.clientMsgId && m.clientMsgId === newMsg.clientMsgId ? newMsg : m
            );
          }
          return [...prev, newMsg];
        });
        scrollToBottom();

        const senderIdStr =
          typeof newMsg.senderId === 'object' ? newMsg.senderId._id : String(newMsg.senderId);
        if (senderIdStr !== user?._id) {
          api.put(`/chat/${activeConvId}/read`).catch(() => {});
        }
      }
    };

    const handleConvUpdated = (updatedConv: ChatConversation) => {
      if (!updatedConv?._id) return;
      setConversations((prev) => {
        const exists = prev.some((c) => c._id === updatedConv._id);
        if (!exists) {
          return [updatedConv, ...prev];
        }
        return prev
          .map((c) =>
            c._id === updatedConv._id
              ? {
                  ...updatedConv,
                  unreadStaffCount:
                    activeConvId === updatedConv._id ? 0 : updatedConv.unreadStaffCount,
                }
              : c
          )
          .sort(
            (a, b) =>
              new Date(b.lastMessageAt || b.updatedAt).getTime() -
              new Date(a.lastMessageAt || a.updatedAt).getTime()
          );
      });

      if (activeConvId === updatedConv._id) {
        setSelectedConv((prev) => (prev ? { ...updatedConv, unreadStaffCount: 0 } : updatedConv));
      }
    };

    const handleTyping = (payload: {
      conversationId?: string;
      userId: string;
      username: string;
      isTyping: boolean;
    }) => {
      if (payload.userId === user?._id) return;
      if (activeConvId && payload.conversationId === activeConvId) {
        if (payload.isTyping) {
          setTypingCustomer(payload.username || 'Khách hàng');
          if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
          typingTimerRef.current = window.setTimeout(() => {
            setTypingCustomer('');
          }, 3000);
        } else {
          setTypingCustomer('');
        }
      }
    };

    if (socket.connected) {
      handleConnect();
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('chat:receive', handleReceive);
    socket.on('chat:conversation_updated', handleConvUpdated);
    socket.on('chat:typing', handleTyping);

    return () => {
      if (activeConvId) {
        socket.emit('leave_conversation', activeConvId);
      }
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('chat:receive', handleReceive);
      socket.off('chat:conversation_updated', handleConvUpdated);
      socket.off('chat:typing', handleTyping);
    };
  }, [selectedConv?._id, user?._id, scrollToBottom]);

  const handleReplyInput = (val: string) => {
    setReplyText(val);
    if (selectedConv?._id && socketConnected) {
      const socket = getChatSocket();
      socket.emit('chat:typing', {
        conversationId: selectedConv._id,
        isTyping: val.trim().length > 0,
      });
    }
  };

  const handleSendReply = async (customText?: string) => {
    const content = (customText ?? replyText).trim();
    if (!content || !selectedConv?._id || !user || sending) return;

    const clientMsgId = `staff_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    if (!customText) {
      setReplyText('');
    }
    setSending(true);

    const optimistic: ChatMessage = {
      _id: clientMsgId,
      conversationId: selectedConv._id,
      senderId: {
        _id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
      },
      clientMsgId,
      content,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);
    scrollToBottom();

    try {
      const res = await api.post(`/chat/${selectedConv._id}/messages`, {
        content,
        clientMsgId,
      });
      const saved: ChatMessage = res.data?.data;
      if (saved) {
        setMessages((prev) =>
          prev.map((m) => (m.clientMsgId === clientMsgId || m._id === saved._id ? saved : m))
        );
      }
      setConversations((prev) =>
        prev.map((c) =>
          c._id === selectedConv._id
            ? {
                ...c,
                status: 'Open',
                lastMessageText: content.slice(0, 100),
                lastMessageAt: new Date().toISOString(),
                unreadStaffCount: 0,
              }
            : c
        )
      );
    } catch (err) {
      console.error('Lỗi gửi phản hồi khách hàng:', err);
    } finally {
      setSending(false);
    }
  };

  const handleClaim = async () => {
    if (!selectedConv?._id || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await api.put(`/chat/${selectedConv._id}/claim`);
      if (res.data?.data) {
        setSelectedConv(res.data.data);
        setConversations((prev) =>
          prev.map((c) => (c._id === selectedConv._id ? res.data.data : c))
        );
        setFeedbackBanner('Đã nhận phụ trách phiên hỗ trợ khách hàng này.');
        setTimeout(() => setFeedbackBanner(''), 3000);
      }
    } catch (err) {
      console.error('Lỗi nhận phụ trách:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleCloseReopen = async () => {
    if (!selectedConv?._id || actionLoading) return;
    setActionLoading(true);
    try {
      const endpoint =
        selectedConv.status === 'Open'
          ? `/chat/${selectedConv._id}/close`
          : `/chat/${selectedConv._id}/reopen`;
      const res = await api.put(endpoint);
      if (res.data?.data) {
        const updated: ChatConversation = res.data.data;
        setSelectedConv(updated);
        setConversations((prev) =>
          prev.map((c) => (c._id === updated._id ? updated : c))
        );
        setFeedbackBanner(
          updated.status === 'Closed'
            ? 'Đã đóng phiên hỗ trợ.'
            : 'Đã mở lại phiên hỗ trợ khách hàng.'
        );
        setTimeout(() => setFeedbackBanner(''), 3000);
      }
    } catch (err) {
      console.error('Lỗi cập nhật trạng thái hội thoại:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const getCustomerInfo = (conv: ChatConversation): ChatSender => {
    if (typeof conv.customerId === 'object' && conv.customerId !== null) {
      return conv.customerId as ChatSender;
    }
    return { _id: String(conv.customerId), username: 'Khách hàng' };
  };

  const getStaffInfo = (conv: ChatConversation): ChatSender | null => {
    if (conv.assignedStaffId && typeof conv.assignedStaffId === 'object') {
      return conv.assignedStaffId as ChatSender;
    }
    return null;
  };

  const getBranchInfo = (conv: ChatConversation): Branch | null => {
    if (conv.branchId && typeof conv.branchId === 'object') {
      return conv.branchId as Branch;
    }
    return null;
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const cust = getCustomerInfo(c);
    const fullName = `${cust.lastName || ''} ${cust.firstName || ''} ${cust.username || ''}`.toLowerCase();
    const phone = (cust.phoneNumber || '').toLowerCase();
    const preview = (c.lastMessageText || '').toLowerCase();
    return fullName.includes(q) || phone.includes(q) || preview.includes(q);
  });

  const activeCustomer = selectedConv ? getCustomerInfo(selectedConv) : null;
  const activeStaff = selectedConv ? getStaffInfo(selectedConv) : null;
  const activeBranch = selectedConv ? getBranchInfo(selectedConv) : null;
  const staffOwnBranch =
    user?.branchId && branches.length > 0
      ? branches.find((b) => b._id === String(user.branchId)) || activeBranch
      : activeBranch;

  return (
    <div className="bg-[#161616] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
      {/* Top Status Banner */}
      <div className="px-6 py-4 bg-[#101010] border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#FFC799]">
              UC-66 • {staffOwnBranch ? staffOwnBranch.name.toUpperCase() : 'STAFF LIVE CHAT CONSOLE'}
            </span>
            <span
              className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                socketConnected
                  ? 'bg-[#FFC799]/15 text-[#FFC799] border border-[#FFC799]/30'
                  : 'bg-[#FFC799]/12 text-[#FFC799] border border-[#FFC799]/30'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  socketConnected ? 'bg-[#99FFE4] animate-pulse' : 'bg-[#FFC799]'
                }`}
              />
              <span>{socketConnected ? 'SOCKET.IO /CHAT ONLINE' : 'CONNECTING...'}</span>
            </span>
          </div>
          <h2 className="text-lg font-black text-[#F5F5F5] mt-0.5">
            {staffOwnBranch
              ? `Hộp thư Khách hàng — ${staffOwnBranch.name}`
              : 'Tổng đài Trực tuyến & Phản hồi Khách hàng'}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {user?.roles === 'SystemAdmin' && branches.length > 0 && (
            <select
              value={adminBranchId}
              onChange={(e) => setAdminBranchId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#161616] border border-white/15 text-xs font-bold text-[#FFC799] outline-none"
            >
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          {(['Open', 'Closed', 'All'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === tab
                  ? 'bg-[#FFC799] text-[#101010] font-black'
                  : 'bg-[#161616] border border-white/10 text-[#6E6E6E] hover:text-[#F5F5F5]'
              }`}
            >
              {tab === 'Open' ? 'Đang mở' : tab === 'Closed' ? 'Đã đóng' : 'Tất cả'}
            </button>
          ))}
          <button
            type="button"
            onClick={fetchConversations}
            className="p-2 rounded-xl bg-[#161616] hover:bg-white/[0.08] border border-white/10 text-[#C8C2B8] transition-colors cursor-pointer"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin text-[#FFC799]' : ''}`} />
          </button>
        </div>
      </div>

      {feedbackBanner && (
        <div className="px-6 py-2.5 bg-[#FFC799]/15 border-b border-[#FFC799]/30 text-[#FFC799] text-xs font-bold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedbackBanner}</span>
        </div>
      )}

      {/* 12-Column Console Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
        {/* LEFT COLUMN (4 cols): Conversation Queue */}
        <div className="lg:col-span-4 border-r border-white/10 bg-[#101010]/50 flex flex-col">
          {/* Search Input */}
          <div className="p-3.5 border-b border-white/10">
            <div className="relative">
              <Search className="w-4 h-4 text-[#6E6E6E] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm tên khách, SĐT, nội dung..."
                className="w-full bg-[#161616] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-[#F5F5F5] placeholder-[#6E6E6E] outline-none focus:border-[#FFC799]"
              />
            </div>
          </div>

          {/* Thread List */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.06] max-h-[540px]">
            {loadingList && conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#6E6E6E]">
                Đang tải danh sách hội thoại...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <MessageSquare className="w-8 h-8 text-[#6E6E6E] mx-auto" />
                <p className="text-xs font-bold text-[#C8C2B8]">Không có hội thoại nào</p>
                <p className="text-[11px] text-[#6E6E6E]">
                  Các tin nhắn mới từ khách hàng sẽ hiển thị tức thì tại đây qua Socket.IO.
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const cust = getCustomerInfo(conv);
                const staff = getStaffInfo(conv);
                const branch = getBranchInfo(conv);
                const isSelected = selectedConv?._id === conv._id;
                const displayName =
                  [cust.lastName, cust.firstName].filter(Boolean).join(' ') || cust.username;

                return (
                  <button
                    key={conv._id}
                    type="button"
                    onClick={() => setSelectedConv(conv)}
                    className={`w-full p-4 text-left transition-all cursor-pointer flex flex-col space-y-2 ${
                      isSelected
                        ? 'bg-[#FFC799]/10 border-l-2 border-l-[#FFC799]'
                        : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-black text-[#F5F5F5]">{displayName}</span>
                          {conv.unreadStaffCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-[#FF8080] text-[#101010] font-mono text-[10px] font-black">
                              {conv.unreadStaffCount} mới
                            </span>
                          )}
                        </div>
                        {cust.phoneNumber && (
                          <span className="text-[11px] font-mono text-[#6E6E6E] block mt-0.5">
                            {cust.phoneNumber}
                          </span>
                        )}
                      </div>

                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          conv.status === 'Open'
                            ? 'bg-[#FFC799]/15 text-[#FFC799]'
                            : 'bg-white/10 text-[#6E6E6E]'
                        }`}
                      >
                        {conv.status === 'Open' ? 'OPEN' : 'CLOSED'}
                      </span>
                    </div>

                    <p className="text-xs text-[#C8C2B8] line-clamp-2 leading-relaxed">
                      {conv.lastMessageText || 'Chưa có tin nhắn'}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-[#6E6E6E] pt-1">
                      <span className="truncate max-w-[160px]">
                        {staff
                          ? `Phụ trách: ${[staff.lastName, staff.firstName].filter(Boolean).join(' ') || staff.username}`
                          : branch
                            ? branch.name
                            : 'Chưa phân công'}
                      </span>
                      <span>
                        {conv.lastMessageAt
                          ? new Date(conv.lastMessageAt).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (8 cols): Active Conversation History & Reply Console */}
        <div className="lg:col-span-8 flex flex-col bg-[#161616]">
          {!selectedConv || !activeCustomer ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-3">
              <MessageSquare className="w-10 h-10 text-[#6E6E6E]" />
              <h3 className="text-sm font-bold text-[#F5F5F5]">
                Chọn một cuộc trò chuyện từ danh sách bên trái
              </h3>
              <p className="text-xs text-[#6E6E6E] max-w-sm">
                Xem toàn bộ lịch sử tư vấn, nhận phụ trách (Claim) và phản hồi khách hàng theo thời gian thực qua Socket.IO.
              </p>
            </div>
          ) : (
            <>
              {/* Conversation Customer Header */}
              <div className="p-4 bg-[#0D1311] border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2.5">
                    <h3 className="text-sm font-black text-[#F5F5F5]">
                      {[activeCustomer.lastName, activeCustomer.firstName]
                        .filter(Boolean)
                        .join(' ') || activeCustomer.username}
                    </h3>
                    <span className="px-2 py-0.5 rounded bg-[#FFC799]/15 text-[#FFC799] font-mono text-[10px] font-bold">
                      KHÁCH HÀNG
                    </span>
                    {activeBranch && (
                      <span className="inline-flex items-center space-x-1 text-[11px] text-[#FFC799]">
                        <MapPin className="w-3 h-3" />
                        <span>{activeBranch.name}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#6E6E6E]">
                    {activeCustomer.phoneNumber && (
                      <span className="inline-flex items-center space-x-1 font-mono">
                        <Phone className="w-3 h-3 text-[#FFC799]" />
                        <span>{activeCustomer.phoneNumber}</span>
                      </span>
                    )}
                    {activeCustomer.email && (
                      <span className="inline-flex items-center space-x-1">
                        <Mail className="w-3 h-3 text-[#FFC799]" />
                        <span>{activeCustomer.email}</span>
                      </span>
                    )}
                    <span className="inline-flex items-center space-x-1">
                      <ShieldCheck className="w-3 h-3 text-[#FFC799]" />
                      <span>
                        Điều phối:{' '}
                        <strong className="text-[#F5F5F5]">
                          {activeStaff
                            ? [activeStaff.lastName, activeStaff.firstName]
                                .filter(Boolean)
                                .join(' ') || activeStaff.username
                            : 'Chưa gán'}
                        </strong>
                      </span>
                    </span>
                  </div>
                </div>

                {/* Staff Actions: Claim & Close/Reopen */}
                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleClaim}
                    className="px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-bold text-[#F5F5F5] flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-[#FFC799]" />
                    <span>Nhận phụ trách</span>
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleToggleCloseReopen}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                      selectedConv.status === 'Open'
                        ? 'bg-[#FF8080]/12 hover:bg-[#FF8080]/20 border-[#FF8080]/30 text-[#FF8080]'
                        : 'bg-[#FFC799]/10 hover:bg-[#FFC799]/20 border-[#FFC799]/30 text-[#FFC799]'
                    }`}
                  >
                    {selectedConv.status === 'Open' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Đóng phiên</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Mở lại phiên</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Message History Scroll Area */}
              <div className="flex-1 p-5 overflow-y-auto space-y-3.5 max-h-[400px] bg-[#101010]/40">
                {loadingMessages ? (
                  <div className="py-12 text-center text-xs text-[#6E6E6E]">
                    Đang tải lịch sử hội thoại...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#6E6E6E]">
                    Chưa có tin nhắn trong cuộc trò chuyện này.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const senderObj =
                      typeof msg.senderId === 'object' ? (msg.senderId as ChatSender) : null;
                    const senderIdStr = senderObj ? senderObj._id : String(msg.senderId);
                    const custIdStr = activeCustomer._id;
                    const isCustomerMsg = senderIdStr === custIdStr;
                    const senderLabel = senderObj
                      ? [senderObj.lastName, senderObj.firstName].filter(Boolean).join(' ') ||
                        senderObj.username
                      : isCustomerMsg
                        ? 'Khách hàng'
                        : 'Điều phối viên';

                    return (
                      <div
                        key={msg._id}
                        className={`flex flex-col ${isCustomerMsg ? 'items-start' : 'items-end'}`}
                      >
                        <div className="flex items-center space-x-2 mb-1 px-1">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${
                              isCustomerMsg ? 'text-[#FFC799]' : 'text-[#FFC799]'
                            }`}
                          >
                            {senderLabel} • {isCustomerMsg ? 'KHÁCH HÀNG' : 'ĐIỀU PHỐI VIÊN'}
                          </span>
                        </div>

                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                            isCustomerMsg
                              ? 'bg-[#151F1C] text-[#F5F5F5] border border-white/10 rounded-bl-sm'
                              : 'bg-[#FFC799] text-[#101010] font-medium rounded-br-sm'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        </div>

                        <div className="flex items-center space-x-1.5 mt-1 px-1 text-[10px] text-[#6E6E6E]">
                          <Clock className="w-2.5 h-2.5" />
                          <span>
                            {new Date(msg.createdAt).toLocaleString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: '2-digit',
                            })}
                          </span>
                          {!isCustomerMsg && (
                            <CheckCheck
                              className={`w-3.5 h-3.5 ${
                                msg.isRead ? 'text-[#FFC799]' : 'text-[#6E6E6E]'
                              }`}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {typingCustomer && (
                  <div className="flex items-center space-x-2 text-xs text-[#FFC799] px-2">
                    <span className="w-2 h-2 rounded-full bg-[#FFC799] animate-ping" />
                    <span>{typingCustomer} đang nhập tin nhắn...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Staff Canned Quick Replies */}
              <div className="px-4 py-2.5 bg-[#0D1311] border-t border-white/[0.06] flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-[10px] font-mono font-bold uppercase text-[#FFC799] shrink-0">
                  Phản hồi nhanh:
                </span>
                {STAFF_QUICK_REPLIES.map((tpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendReply(tpl)}
                    className="px-3 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-[11px] text-[#C8C2B8] whitespace-nowrap transition-colors cursor-pointer shrink-0"
                  >
                    {tpl.slice(0, 48)}...
                  </button>
                ))}
              </div>

              {/* Staff Reply Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendReply();
                }}
                className="p-4 bg-[#161616] border-t border-white/10 flex items-center space-x-3"
              >
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => handleReplyInput(e.target.value)}
                  placeholder="Nhập nội dung phản hồi khách hàng (Enter để gửi ngay qua Socket.IO)..."
                  className="flex-1 bg-[#101010] border border-white/15 rounded-xl px-4 py-3 text-xs text-[#F5F5F5] placeholder-[#6E6E6E] outline-none focus:border-[#FFC799]"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || sending}
                  className="px-5 py-3 rounded-xl bg-[#FFC799] hover:bg-[#FFD6B3] disabled:opacity-40 text-[#101010] font-black text-xs uppercase tracking-wider flex items-center space-x-2 transition-colors cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span>Gửi phản hồi</span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffChatConsole;
