import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import PostCard from '../components/PostCard';
import { useAuth } from '../contexts/AuthContext';
import { getPosts } from '../lib/supabase';

export default function ProfilePage() {
    const { user, profile } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadPosts = useCallback(async () => {
        if (!user) return;
        const all = await getPosts();
        setPosts(all.filter(p => p.user_id === user.id));
        setLoading(false);
    }, [user]);

    useEffect(() => { loadPosts(); }, [loadPosts]);

    if (!user || !profile) {
        return (
            <main className="main-content">
                <div className="feed-empty">
                    <div className="empty-icon">🔒</div>
                    <div className="empty-text">Please log in to view your profile</div>
                </div>
            </main>
        );
    }

    return (
        <main className="main-content">
            <motion.section className="profile-section" style={{ display: 'block' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}>
                <div className="profile-inner">
                    <div className="profile-card">
                        <div className="profile-card-header">
                            <div className="profile-avatar-lg">
                                {profile.avatar_url ? (
                                    <img src={profile.avatar_url} alt="avatar" className="profile-avatar-img" />
                                ) : '🌸'}
                            </div>
                            <div className="profile-info">
                                <h2 className="profile-display-name">{profile.display_name || profile.username}</h2>
                                <span className="profile-username-tag">@{profile.username}</span>
                            </div>
                        </div>
                        <p className="profile-bio">{profile.bio || 'No bio yet — tell us about yourself! ✿'}</p>
                        <div className="profile-stats-row">
                            <div className="profile-stat">
                                <span className="profile-stat-num">{posts.length}</span>
                                <span className="profile-stat-label">Posts</span>
                            </div>
                            <div className="profile-stat">
                                <span className="profile-stat-num">0</span>
                                <span className="profile-stat-label">Comments</span>
                            </div>
                            <div className="profile-stat">
                                <span className="profile-stat-num">{useAuth().bookmarks.length}</span>
                                <span className="profile-stat-label">Bookmarks</span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.section>

            <div className="section-header">
                <h2 className="section-title">✦ My Posts ✦</h2>
                <p className="section-desc">Everything you've shared on shae 🌼</p>
            </div>

            <div className="feed">
                {loading ? (
                    <div className="feed-empty">
                        <div className="empty-icon">⏳</div>
                        <div className="empty-text">Loading your posts...</div>
                    </div>
                ) : posts.length === 0 ? (
                    <div className="feed-empty">
                        <div className="empty-icon">🌷</div>
                        <div className="empty-text">You haven't posted anything yet!</div>
                        <div className="empty-hint">Head to the Feed and share something cute ✨</div>
                    </div>
                ) : (
                    posts.map((post, i) => (
                        <PostCard key={post.id} post={post} index={i} onRefresh={loadPosts} />
                    ))
                )}
            </div>
        </main>
    );
}
