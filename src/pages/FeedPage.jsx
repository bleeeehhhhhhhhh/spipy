import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import PostCard from '../components/PostCard';
import CreatePost from '../components/CreatePost';
import { getPosts, subscribeToChanges } from '../lib/supabase';

export default function FeedPage() {
    const [posts, setPosts] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [searchParams] = useSearchParams();
    const defaultTab = searchParams.get('tab') || 'note';

    const loadPosts = useCallback(async () => {
        const data = await getPosts();
        setPosts(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        loadPosts();
        const unsub = subscribeToChanges(() => loadPosts());
        return unsub;
    }, [loadPosts]);

    const filteredPosts = filter === 'all' ? posts : posts.filter(p => p.type === filter);

    return (
        <main className="main-content" id="feed-section">
            <motion.div className="section-header"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}>
                <h2 className="section-title">✦ The Feed ✦</h2>
                <p className="section-desc">See what everyone is sharing today 🌼</p>
            </motion.div>

            <CreatePost onPostCreated={loadPosts} defaultTab={defaultTab} />

            {/* Filter Tabs */}
            <div className="feed-filters">
                {[
                    { key: 'all', label: '✦ All' },
                    { key: 'note', label: '📝 Notes' },
                    { key: 'song', label: '🎵 Songs' },
                    { key: 'image', label: '📷 Photos' },
                ].map(f => (
                    <button key={f.key}
                        className={`filter-tab ${filter === f.key ? 'active' : ''}`}
                        onClick={() => setFilter(f.key)}>
                        {f.label}
                    </button>
                ))}
            </div>

            <div className="feed">
                {loading ? (
                    <div className="feed-empty">
                        <div className="empty-icon">⏳</div>
                        <div className="empty-text">Loading posts...</div>
                    </div>
                ) : filteredPosts.length === 0 ? (
                    <div className="feed-empty">
                        <div className="empty-icon">🌷</div>
                        <div className="empty-text">No posts yet!</div>
                        <div className="empty-hint">Be the first to share something cute ✨</div>
                    </div>
                ) : (
                    filteredPosts.map((post, i) => (
                        <PostCard key={post.id} post={post} index={i} onRefresh={loadPosts} />
                    ))
                )}
            </div>
        </main>
    );
}
