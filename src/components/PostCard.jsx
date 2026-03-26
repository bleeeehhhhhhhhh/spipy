import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { getComments, addComment, deleteComment, updatePostReactions, deletePost as deletePostApi, addBookmark, removeBookmark, getPosts, generateId } from '../lib/supabase';

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getTimeAgo(isoString) {
    const now = new Date();
    const then = new Date(isoString);
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
    return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function spawnReactionParticles(element, emoji) {
    const rect = element.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const particle = document.createElement('div');
    particle.className = 'reaction-particle';
    particle.textContent = emoji;
    particle.style.left = (cx - 10) + 'px';
    particle.style.top = (cy - 10) + 'px';
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 850);
    const colors = ['#DC143C', '#FF1744', '#FF5252', '#B71C1C', '#FF8A80', '#E53935'];
    const count = 6 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
        const spark = document.createElement('div');
        spark.className = 'sparkle-burst';
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const dist = 25 + Math.random() * 30;
        spark.style.left = cx + 'px';
        spark.style.top = cy + 'px';
        spark.style.background = colors[Math.floor(Math.random() * colors.length)];
        spark.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
        spark.style.setProperty('--ty', Math.sin(angle) * dist + 'px');
        spark.style.width = (3 + Math.random() * 5) + 'px';
        spark.style.height = spark.style.width;
        document.body.appendChild(spark);
        setTimeout(() => spark.remove(), 650);
    }
}

export default function PostCard({ post, index = 0, onRefresh }) {
    const { user, profile, bookmarks, setBookmarks, refreshBookmarks } = useAuth();
    const showToast = useToast();
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);
    const [submittingComment, setSubmittingComment] = useState(false);

    const typeLabels = {
        note: { icon: '📝', label: 'Note', class: 'note' },
        song: { icon: '🎵', label: 'Song', class: 'song' },
        image: { icon: '📷', label: 'Photo', class: 'image' },
    };
    const typeInfo = typeLabels[post.type] || typeLabels.note;
    const timeAgo = getTimeAgo(post.timestamp);
    const reactions = post.reactions || { heart: 0, star: 0, sparkle: 0 };
    const isOwner = user && post.user_id === user.id;
    const isBookmarked = bookmarks.includes(post.id);

    const handleReaction = async (type, e) => {
        const btn = e.currentTarget;
        btn.classList.remove('reacting');
        void btn.offsetWidth;
        btn.classList.add('reacting');
        setTimeout(() => btn.classList.remove('reacting'), 500);
        const emojis = { heart: '🩷', star: '⭐', sparkle: '✨' };
        spawnReactionParticles(btn, emojis[type] || '✨');
        try {
            const updatedReactions = { ...reactions, [type]: (reactions[type] || 0) + 1 };
            await updatePostReactions(post.id, updatedReactions);
            if (onRefresh) onRefresh();
        } catch (error) {
            showToast('😭 Error reacting: ' + error.message);
        }
    };

    const handleDelete = async () => {
        try {
            await deletePostApi(post.id);
            showToast('🗑️ Post deleted');
            if (onRefresh) onRefresh();
        } catch (error) {
            showToast('😭 Error: ' + error.message);
        }
    };

    const handleToggleBookmark = async () => {
        if (!user) return;
        try {
            if (isBookmarked) {
                await removeBookmark(user.id, post.id);
                setBookmarks(prev => prev.filter(id => id !== post.id));
                showToast('🔖 Bookmark removed');
            } else {
                await addBookmark(user.id, post.id);
                setBookmarks(prev => [...prev, post.id]);
                showToast('🔖 Post bookmarked!');
            }
        } catch (error) {
            showToast('😭 Error: ' + error.message);
        }
    };

    const loadComments = async () => {
        setLoadingComments(true);
        const data = await getComments(post.id);
        setComments(data);
        setLoadingComments(false);
    };

    const handleToggleComments = async () => {
        if (!showComments) await loadComments();
        setShowComments(!showComments);
    };

    const handleSubmitComment = async () => {
        if (!user || submittingComment) return;
        if (!commentText.trim()) { showToast('✏️ Write a comment first!'); return; }
        setSubmittingComment(true);
        try {
            await addComment({
                id: generateId(),
                post_id: post.id,
                user_id: user.id,
                username: profile?.username || 'Anonymous',
                content: commentText.trim(),
            });
            setCommentText('');
            await loadComments();
            showToast('💬 Comment added!');
        } catch (error) {
            console.error('Comment error:', error);
            showToast('😭 Error: ' + error.message);
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleDeleteComment = async (commentId) => {
        try {
            await deleteComment(commentId);
            await loadComments();
            showToast('🗑️ Comment deleted');
        } catch (error) {
            showToast('😭 Error: ' + error.message);
        }
    };

    let bodyContent;
    switch (post.type) {
        case 'note':
            bodyContent = <p className="post-note-text">{post.content}</p>;
            break;
        case 'song':
            bodyContent = (
                <>
                    {post.caption && <p className="post-note-text" style={{ marginBottom: '12px' }}>{post.caption}</p>}
                    <div className="post-spotify-embed">
                        <iframe src={post.content} width="100%" height="152" frameBorder="0"
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                            loading="lazy" style={{ borderRadius: '12px' }} />
                    </div>
                </>
            );
            break;
        case 'image':
            bodyContent = (
                <>
                    <img className="post-image" src={post.content} alt="Shared photo" loading="lazy" />
                    {post.caption && <p className="post-note-text" style={{ marginTop: '12px' }}>{post.caption}</p>}
                </>
            );
            break;
        default:
            bodyContent = <p className="post-note-text">{post.content}</p>;
    }

    return (
        <div className="post-card" style={{ animationDelay: `${index * 0.08}s` }}>
            <div className="post-card-header">
                <div className="post-author-info">
                    <span className="post-author-avatar">🌸</span>
                    <Link to={`/user/${post.username || 'Anonymous'}`} className="post-author-name-link">
                        <span className="post-author-name">@{post.username || 'Anonymous'}</span>
                    </Link>
                </div>
                <div className="post-header-right">
                    <span className={`post-type-badge ${typeInfo.class}`}>
                        {typeInfo.icon} {typeInfo.label}
                    </span>
                    {isOwner && (
                        <button className="post-delete-btn" onClick={handleDelete} title="Delete post">✕</button>
                    )}
                </div>
            </div>
            <div className="post-card-body">{bodyContent}</div>
            <div className="post-card-footer">
                <span className="post-timestamp">{timeAgo}</span>
                <div className="post-actions">
                    <div className="post-reactions">
                        <button className="reaction-btn" onClick={(e) => handleReaction('heart', e)}>
                            🩷 {reactions.heart || ''}
                        </button>
                        <button className="reaction-btn" onClick={(e) => handleReaction('star', e)}>
                            ⭐ {reactions.star || ''}
                        </button>
                        <button className="reaction-btn" onClick={(e) => handleReaction('sparkle', e)}>
                            ✨ {reactions.sparkle || ''}
                        </button>
                    </div>
                    <button className="action-btn comment-toggle-btn" onClick={handleToggleComments} title="Comments">💬</button>
                    {user && (
                        <button className={`action-btn bookmark-btn ${isBookmarked ? 'bookmarked' : ''}`}
                            onClick={handleToggleBookmark} title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}>
                            {isBookmarked ? '🔖' : '🏷️'}
                        </button>
                    )}
                </div>
            </div>

            {showComments && (
                <div className="post-comments">
                    <div className="comment-list">
                        {loadingComments ? (
                            <div className="comment-empty">Loading...</div>
                        ) : comments.length === 0 ? (
                            <div className="comment-empty">No comments yet — be the first! 💬</div>
                        ) : (
                            comments.map(c => (
                                <div key={c.id} className="comment-item">
                                    <div className="comment-header">
                                        <div className="comment-author-info">
                                            <span className="comment-author-avatar">
                                                {c.profiles?.avatar_url ? <img src={c.profiles.avatar_url} alt="avatar" className="comment-avatar-img" /> : '🌸'}
                                            </span>
                                            <Link to={`/user/${c.username || c.profiles?.username || 'Anonymous'}`} className="comment-author-link">
                                                <span className="comment-author">@{c.username || c.profiles?.username || 'Anonymous'}</span>
                                            </Link>
                                        </div>
                                        <span className="comment-time">{getTimeAgo(c.created_at)}</span>
                                        {user && user.id === c.user_id && (
                                            <button className="comment-delete-btn" onClick={() => handleDeleteComment(c.id)} title="Delete">✕</button>
                                        )}
                                    </div>
                                    <p className="comment-text">{c.content}</p>
                                </div>
                            ))
                        )}
                    </div>
                    {user && (
                        <div className="comment-input-wrap">
                            <input className="comment-input" type="text" placeholder="Write a comment..."
                                value={commentText} onChange={e => setCommentText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSubmitComment()} />
                            <button className="comment-send-btn" onClick={handleSubmitComment} disabled={submittingComment}>
                                {submittingComment ? '...' : '↗'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
