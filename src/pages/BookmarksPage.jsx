import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import PostCard from '../components/PostCard';
import { useAuth } from '../contexts/AuthContext';
import { getPosts } from '../lib/supabase';

export default function BookmarksPage() {
    const { user, bookmarks } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadPosts = useCallback(async () => {
        if (!user || bookmarks.length === 0) { setPosts([]); setLoading(false); return; }
        const all = await getPosts();
        setPosts(all.filter(p => bookmarks.includes(p.id)));
        setLoading(false);
    }, [user, bookmarks]);

    useEffect(() => { loadPosts(); }, [loadPosts]);

    if (!user) {
        return (
            <main className="main-content">
                <div className="feed-empty">
                    <div className="empty-icon">🔒</div>
                    <div className="empty-text">Please log in to view your bookmarks</div>
                </div>
            </main>
        );
    }

    return (
        <main className="main-content">
            <motion.div className="section-header"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}>
                <h2 className="section-title">🔖 Bookmarks</h2>
                <p className="section-desc">Your saved posts — always here for you 💕</p>
            </motion.div>

            <div className="feed">
                {loading ? (
                    <div className="feed-empty">
                        <div className="empty-icon">⏳</div>
                        <div className="empty-text">Loading bookmarks...</div>
                    </div>
                ) : posts.length === 0 ? (
                    <div className="feed-empty">
                        <div className="empty-icon">🔖</div>
                        <div className="empty-text">No bookmarks yet!</div>
                        <div className="empty-hint">
                            Browse the <Link to="/feed" style={{ color: 'var(--pink-deep)', textDecoration: 'none', fontWeight: 600 }}>Feed</Link> and bookmark posts you love ✨
                        </div>
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
