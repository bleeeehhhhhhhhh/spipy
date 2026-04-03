import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ChatBubble from '../components/ChatBubble';
import MentionInput from '../components/MentionInput';
import { useAuth } from '../contexts/AuthContext';
import {
    getConversations,
    getConversationMessages,
    sendMessage,
    deleteMessage,
    markConversationRead,
    getOrCreateConversation,
    searchUsers,
    subscribeToMessages,
    getProfile,
    uploadPostImage,
} from '../lib/supabase';

export default function MessagesPage() {
    const { conversationId: urlConvId } = useParams();
    const navigate = useNavigate();
    const { user, profile } = useAuth();

    // Conversation list state
    const [conversations, setConversations] = useState([]);
    const [loadingConvos, setLoadingConvos] = useState(true);
    const [activeConvId, setActiveConvId] = useState(urlConvId || null);

    // Chat state
    const [messages, setMessages] = useState([]);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [messageText, setMessageText] = useState('');
    const [sending, setSending] = useState(false);
    const [otherProfiles, setOtherProfiles] = useState({});

    // New conversation state
    const [showNewChat, setShowNewChat] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    // Mobile state
    const [showChatPanel, setShowChatPanel] = useState(!!urlConvId);

    // Image attachment
    const [attachedImage, setAttachedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const searchTimeout = useRef(null);

    // =====================
    // Load conversations
    // =====================
    useEffect(() => {
        if (!user) return;
        loadConversations();
    }, [user]);

    const loadConversations = async () => {
        if (!user) return;
        setLoadingConvos(true);
        try {
            const convos = await getConversations(user.id);
            setConversations(convos);

            // Load profiles for all other participants
            const profileIds = new Set();
            convos.forEach(c => {
                c.participants?.forEach(p => {
                    if (p.user_id !== user.id) profileIds.add(p.user_id);
                });
            });

            const profiles = {};
            await Promise.all(
                [...profileIds].map(async (uid) => {
                    try {
                        const p = await getProfile(uid);
                        if (p) profiles[uid] = p;
                    } catch { }
                })
            );
            setOtherProfiles(prev => ({ ...prev, ...profiles }));
        } catch (err) {
            console.error('Failed to load conversations:', err);
        }
        setLoadingConvos(false);
    };

    // =====================
    // Load messages for active conversation
    // =====================
    useEffect(() => {
        if (!activeConvId || !user) return;

        const loadMessages = async () => {
            setLoadingMsgs(true);
            try {
                const msgs = await getConversationMessages(activeConvId);
                setMessages(msgs);

                // Load sender profiles we don't have yet
                const unknownIds = new Set();
                msgs.forEach(m => {
                    if (m.sender_id !== user.id && !otherProfiles[m.sender_id]) {
                        unknownIds.add(m.sender_id);
                    }
                });

                if (unknownIds.size > 0) {
                    const profiles = {};
                    await Promise.all(
                        [...unknownIds].map(async (uid) => {
                            try {
                                const p = await getProfile(uid);
                                if (p) profiles[uid] = p;
                            } catch { }
                        })
                    );
                    setOtherProfiles(prev => ({ ...prev, ...profiles }));
                }

                // Mark as read
                await markConversationRead(activeConvId, user.id);
            } catch (err) {
                console.error('Failed to load messages:', err);
            }
            setLoadingMsgs(false);
        };

        loadMessages();

        // Subscribe to realtime messages
        const unsub = subscribeToMessages(activeConvId, async (payload) => {
            if (payload.eventType === 'INSERT') {
                setMessages(prev => [...prev, payload.new]);

                // Load sender profile if unknown
                if (payload.new.sender_id !== user.id && !otherProfiles[payload.new.sender_id]) {
                    try {
                        const p = await getProfile(payload.new.sender_id);
                        if (p) setOtherProfiles(prev => ({ ...prev, [p.id]: p }));
                    } catch { }
                }

                // Mark as read
                await markConversationRead(activeConvId, user.id);
            } else if (payload.eventType === 'UPDATE') {
                setMessages(prev =>
                    prev.map(m => m.id === payload.new.id ? payload.new : m)
                );
            }
        });

        return unsub;
    }, [activeConvId, user]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Sync URL param
    useEffect(() => {
        if (urlConvId && urlConvId !== activeConvId) {
            setActiveConvId(urlConvId);
            setShowChatPanel(true);
        }
    }, [urlConvId]);

    // =====================
    // Send message
    // =====================
    const handleSend = async (text, mentionedUsernames) => {
        if ((!text.trim() && !attachedImage) || !activeConvId || sending) return;

        setSending(true);
        try {
            let imageUrl = null;
            if (attachedImage) {
                setUploadingImage(true);
                imageUrl = await uploadPostImage(user.id, attachedImage);
                setUploadingImage(false);
            }

            // Resolve mentioned usernames to user IDs
            const mentionIds = [];
            if (mentionedUsernames && mentionedUsernames.length > 0) {
                for (const username of mentionedUsernames) {
                    try {
                        const results = await searchUsers(username);
                        const exactMatch = results.find(r => r.username.toLowerCase() === username.toLowerCase());
                        if (exactMatch) mentionIds.push(exactMatch.id);
                    } catch { }
                }
            }

            await sendMessage(activeConvId, user.id, text.trim(), mentionIds, imageUrl);
            setMessageText('');
            setAttachedImage(null);
            setImagePreview(null);

            // Refresh conversation list to update last message
            loadConversations();
        } catch (err) {
            console.error('Failed to send message:', err);
        }
        setSending(false);
    };

    const handleDelete = async (messageId) => {
        try {
            await deleteMessage(messageId);
            setMessages(prev =>
                prev.map(m => m.id === messageId ? { ...m, is_deleted: true, content: '' } : m)
            );
        } catch (err) {
            console.error('Failed to delete message:', err);
        }
    };

    // =====================
    // New conversation
    // =====================
    const handleUserSearch = (query) => {
        setUserSearch(query);
        clearTimeout(searchTimeout.current);

        if (query.length < 1) {
            setSearchResults([]);
            return;
        }

        searchTimeout.current = setTimeout(async () => {
            setSearching(true);
            try {
                const results = await searchUsers(query);
                // Filter out self
                setSearchResults(results.filter(u => u.id !== user.id));
            } catch {
                setSearchResults([]);
            }
            setSearching(false);
        }, 250);
    };

    const startConversation = async (otherUserId) => {
        try {
            const convId = await getOrCreateConversation(user.id, otherUserId);
            if (!convId) {
                alert('Could not start conversation. Make sure the messaging database is set up.');
                return;
            }
            setActiveConvId(convId);
            setShowNewChat(false);
            setShowChatPanel(true);
            setUserSearch('');
            setSearchResults([]);
            navigate(`/messages/${convId}`, { replace: true });
            loadConversations();
        } catch (err) {
            console.error('Failed to create conversation:', err);
            alert('Failed to start conversation: ' + (err?.message || 'Unknown error'));
        }
    };

    // =====================
    // Image attachment
    // =====================
    const handleImageAttach = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            alert('Image must be under 10MB');
            return;
        }
        setAttachedImage(file);
        const reader = new FileReader();
        reader.onload = (e) => setImagePreview(e.target.result);
        reader.readAsDataURL(file);
    };

    const removeImage = () => {
        setAttachedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // =====================
    // Helpers
    // =====================
    const getConvoDisplayInfo = (conv) => {
        const otherParticipants = conv.participants?.filter(p => p.user_id !== user?.id) || [];
        const otherUser = otherParticipants[0];
        const otherProfile = otherUser ? otherProfiles[otherUser.user_id] : null;

        return {
            name: otherProfile?.display_name || otherProfile?.username || 'Unknown',
            username: otherProfile?.username || '',
            avatar: otherProfile?.avatar_url || null,
            lastMessage: conv.last_message?.content || 'No messages yet',
            lastMessageTime: conv.last_message?.created_at,
            isUnread: otherUser && conv.last_message
                && new Date(conv.last_message.created_at) > new Date(otherUser.last_read_at)
                && conv.last_message.sender_id !== user?.id,
        };
    };

    const formatConvoTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'now';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // =====================
    // Auth guard
    // =====================
    if (!user) {
        return (
            <main className="main-content">
                <div className="feed-empty">
                    <div className="empty-icon">💬</div>
                    <div className="empty-text">Sign in to message</div>
                    <div className="empty-hint">Log in to start chatting with other users</div>
                </div>
            </main>
        );
    }

    // =====================
    // Active conversation info
    // =====================
    const activeConv = conversations.find(c => c.id === activeConvId);
    const activeConvInfo = activeConv ? getConvoDisplayInfo(activeConv) : null;

    return (
        <main className="messages-page">
            {/* ===== LEFT PANEL: Conversation List ===== */}
            <aside className={`msg-sidebar ${showChatPanel ? 'mobile-hidden' : ''}`}>
                <div className="msg-sidebar-header">
                    <h2 className="msg-sidebar-title">
                        <span className="msg-title-icon">💬</span> Messages
                    </h2>
                    <button
                        className="msg-new-btn"
                        onClick={() => setShowNewChat(true)}
                        title="New message"
                        id="new-message-btn"
                    >
                        ✏️
                    </button>
                </div>

                {/* New Chat Search */}
                <AnimatePresence>
                    {showNewChat && (
                        <motion.div
                            className="msg-new-chat"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="msg-new-chat-header">
                                <span>New conversation</span>
                                <button className="msg-new-close" onClick={() => { setShowNewChat(false); setUserSearch(''); setSearchResults([]); }}>✕</button>
                            </div>
                            <input
                                className="msg-user-search"
                                placeholder="Search users..."
                                value={userSearch}
                                onChange={(e) => handleUserSearch(e.target.value)}
                                autoFocus
                            />
                            <div className="msg-search-results">
                                {searching && <div className="msg-search-loading">Searching...</div>}
                                {searchResults.map(u => (
                                    <button
                                        key={u.id}
                                        className="msg-search-user"
                                        onClick={() => startConversation(u.id)}
                                    >
                                        <div className="msg-user-avatar-sm">
                                            {u.avatar_url ? (
                                                <img src={u.avatar_url} alt="" className="msg-avatar-img" />
                                            ) : '🌸'}
                                        </div>
                                        <div className="msg-user-info">
                                            <span className="msg-user-name">{u.display_name || u.username}</span>
                                            <span className="msg-user-handle">@{u.username}</span>
                                        </div>
                                    </button>
                                ))}
                                {!searching && userSearch.length > 0 && searchResults.length === 0 && (
                                    <div className="msg-search-empty">No users found</div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Conversation List */}
                <div className="msg-convo-list">
                    {loadingConvos ? (
                        <div className="msg-loading">
                            <div className="msg-loading-dot" />
                            <div className="msg-loading-dot" />
                            <div className="msg-loading-dot" />
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="msg-empty-list">
                            <span className="msg-empty-icon">✨</span>
                            <span className="msg-empty-text">No conversations yet</span>
                            <button
                                className="msg-start-btn"
                                onClick={() => setShowNewChat(true)}
                            >
                                Start a chat ✏️
                            </button>
                        </div>
                    ) : (
                        conversations.map(conv => {
                            const info = getConvoDisplayInfo(conv);
                            return (
                                <button
                                    key={conv.id}
                                    className={`msg-convo-item ${activeConvId === conv.id ? 'active' : ''} ${info.isUnread ? 'unread' : ''}`}
                                    onClick={() => {
                                        setActiveConvId(conv.id);
                                        setShowChatPanel(true);
                                        navigate(`/messages/${conv.id}`, { replace: true });
                                    }}
                                >
                                    <div className="msg-convo-avatar">
                                        {info.avatar ? (
                                            <img src={info.avatar} alt="" className="msg-avatar-img" />
                                        ) : '🌸'}
                                    </div>
                                    <div className="msg-convo-info">
                                        <div className="msg-convo-top">
                                            <span className="msg-convo-name">{info.name}</span>
                                            <span className="msg-convo-time">{formatConvoTime(info.lastMessageTime)}</span>
                                        </div>
                                        <span className={`msg-convo-preview ${info.isUnread ? 'unread' : ''}`}>
                                            {info.lastMessage.slice(0, 45)}{info.lastMessage.length > 45 ? '...' : ''}
                                        </span>
                                    </div>
                                    {info.isUnread && <span className="msg-convo-unread-dot" />}
                                </button>
                            );
                        })
                    )}
                </div>
            </aside>

            {/* ===== RIGHT PANEL: Chat Area ===== */}
            <section className={`msg-chat-panel ${showChatPanel ? 'mobile-visible' : ''}`}>
                {!activeConvId ? (
                    <div className="msg-no-chat">
                        <div className="msg-no-chat-icon">💬</div>
                        <h3 className="msg-no-chat-title">Your Messages</h3>
                        <p className="msg-no-chat-text">Select a conversation or start a new one</p>
                        <button
                            className="msg-start-btn"
                            onClick={() => { setShowNewChat(true); setShowChatPanel(false); }}
                        >
                            Send a message ✏️
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Chat Header */}
                        <div className="msg-chat-header">
                            <button
                                className="msg-back-btn"
                                onClick={() => {
                                    setShowChatPanel(false);
                                    navigate('/messages', { replace: true });
                                }}
                            >
                                ←
                            </button>

                            {activeConvInfo && (
                                <Link
                                    to={`/user/${activeConvInfo.username}`}
                                    className="msg-chat-user-info"
                                >
                                    <div className="msg-chat-avatar">
                                        {activeConvInfo.avatar ? (
                                            <img src={activeConvInfo.avatar} alt="" className="msg-avatar-img" />
                                        ) : '🌸'}
                                    </div>
                                    <div className="msg-chat-user-details">
                                        <span className="msg-chat-user-name">{activeConvInfo.name}</span>
                                        <span className="msg-chat-user-handle">@{activeConvInfo.username}</span>
                                    </div>
                                </Link>
                            )}
                        </div>

                        {/* Messages Area */}
                        <div className="msg-chat-body">
                            {loadingMsgs ? (
                                <div className="msg-loading" style={{ padding: '40px' }}>
                                    <div className="msg-loading-dot" />
                                    <div className="msg-loading-dot" />
                                    <div className="msg-loading-dot" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="msg-chat-empty">
                                    <span>👋</span>
                                    <p>Say hello! Start the conversation.</p>
                                </div>
                            ) : (
                                <>
                                    {messages.map((msg, i) => {
                                        // Show date separator
                                        const showDate = i === 0 ||
                                            new Date(msg.created_at).toDateString() !==
                                            new Date(messages[i - 1].created_at).toDateString();

                                        return (
                                            <div key={msg.id}>
                                                {showDate && (
                                                    <div className="msg-date-separator">
                                                        <span>{new Date(msg.created_at).toLocaleDateString('en-US', {
                                                            weekday: 'long',
                                                            month: 'short',
                                                            day: 'numeric',
                                                        })}</span>
                                                    </div>
                                                )}
                                                <ChatBubble
                                                    message={msg}
                                                    isMine={msg.sender_id === user.id}
                                                    senderProfile={
                                                        msg.sender_id === user.id
                                                            ? profile
                                                            : otherProfiles[msg.sender_id]
                                                    }
                                                    onDelete={handleDelete}
                                                />
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </>
                            )}
                        </div>

                        {/* Image Preview */}
                        {imagePreview && (
                            <div className="msg-image-preview">
                                <img src={imagePreview} alt="Attachment" />
                                <button className="msg-image-remove" onClick={removeImage}>✕</button>
                            </div>
                        )}

                        {/* Message Input */}
                        <div className="msg-chat-footer">
                            <button
                                className="msg-attach-btn"
                                onClick={() => fileInputRef.current?.click()}
                                title="Attach image"
                            >
                                📎
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleImageAttach}
                            />

                            <MentionInput
                                value={messageText}
                                onChange={setMessageText}
                                onSubmit={handleSend}
                                placeholder="Type a message... (@ to mention)"
                                className="msg-input-area"
                                disabled={sending}
                                autoFocus
                            />

                            <button
                                className={`msg-send-btn ${(messageText.trim() || attachedImage) ? 'active' : ''}`}
                                onClick={() => {
                                    const mentionMatches = messageText.match(/@(\w+)/g);
                                    const mentions = mentionMatches ? mentionMatches.map(m => m.slice(1)) : [];
                                    handleSend(messageText, mentions);
                                }}
                                disabled={sending || (!messageText.trim() && !attachedImage)}
                            >
                                {sending ? (
                                    <span className="msg-send-spinner">⏳</span>
                                ) : (
                                    <span>➤</span>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </section>
        </main>
    );
}
