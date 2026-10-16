import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  MessageSquare,
  X,
  Send,
  Headphones,
  CheckCheck,
  Clock,
  LogIn,
  ArrowUpRight,
  RefreshCw,
  UserCheck,
  Users,
  Phone,
  MapPin,
  ArrowLeft,
  Search,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api';
import { getChatSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import type { Branch, ChatConversation, ChatMessage, ChatSender } from '../types';

const CUSTOMER_QUICK_QUESTIONS = [
  'Thủ tục nhận xe tại chi nhánh này cần giấy tờ gì?',
  'Nhờ chi nhánh kiểm tra xác nhận chuyển khoản cọc VietQR',
  'Mình muốn hỏi tình trạng xe trống cuối tuần tại trạm',
];

const STAFF_QUICK_REPLIES = [
  'Dạ chào bạn! Quầy điều phối chi nhánh đang trực tuyến, mình hỗ trợ gì cho lịch thuê xe của bạn ạ?',
  'Chi nhánh đã xác nhận cọc VietQR và giữ biển số xe riêng cho bạn rồi nhé!',
  'Hồ sơ eKYC của bạn đã duyệt, khi nhận xe tại trạm không cần để lại CCCD gốc ạ.',
];

export const LiveChatWidget: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  const isBranchStaffUser = Boolean(
    isAuthenticated &&
      user &&
      ['Staff', 'BranchManager'].includes(user.roles)
  );
  const isSystemAdmin = Boolean(
    isAuthenticated && user && user.roles === 'SystemAdmin'
  );

  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Branch list for Customer to choose which Branch to chat with
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [customerBranchConvs, setCustomerBranchConvs] = useState<ChatConversation[]>([]);

  // Customer mode active conversation (for selectedBranchId)
  const [conversation, setConversation] = useState<ChatConversation | null>(null);

  // Staff mode state: Master-Detail Queue ('queue' = list of waiting customer messages, 'detail' = active chat)
  const [staffViewMode, setStaffViewMode] = useState<'queue' | 'detail'>('queue');
  const [staffQueueFilter, setStaffQueueFilter] = useState<'all' | 'waiting' | 'replied'>('all');
  const [staffSearchQuery, setStaffSearchQuery] = useState<string>('');
  const [staffConversations, setStaffConversations] = useState<ChatConversation[]>([]);
  const [selectedStaffConv, setSelectedStaffConv] = useState<ChatConversation | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [remoteTypingName, setRemoteTypingName] = useState<string>('');
  const [unreadBadge, setUnreadBadge] = useState<number>(0);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const isStaffMode = isBranchStaffUser || isSystemAdmin;
  const activeConv = isStaffMode ? selectedStaffConv : conversation;
  const activeConvId = activeConv?._id || '';

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  }, []);

  const getCustomerDisplay = (conv: ChatConversation | null): {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    initial: string;
  } => {
    if (!conv) return { id: '', name: 'Khách hàng', initial: 'K' };
    if (typeof conv.customerId === 'object' && conv.customerId !== null) {
      const c = conv.customerId as ChatSender;
      const fullName = [c.lastName, c.firstName].filter(Boolean).join(' ') || c.username;
      const initial = (c.firstName?.[0] || c.username?.[0] || 'K').toUpperCase();
      return {
        id: c._id,
        name: fullName,
        phone: c.phoneNumber,
        email: c.email,
        initial,
      };
    }
    return { id: String(conv.customerId), name: 'Khách hàng', initial: 'K' };
  };

  const getBranchShortName = (name: string): string => {
    if (name.toLowerCase().includes('sân bay')) return 'Trạm Sân Bay';
    if (name.toLowerCase().includes('mỹ khê')) return 'Trạm Biển Mỹ Khê';
    if (name.toLowerCase().includes('sơn trà')) return 'Trạm Sơn Trà';
    return name.replace(/^Chi nhánh\s+/i, '');
  };

  // Load branches once
  useEffect(() => {
    api
      .get('/branches')
      .then((res) => {
        const list: Branch[] = res.data?.data || [];
        setBranches(list);
        if (list.length > 0 && !selectedBranchId) {
          setSelectedBranchId(list[0]._id);
        }
      })
      .catch(() => {});
  }, [selectedBranchId]);

  // Broadcast unread count & open state to Navbar Header button
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('motorent:chat-state', {
        detail: { isOpen, unreadBadge, socketConnected },
      })
    );
  }, [isOpen, unreadBadge, socketConnected]);

  // Listen to Header Chat button toggle events
  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev);
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    window.addEventListener('motorent:toggle-chat', handleToggle);
    window.addEventListener('motorent:open-chat', handleOpen);
    window.addEventListener('motorent:close-chat', handleClose);

    return () => {
      window.removeEventListener('motorent:toggle-chat', handleToggle);
      window.removeEventListener('motorent:open-chat', handleOpen);
      window.removeEventListener('motorent:close-chat', handleClose);
    };
  }, []);

  // Load messages for a specific conversation ID
  const fetchMessagesForConversation = useCallback(
    async (convId: string, shouldMarkRead: boolean) => {
      if (!convId) return;
      try {
        const msgRes = await api.get(`/chat/${convId}/messages?limit=60`);
        const msgList: ChatMessage[] = msgRes.data?.data?.messages || [];
        setMessages(msgList);
        scrollToBottom();

        if (shouldMarkRead) {
          await api.put(`/chat/${convId}/read`).catch(() => {});
          if (isStaffMode) {
            setStaffConversations((prev) => {
              const next = prev.map((c) =>
                c._id === convId ? { ...c, unreadStaffCount: 0 } : c
              );
              const totalUnread = next.reduce((sum, c) => sum + (c.unreadStaffCount || 0), 0);
              setUnreadBadge(totalUnread);
              return next;
            });
          } else {
            setCustomerBranchConvs((prev) => {
              const next = prev.map((c) =>
                c._id === convId ? { ...c, unreadCustomerCount: 0 } : c
              );
              const totalUnread = next.reduce(
                (sum, c) => sum + (c.unreadCustomerCount || 0),
                0
              );
              setUnreadBadge(totalUnread);
              return next;
            });
          }
        }
      } catch (err) {
        console.error('Không thể tải tin nhắn hội thoại:', err);
      }
    },
    [isStaffMode, scrollToBottom]
  );

  // Load data depending on whether user is Staff/Manager vs Customer
  const loadChatData = useCallback(
    async (overrideBranchId?: string) => {
      if (!isAuthenticated || !user) return;
      setLoading(true);
      try {
        if (isStaffMode) {
          // STAFF MODE (UC-66): Load customer conversations strictly for THIS staff's branch
          const branchParam =
            isSystemAdmin && (overrideBranchId || selectedBranchId)
              ? `&branchId=${overrideBranchId || selectedBranchId}`
              : '';
          const res = await api.get(`/chat/staff/conversations?status=Open${branchParam}`);
          const rawItems: ChatConversation[] = res.data?.data?.items || [];

          // Sort waiting/unread conversations first, then by newest message timestamp
          const sorted = [...rawItems].sort((a, b) => {
            const aWaiting = (a.unreadStaffCount || 0) > 0 ? 1 : 0;
            const bWaiting = (b.unreadStaffCount || 0) > 0 ? 1 : 0;
            if (bWaiting !== aWaiting) return bWaiting - aWaiting;
            return (
              new Date(b.lastMessageAt || b.updatedAt).getTime() -
              new Date(a.lastMessageAt || a.updatedAt).getTime()
            );
          });

          setStaffConversations(sorted);
          const totalUnread = isSystemAdmin
            ? 0
            : sorted.reduce((sum, c) => sum + (c.unreadStaffCount || 0), 0);
          setUnreadBadge(totalUnread);

          // Keep currently selected conversation in sync ifStaff is already in 'detail' view
          if (selectedStaffConv) {
            const updatedTarget = sorted.find((c) => c._id === selectedStaffConv._id) || null;
            setSelectedStaffConv(updatedTarget);
            if (updatedTarget && staffViewMode === 'detail') {
              await fetchMessagesForConversation(updatedTarget._id, isOpen);
            }
          }
        } else {
          // CUSTOMER MODE (UC-44): Load customer's conversation with the SELECTED Branch
          const targetBId = overrideBranchId || selectedBranchId;
          const query = targetBId ? `?branchId=${targetBId}` : '';
          const convRes = await api.get(`/chat/my${query}`);
          const convData: ChatConversation = convRes.data?.data;
          const allBranchConvs: ChatConversation[] = convRes.data?.branchConversations || [];

          setCustomerBranchConvs(allBranchConvs);
          const totalCustomerUnread = allBranchConvs.reduce(
            (sum, c) => sum + (c.unreadCustomerCount || 0),
            0
          );
          setUnreadBadge(totalCustomerUnread);

          if (convData && convData._id) {
            setConversation(convData);
            const convBranchObj =
              convData.branchId && typeof convData.branchId === 'object'
                ? (convData.branchId as Branch)
                : null;
            if (convBranchObj?._id && !overrideBranchId && !selectedBranchId) {
              setSelectedBranchId(convBranchObj._id);
            }

            await fetchMessagesForConversation(
              convData._id,
              isOpen && (convData.unreadCustomerCount || 0) > 0
            );
          }
        }
      } catch (err) {
        console.error('Không thể tải hội thoại Live Chat:', err);
      } finally {
        setLoading(false);
      }
    },
    [
      isAuthenticated,
      user,
      isStaffMode,
      isSystemAdmin,
      selectedBranchId,
      isOpen,
      selectedStaffConv,
      staffViewMode,
      fetchMessagesForConversation,
    ]
  );

  useEffect(() => {
    if (isAuthenticated && user) {
      loadChatData();
    } else {
      setConversation(null);
      setStaffConversations([]);
      setSelectedStaffConv(null);
      setStaffViewMode('queue');
      setMessages([]);
      setUnreadBadge(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?._id, user?.roles]);

  // Customer switches branch tab
  const handleSelectBranchForCustomer = async (branchId: string) => {
    setSelectedBranchId(branchId);
    await loadChatData(branchId);
  };

  // Staff clicks a waiting customer item from the Queue -> opens Detail View & loads messages
  const handleOpenCustomerDetail = async (conv: ChatConversation) => {
    setSelectedStaffConv(conv);
    setStaffViewMode('detail');
    await fetchMessagesForConversation(conv._id, true);
  };

  // Staff clicks Back to return to the waiting messages queue
  const handleBackToQueue = () => {
    setStaffViewMode('queue');
    setRemoteTypingName('');
  };

  // Connect Socket.IO /chat namespace & subscribe to branch-scoped room events
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const socket = getChatSocket();

    const handleConnect = () => {
      setSocketConnected(true);
      if (isBranchStaffUser) {
        socket.emit('join_staff_console');
      } else if (isSystemAdmin && selectedBranchId) {
        socket.emit('join_staff_console', selectedBranchId);
      }
      if (activeConvId && (!isStaffMode || staffViewMode === 'detail')) {
        socket.emit('join_conversation', activeConvId);
      }
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
    };

    const handleReceiveMessage = (newMsg: ChatMessage) => {
      const senderIdStr =
        typeof newMsg.senderId === 'object' ? newMsg.senderId._id : String(newMsg.senderId);
      const isFromMe = senderIdStr === user._id;

      const isViewingThisConv =
        activeConvId === newMsg.conversationId &&
        (!isStaffMode || staffViewMode === 'detail');

      if (isViewingThisConv) {
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

        if (!isFromMe && isOpen) {
          socket.emit('chat:read', { conversationId: activeConvId });
          api.put(`/chat/${activeConvId}/read`).catch(() => {});
        }
      }

      if (!isFromMe && !isOpen && !isSystemAdmin) {
        setUnreadBadge((c) => c + 1);
        const senderName =
          typeof newMsg.senderId === 'object'
            ? [newMsg.senderId.lastName, newMsg.senderId.firstName]
                .filter(Boolean)
                .join(' ') || newMsg.senderId.username
            : isStaffMode
              ? 'Khách hàng'
              : 'Điều phối viên';
        window.dispatchEvent(
          new CustomEvent('motorent:new-chat-notification', {
            detail: {
              ...newMsg,
              senderName,
            },
          })
        );
      }
    };

    const handleConvUpdated = (updated: ChatConversation) => {
      if (!updated?._id) return;

      if (isStaffMode) {
        const isCurrentlyReadingDetail =
          isOpen && staffViewMode === 'detail' && activeConvId === updated._id;

        setStaffConversations((prev) => {
          const exists = prev.some((c) => c._id === updated._id);
          const merged = exists
            ? prev.map((c) =>
                c._id === updated._id
                  ? {
                      ...updated,
                      unreadStaffCount: isCurrentlyReadingDetail
                        ? 0
                        : updated.unreadStaffCount,
                    }
                  : c
              )
            : [updated, ...prev];

          const sorted = [...merged].sort((a, b) => {
            const aWaiting = (a.unreadStaffCount || 0) > 0 ? 1 : 0;
            const bWaiting = (b.unreadStaffCount || 0) > 0 ? 1 : 0;
            if (bWaiting !== aWaiting) return bWaiting - aWaiting;
            return (
              new Date(b.lastMessageAt || b.updatedAt).getTime() -
              new Date(a.lastMessageAt || a.updatedAt).getTime()
            );
          });

          if (!isSystemAdmin) {
            const totalUnread = sorted.reduce(
              (sum, c) => sum + (c.unreadStaffCount || 0),
              0
            );
            setUnreadBadge(totalUnread);
          }
          return sorted;
        });

        setSelectedStaffConv((prev) => {
          if (!prev) return null;
          if (prev._id === updated._id) {
            return {
              ...updated,
              unreadStaffCount: isCurrentlyReadingDetail ? 0 : updated.unreadStaffCount,
            };
          }
          return prev;
        });
      } else {
        setCustomerBranchConvs((prev) => {
          const exists = prev.some((c) => c._id === updated._id);
          const next = exists
            ? prev.map((c) => (c._id === updated._id ? updated : c))
            : [updated, ...prev];
          const totalUnread = next.reduce(
            (sum, c) => sum + (c.unreadCustomerCount || 0),
            0
          );
          setUnreadBadge(totalUnread);
          return next;
        });
        if (updated._id === activeConvId) {
          setConversation(updated);
        }
      }
    };

    const handleTyping = (payload: {
      conversationId?: string;
      userId: string;
      username: string;
      isTyping: boolean;
    }) => {
      if (payload.userId === user._id) return;
      if (payload.conversationId && payload.conversationId !== activeConvId) return;
      if (payload.isTyping) {
        setRemoteTypingName(
          payload.username || (isStaffMode ? 'Khách hàng' : 'Nhân viên chi nhánh')
        );
        if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = window.setTimeout(() => {
          setRemoteTypingName('');
        }, 3000);
      } else {
        setRemoteTypingName('');
      }
    };

    const handleRead = (payload: { conversationId: string; readBy: string }) => {
      if (payload.conversationId !== activeConvId) return;
      setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
    };

    if (socket.connected) {
      handleConnect();
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('chat:receive', handleReceiveMessage);
    socket.on('chat:typing', handleTyping);
    socket.on('chat:read', handleRead);
    socket.on('chat:conversation_updated', handleConvUpdated);

    return () => {
      if (activeConvId) {
        socket.emit('leave_conversation', activeConvId);
      }
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('chat:receive', handleReceiveMessage);
      socket.off('chat:typing', handleTyping);
      socket.off('chat:read', handleRead);
      socket.off('chat:conversation_updated', handleConvUpdated);
    };
  }, [
    isAuthenticated,
    user,
    isStaffMode,
    isBranchStaffUser,
    isSystemAdmin,
    selectedBranchId,
    activeConvId,
    staffViewMode,
    isOpen,
    scrollToBottom,
  ]);

  // Refresh when opening widget
  useEffect(() => {
    if (isOpen && isAuthenticated && user) {
      loadChatData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleInputChange = (val: string) => {
    setInputText(val);
    if (activeConvId && socketConnected) {
      const socket = getChatSocket();
      socket.emit('chat:typing', {
        conversationId: activeConvId,
        isTyping: val.trim().length > 0,
      });
    }
  };

  const handleSendMessage = async (customText?: string) => {
    const content = (customText ?? inputText).trim();
    if (!content || !activeConvId || !user || sending) return;

    const clientMsgId = `cmsg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    if (!customText) {
      setInputText('');
    }
    setSending(true);

    const optimisticMsg: ChatMessage = {
      _id: clientMsgId,
      conversationId: activeConvId,
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

    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();

    try {
      const res = await api.post(`/chat/${activeConvId}/messages`, {
        content,
        clientMsgId,
      });
      const savedMsg: ChatMessage = res.data?.data;
      if (savedMsg) {
        setMessages((prev) =>
          prev.map((m) =>
            m.clientMsgId === clientMsgId || m._id === savedMsg._id ? savedMsg : m
          )
        );
      }
    } catch (err) {
      console.error('Lỗi gửi tin nhắn Live Chat:', err);
    } finally {
      setSending(false);
    }
  };

  const handleClaimConversation = async () => {
    if (!isStaffMode || !activeConvId) return;
    try {
      const res = await api.put(`/chat/${activeConvId}/claim`);
      if (res.data?.data) {
        const updated: ChatConversation = res.data.data;
        setSelectedStaffConv(updated);
        setStaffConversations((prev) =>
          prev.map((c) => (c._id === updated._id ? updated : c))
        );
      }
    } catch (err) {
      console.error('Không thể nhận phụ trách hội thoại:', err);
    }
  };

  const assignedStaff =
    activeConv?.assignedStaffId && typeof activeConv.assignedStaffId === 'object'
      ? (activeConv.assignedStaffId as ChatSender)
      : null;

  const activeBranchObj =
    activeConv?.branchId && typeof activeConv.branchId === 'object'
      ? (activeConv.branchId as Branch)
      : branches.find((b) => b._id === selectedBranchId) || null;

  const staffOwnBranch =
    user?.branchId && branches.length > 0
      ? branches.find((b) => b._id === String(user.branchId)) || activeBranchObj
      : activeBranchObj;

  const activeCustomerInfo = getCustomerDisplay(activeConv);

  const waitingCustomersCount = staffConversations.filter(
    (c) => (c.unreadStaffCount || 0) > 0
  ).length;

  const filteredStaffQueue = staffConversations.filter((c) => {
    const isWaiting = (c.unreadStaffCount || 0) > 0;
    if (staffQueueFilter === 'waiting' && !isWaiting) return false;
    if (staffQueueFilter === 'replied' && isWaiting) return false;

    if (!staffSearchQuery.trim()) return true;
    const q = staffSearchQuery.toLowerCase();
    const cust = getCustomerDisplay(c);
    return (
      cust.name.toLowerCase().includes(q) ||
      (cust.phone || '').toLowerCase().includes(q) ||
      (c.lastMessageText || '').toLowerCase().includes(q)
    );
  });

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="fixed top-[72px] right-4 sm:right-8 z-50 w-[375px] sm:w-[445px] h-[585px] max-h-[84vh] bg-[#161616] border border-white/15 rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200"
    >
      {/* Header */}
      <div className="p-3.5 bg-[#101010] border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center space-x-2.5 min-w-0">
          {isStaffMode && staffViewMode === 'detail' ? (
            <button
              type="button"
              onClick={handleBackToQueue}
              className="h-9 px-2.5 rounded-xl bg-[#141D1A] hover:bg-white/10 border border-white/15 text-[#F5F5F5] flex items-center space-x-1.5 text-xs font-bold transition-colors cursor-pointer shrink-0"
              title="Quay lại danh sách tin nhắn đang chờ"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#FFC799]" />
              <span>Hàng chờ</span>
              {unreadBadge > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#FF8080] text-[#101010] font-mono text-[9px] font-black">
                  {unreadBadge}
                </span>
              )}
            </button>
          ) : (
            <div className="relative w-9 h-9 rounded-xl bg-[#161616] border border-[#FFC799]/30 flex items-center justify-center text-[#FFC799] shrink-0">
              {isStaffMode ? <Users className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#101010] ${
                  socketConnected ? 'bg-[#99FFE4]' : 'bg-[#FFC799]'
                }`}
              />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#F5F5F5] truncate">
                {isStaffMode
                  ? staffViewMode === 'detail' && selectedStaffConv
                    ? activeCustomerInfo.name
                    : staffOwnBranch
                      ? `Hộp thư ${getBranchShortName(staffOwnBranch.name)}`
                      : 'Hộp thư Chi nhánh'
                  : activeBranchObj
                    ? `Chat ${getBranchShortName(activeBranchObj.name)}`
                    : 'Live Chat Chi Nhánh'}
              </h3>
              <span className="px-1.5 py-0.5 rounded bg-[#FFC799]/15 text-[#FFC799] font-mono text-[9px] font-bold shrink-0">
                /chat
              </span>
            </div>
            <p className="text-[11px] text-[#6E6E6E] mt-0.5 truncate">
              {isStaffMode
                ? staffViewMode === 'detail' && selectedStaffConv
                  ? activeCustomerInfo.phone
                    ? `SĐT: ${activeCustomerInfo.phone} • Đang xem chi tiết`
                    : 'Đang xem chi tiết hội thoại khách hàng'
                  : `${waitingCustomersCount} khách đang chờ phản hồi • Tổng ${staffConversations.length} hội thoại`
                : assignedStaff
                  ? `Nhân sự trạm: ${
                      [assignedStaff.lastName, assignedStaff.firstName]
                        .filter(Boolean)
                        .join(' ') || assignedStaff.username
                    }`
                  : 'Chọn chi nhánh bên dưới để hỏi trực tiếp nhân viên trạm'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1 shrink-0">
          {isStaffMode && (
            <Link
              to="/counter?mode=chat"
              onClick={() => setIsOpen(false)}
              className="px-2 py-1 rounded-lg bg-[#FFC799]/15 hover:bg-[#FFC799]/25 text-[#FFC799] text-[10px] font-bold inline-flex items-center space-x-1 transition-colors"
              title="Mở bàn điều phối chat toàn màn hình"
            >
              <span>Mở rộng</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          )}
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => loadChatData()}
              className="p-1.5 rounded-lg text-[#6E6E6E] hover:text-[#F5F5F5] hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Làm mới danh sách"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-[#6E6E6E] hover:text-[#F5F5F5] hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="Đóng khung chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CUSTOMER MODE: Branch Selector Strip */}
      {isAuthenticated && !isStaffMode && branches.length > 0 && (
        <div className="px-3 py-2 bg-[#0D1311] border-b border-white/10">
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#FFC799] font-bold flex items-center space-x-1">
              <MapPin className="w-3 h-3" />
              <span>Chọn chi nhánh cần hỏi trực tiếp:</span>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {branches.map((b) => {
              const activeBranchId = activeBranchObj?._id || selectedBranchId;
              const isSelected = activeBranchId === b._id;
              const branchConv = customerBranchConvs.find((c) => {
                const cBranchId =
                  c.branchId && typeof c.branchId === 'object'
                    ? (c.branchId as Branch)._id
                    : String(c.branchId || '');
                return cBranchId === b._id;
              });
              const unreadForBranch = branchConv?.unreadCustomerCount || 0;

              return (
                <button
                  key={b._id}
                  type="button"
                  onClick={() => handleSelectBranchForCustomer(b._id)}
                  className={`px-2 py-1.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#FFC799]/15 border-[#FFC799] text-[#F5F5F5]'
                      : 'bg-[#161616] border-white/10 text-[#A0A0A0] hover:text-[#F5F5F5] hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold truncate">
                      {getBranchShortName(b.name)}
                    </span>
                    {unreadForBranch > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-[#FF8080] text-[#101010] font-mono text-[9px] font-black shrink-0">
                        {unreadForBranch}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-mono text-[#FFC799] truncate mt-0.5">
                    {b.code || 'TRẠM ĐÀ NẴNG'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* BODY */}
      {!isAuthenticated ? (
        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#101010] border border-white/10 flex items-center justify-center text-[#FFC799]">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h4 className="text-sm font-bold text-[#F5F5F5]">
              Chat trực tiếp theo từng Chi nhánh Motorent
            </h4>
            <p className="text-xs text-[#6E6E6E] leading-relaxed">
              Đăng nhập để chọn đúng chi nhánh bạn muốn thuê xe (Sân bay Đà Nẵng, Biển Mỹ Khê hoặc Bán đảo Sơn Trà) và trò chuyện trực tiếp với nhân viên tại trạm đó.
            </p>
          </div>
          <Link
            to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}
            onClick={() => setIsOpen(false)}
            className="w-full py-3 rounded-xl bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            <span>Đăng nhập để Chat với Chi nhánh</span>
          </Link>
        </div>
      ) : isStaffMode && staffViewMode === 'queue' ? (
        /* =====================================================================
           STAFF STEP 1: DANH SÁCH TIN NHẮN KHÁCH HÀNG ĐANG CHỜ (WAITING QUEUE)
           ===================================================================== */
        <div className="flex-1 flex flex-col bg-[#101010]/70 overflow-hidden">
          {/* Filter Tabs & Search */}
          <div className="p-3 bg-[#0D1311] border-b border-white/10 space-y-2.5">
            <div className="flex items-center justify-between gap-1.5">
              <button
                type="button"
                onClick={() => setStaffQueueFilter('all')}
                className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                  staffQueueFilter === 'all'
                    ? 'bg-[#FFC799] text-[#101010]'
                    : 'bg-[#161616] border border-white/10 text-[#A0A0A0] hover:text-[#F5F5F5]'
                }`}
              >
                <span>Tất cả</span>
                <span className="font-mono text-[10px] opacity-80">
                  ({staffConversations.length})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStaffQueueFilter('waiting')}
                className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                  staffQueueFilter === 'waiting'
                    ? 'bg-[#FF8080] text-[#101010]'
                    : 'bg-[#161616] border border-white/10 text-[#A0A0A0] hover:text-[#F5F5F5]'
                }`}
              >
                <span>Đang chờ</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full font-mono text-[9px] font-black ${
                    staffQueueFilter === 'waiting'
                      ? 'bg-white text-rose-600'
                      : waitingCustomersCount > 0
                        ? 'bg-[#FF8080] text-[#101010]'
                        : 'bg-white/10 text-[#6E6E6E]'
                  }`}
                >
                  {waitingCustomersCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStaffQueueFilter('replied')}
                className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                  staffQueueFilter === 'replied'
                    ? 'bg-[#99FFE4] text-[#101010]'
                    : 'bg-[#161616] border border-white/10 text-[#A0A0A0] hover:text-[#F5F5F5]'
                }`}
              >
                <span>Đã trả lời</span>
                <span className="font-mono text-[10px] opacity-80">
                  ({Math.max(0, staffConversations.length - waitingCustomersCount)})
                </span>
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#6E6E6E] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={staffSearchQuery}
                onChange={(e) => setStaffSearchQuery(e.target.value)}
                placeholder="Tìm tên khách hàng, SĐT hoặc nội dung câu hỏi..."
                className="w-full bg-[#161616] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-[#F5F5F5] placeholder-[#6E6E6E] outline-none focus:border-[#FFC799]"
              />
            </div>
          </div>

          {/* Waiting Queue List */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.06]">
            {loading && staffConversations.length === 0 ? (
              <div className="py-16 text-center text-xs text-[#6E6E6E]">
                Đang tải danh sách tin nhắn khách hàng...
              </div>
            ) : filteredStaffQueue.length === 0 ? (
              <div className="py-16 px-6 text-center space-y-2">
                <MessageSquare className="w-8 h-8 text-[#6E6E6E] mx-auto" />
                <p className="text-xs font-bold text-[#F5F5F5]">
                  {staffQueueFilter === 'waiting'
                    ? 'Không có tin nhắn nào đang chờ xử lý'
                    : 'Chưa có cuộc hội thoại nào phù hợp'}
                </p>
                <p className="text-[11px] text-[#6E6E6E]">
                  Khi khách hàng nhắn tin hỏi{' '}
                  {staffOwnBranch ? staffOwnBranch.name : 'chi nhánh'}, tin nhắn mới sẽ nổi lên đầu hàng chờ này.
                </p>
              </div>
            ) : (
              filteredStaffQueue.map((c) => {
                const cust = getCustomerDisplay(c);
                const unreadCount = c.unreadStaffCount || 0;
                const isWaiting = unreadCount > 0;

                return (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => handleOpenCustomerDetail(c)}
                    className={`w-full p-3.5 text-left transition-all flex items-start space-x-3 cursor-pointer group ${
                      isWaiting
                        ? 'bg-[#FFC799]/[0.07] hover:bg-[#FFC799]/[0.13]'
                        : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    {/* Customer Avatar / Initial */}
                    <div className="relative shrink-0 mt-0.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${
                          isWaiting
                            ? 'bg-[#FFC799] text-[#101010]'
                            : 'bg-[#16211E] text-[#FFC799] border border-white/10'
                        }`}
                      >
                        {cust.initial}
                      </div>
                      {isWaiting && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 border-2 border-[#101010] animate-pulse" />
                      )}
                    </div>

                    {/* Message Summary */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className="text-xs font-black text-[#F5F5F5] truncate">
                            {cust.name}
                          </span>
                          {isWaiting ? (
                            <span className="px-1.5 py-0.5 rounded-full bg-[#FF8080] text-[#101010] font-mono text-[9px] font-black shrink-0">
                              Chờ • {unreadCount} tin mới
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded bg-[#FFC799]/15 text-[#FFC799] font-mono text-[9px] font-bold shrink-0">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>Đã phản hồi</span>
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] font-mono text-[#6E6E6E] shrink-0">
                          {c.lastMessageAt
                            ? new Date(c.lastMessageAt).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                      </div>

                      {cust.phone && (
                        <div className="flex items-center space-x-1 text-[10px] font-mono text-[#6E6E6E] mt-0.5">
                          <Phone className="w-2.5 h-2.5 text-[#FFC799]" />
                          <span>{cust.phone}</span>
                        </div>
                      )}

                      <p
                        className={`text-xs mt-1 line-clamp-2 leading-relaxed ${
                          isWaiting ? 'text-[#F5F5F5] font-semibold' : 'text-[#A0A0A0]'
                        }`}
                      >
                        {c.lastMessageText || 'Khách hàng vừa mở phiên trò chuyện'}
                      </p>

                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#FFC799] font-bold">
                        <span>Bấm để xem chi tiết &amp; trả lời khách</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* =====================================================================
           STAFF STEP 2 (DETAIL VIEW) OR CUSTOMER CHAT VIEW
           ===================================================================== */
        <>
          {/* Active Customer Bar when Staff is viewing Detail */}
          {isStaffMode && selectedStaffConv && (
            <div className="px-3.5 py-2 bg-[#141D1A] border-b border-white/10 flex items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center space-x-2 min-w-0">
                <span className="px-1.5 py-0.5 rounded bg-[#FFC799]/20 text-[#FFC799] font-mono text-[9px] font-bold shrink-0">
                  KHÁCH HỎI TRẠM
                </span>
                <span className="font-bold text-[#F5F5F5] truncate">
                  {activeCustomerInfo.name}
                </span>
                {activeCustomerInfo.phone && (
                  <span className="inline-flex items-center space-x-1 text-[#6E6E6E] font-mono text-[10px] shrink-0">
                    <Phone className="w-2.5 h-2.5 text-[#FFC799]" />
                    <span>{activeCustomerInfo.phone}</span>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleClaimConversation}
                className="px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-[10px] font-bold text-[#F5F5F5] inline-flex items-center space-x-1 shrink-0 cursor-pointer"
              >
                <UserCheck className="w-3 h-3 text-[#FFC799]" />
                <span>
                  {assignedStaff && assignedStaff._id === user?._id
                    ? 'Đang phụ trách'
                    : 'Nhận xử lý'}
                </span>
              </button>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#101010]/60">
            {loading && messages.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#6E6E6E]">
                Đang đồng bộ lịch sử trò chuyện tại chi nhánh...
              </div>
            ) : messages.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#6E6E6E]">
                Chưa có tin nhắn nào tại chi nhánh này.
              </div>
            ) : (
              messages.map((msg) => {
                const senderObj =
                  typeof msg.senderId === 'object' ? (msg.senderId as ChatSender) : null;
                const senderIdStr = senderObj ? senderObj._id : String(msg.senderId);

                const isCustomerMessage = isStaffMode
                  ? senderIdStr === activeCustomerInfo.id
                  : senderIdStr === user?._id;

                const alignRight = isStaffMode ? !isCustomerMessage : isCustomerMessage;

                const senderName = senderObj
                  ? [senderObj.lastName, senderObj.firstName]
                      .filter(Boolean)
                      .join(' ') || senderObj.username
                  : isCustomerMessage
                    ? activeCustomerInfo.name
                    : 'Nhân viên Chi nhánh';

                const roleTag =
                  senderObj?.roles === 'Customer' || isCustomerMessage
                    ? 'Khách hàng'
                    : activeBranchObj
                      ? getBranchShortName(activeBranchObj.name)
                      : 'Nhân viên Trạm';

                return (
                  <div
                    key={msg._id}
                    className={`flex flex-col ${alignRight ? 'items-end' : 'items-start'}`}
                  >
                    <span
                      className={`text-[10px] font-bold mb-1 px-1 ${
                        alignRight ? 'text-[#FFC799]' : 'text-[#FFC799]'
                      }`}
                    >
                      {senderName} • {roleTag}
                    </span>
                    <div
                      className={`max-w-[84%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        alignRight
                          ? 'bg-[#FFC799] text-[#101010] font-medium rounded-br-sm'
                          : 'bg-[#151F1C] text-[#F5F5F5] border border-white/10 rounded-bl-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                    <div className="flex items-center space-x-1.5 mt-1 px-1 text-[10px] text-[#6E6E6E]">
                      <Clock className="w-2.5 h-2.5" />
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {alignRight && (
                        <CheckCheck
                          className={`w-3 h-3 ${
                            msg.isRead ? 'text-[#FFC799]' : 'text-[#6E6E6E]'
                          }`}
                        />
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {remoteTypingName && (
              <div className="flex items-center space-x-2 text-[11px] text-[#FFC799] px-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFC799] animate-ping" />
                <span>{remoteTypingName} đang nhập tin nhắn...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          <div className="px-3 py-2 bg-[#0D1311] border-t border-white/[0.06] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(isStaffMode ? STAFF_QUICK_REPLIES : CUSTOMER_QUICK_QUESTIONS).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleSendMessage(q)}
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-[10px] text-[#C8C2B8] whitespace-nowrap transition-colors cursor-pointer shrink-0"
              >
                {q.length > 52 ? `${q.slice(0, 52)}...` : q}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-[#161616] border-t border-white/10 flex items-center space-x-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={
                isStaffMode
                  ? `Phản hồi khách hàng ${activeCustomerInfo.name}...`
                  : `Nhắn cho ${activeBranchObj ? getBranchShortName(activeBranchObj.name) : 'chi nhánh'}...`
              }
              className="flex-1 bg-[#101010] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F5F5] placeholder-[#6E6E6E] outline-none focus:border-[#FFC799]"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending || !activeConvId}
              className="p-2.5 rounded-xl bg-[#FFC799] hover:bg-[#FFD6B3] disabled:opacity-40 text-[#101010] transition-colors cursor-pointer shrink-0"
              aria-label="Gửi tin nhắn"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </>
      )}
    </div>
  );
};

export default LiveChatWidget;
