import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    subscribeToNotifications,
} from '../lib/supabase';

export default function NotificationBell() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const panelRef = useRef(null);

    // Close panel when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load notifications
    useEffect(() => {
        if (!user) return;

        const loadNotifications = async () => {
            setLoading(true);
            try {
                const data = await getNotifications(user.id);
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.is_read).length);
            } catch (err) {
                console.error('Failed to load notifications:', err);
            }
            setLoading(false);
        };

        loadNotifications();

        // Subscribe to realtime notifications
        const unsub = subscribeToNotifications(user.id, (payload) => {
            if (payload.eventType === 'INSERT') {
                setNotifications(prev => [payload.new, ...prev]);
                setUnreadCount(prev => prev + 1);
            } else if (payload.eventType === 'UPDATE') {
                setNotifications(prev =>
                    prev.map(n => n.id === payload.new.id ? payload.new : n)
                );
                // Recalculate unread
                setNotifications(prev => {
                    setUnreadCount(prev.filter(n => !n.is_read).length);
                    return prev;
                });
            }
        });

        return unsub;
    }, [user]);

    const handleToggle = () => {
        setIsOpen(!isOpen);
    };

    const handleMarkRead = async (notifId) => {
        try {
            await markNotificationRead(notifId);
            setNotifications(prev =>
                prev.map(n => n.id === notifId ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Failed to mark notification read:', err);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllNotificationsRead(user.id);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Failed to mark all read:', err);
        }
    };

    const getNotifIcon = (type) => {
        switch (type) {
            case 'message': return '💬';
            case 'mention': return '🏷️';
            case 'like': return '❤️';
            case 'comment': return '💭';
            case 'system': return '🔔';
            default: return '🔔';
        }
    };

    const formatTime = (dateStr) => {
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

    if (!user) return null;

    return (
        <div className="notif-bell-wrap" ref={panelRef}>
            <button
                className={`notif-bell-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
                onClick={handleToggle}
                title="Notifications"
                aria-label="Notifications"
                id="notification-bell"
            >
                <span className="notif-bell-icon">🔔</span>
                {unreadCount > 0 && (
                    <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div className="notif-panel">
                    <div className="notif-panel-header">
                        <h3 className="notif-panel-title">Notifications</h3>
                        {unreadCount > 0 && (
                            <button className="notif-mark-all" onClick={handleMarkAllRead}>
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="notif-panel-body">
                        {loading && (
                            <div className="notif-loading">Loading...</div>
                        )}

                        {!loading && notifications.length === 0 && (
                            <div className="notif-empty">
                                <span className="notif-empty-icon">🔕</span>
                                <span>No notifications yet</span>
                            </div>
                        )}

                        {notifications.slice(0, 20).map(notif => (
                            <Link
                                key={notif.id}
                                to={notif.link || '#'}
                                className={`notif-item ${!notif.is_read ? 'unread' : ''}`}
                                onClick={() => {
                                    if (!notif.is_read) handleMarkRead(notif.id);
                                    setIsOpen(false);
                                }}
                            >
                                <span className="notif-item-icon">{getNotifIcon(notif.type)}</span>
                                <div className="notif-item-content">
                                    <span className="notif-item-title">{notif.title}</span>
                                    {notif.body && (
                                        <span className="notif-item-body">{notif.body.slice(0, 80)}{notif.body.length > 80 ? '...' : ''}</span>
                                    )}
                                    <span className="notif-item-time">{formatTime(notif.created_at)}</span>
                                </div>
                                {!notif.is_read && <span className="notif-unread-dot" />}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
