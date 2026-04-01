import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ChatBubble({ message, isMine, senderProfile, onDelete }) {
    const [showActions, setShowActions] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    if (message.is_deleted) {
        return (
            <div className={`chat-bubble-wrap ${isMine ? 'mine' : 'theirs'}`}>
                <div className="chat-bubble deleted">
                    <span className="chat-deleted-text">🗑️ Message deleted</span>
                </div>
            </div>
        );
    }

    const formatTime = (dateStr) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Render content with clickable @mentions
    const renderContent = (text) => {
        const parts = text.split(/(@\w+)/g);
        return parts.map((part, i) => {
            if (part.startsWith('@')) {
                const username = part.slice(1);
                return (
                    <Link
                        key={i}
                        to={`/user/${username}`}
                        className="chat-mention-link"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {part}
                    </Link>
                );
            }
            return <span key={i}>{part}</span>;
        });
    };

    const handleDelete = () => {
        if (!confirmDelete) {
            setConfirmDelete(true);
            setTimeout(() => setConfirmDelete(false), 3000);
            return;
        }
        onDelete?.(message.id);
    };

    return (
        <div
            className={`chat-bubble-wrap ${isMine ? 'mine' : 'theirs'}`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => { setShowActions(false); setConfirmDelete(false); }}
        >
            {!isMine && senderProfile && (
                <Link to={`/user/${senderProfile.username}`} className="chat-bubble-avatar">
                    {senderProfile.avatar_url ? (
                        <img src={senderProfile.avatar_url} alt="" className="chat-avatar-img" />
                    ) : '🌸'}
                </Link>
            )}

            <div className="chat-bubble-content">
                {!isMine && senderProfile && (
                    <Link to={`/user/${senderProfile.username}`} className="chat-sender-name">
                        {senderProfile.display_name || senderProfile.username}
                    </Link>
                )}

                <div className={`chat-bubble ${isMine ? 'sent' : 'received'}`}>
                    <p className="chat-bubble-text">{renderContent(message.content)}</p>

                    {message.image_url && (
                        <img src={message.image_url} alt="Shared" className="chat-bubble-image" />
                    )}
                </div>

                <div className="chat-bubble-meta">
                    <span className="chat-bubble-time">{formatTime(message.created_at)}</span>

                    {isMine && showActions && (
                        <button
                            className={`chat-delete-btn ${confirmDelete ? 'confirm' : ''}`}
                            onClick={handleDelete}
                            title={confirmDelete ? 'Click again to confirm' : 'Delete message'}
                        >
                            {confirmDelete ? '⚠️ Confirm?' : '🗑️'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
