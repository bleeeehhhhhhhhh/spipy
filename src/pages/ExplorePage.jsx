import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import PostCard from '../components/PostCard';
import { getPosts } from '../lib/supabase';

export default function ExplorePage() {
    const [posts, setPosts] = useState([]);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [sort, setSort] = useState('recent');
    const [loading, setLoading] = useState(true);

    const loadPosts = useCallback(async () => {
        const data = await getPosts();
        setPosts(data);
        setLoading(false);
    }, []);

    useEffect(() => { loadPosts(); }, [loadPosts]);

    const filteredPosts = useMemo(() => {
        let result = posts;

        // Filter by type
        if (filter !== 'all') result = result.filter(p => p.type === filter);

        // Search
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(p =>
                (p.content || '').toLowerCase().includes(q) ||
                (p.caption || '').toLowerCase().includes(q) ||
                (p.username || '').toLowerCase().includes(q)
            );
        }

        // Sort
        if (sort === 'popular') {
            result = [...result].sort((a, b) => {
                const ra = a.reactions || {};
                const rb = b.reactions || {};
                const totalA = (ra.heart || 0) + (ra.star || 0) + (ra.sparkle || 0);
                const totalB = (rb.heart || 0) + (rb.star || 0) + (rb.sparkle || 0);
                return totalB - totalA;
            });
        }

        return result;
    }, [posts, filter, search, sort]);

    return (
        <main className="main-content">
            <motion.div className="section-header"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}>
                <h2 className="section-title">✿ Explore ✿</h2>
                <p className="section-desc">Discover amazing posts from the community 🌸</p>
            </motion.div>

            {/* Search & Sort Bar */}
            <div className="explore-controls">
                <div className="search-bar">
                    <span className="search-icon">🔍</span>
                    <input type="text" className="search-input" placeholder="Search posts, users, captions..."
                        value={search} onChange={e => setSearch(e.target.value)} />
                    {search && <button className="search-clear" onClick={() => setSearch('')}>✕</button>}
                </div>
                <div className="sort-controls">
                    <button className={`sort-btn ${sort === 'recent' ? 'active' : ''}`} onClick={() => setSort('recent')}>
                        🕐 Recent
                    </button>
                    <button className={`sort-btn ${sort === 'popular' ? 'active' : ''}`} onClick={() => setSort('popular')}>
                        🔥 Popular
                    </button>
                </div>
            </div>

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
                        <div className="empty-text">Discovering posts...</div>
                    </div>
                ) : filteredPosts.length === 0 ? (
                    <div className="feed-empty">
                        <div className="empty-icon">🔍</div>
                        <div className="empty-text">{search ? 'No results found' : 'No posts yet!'}</div>
                        <div className="empty-hint">{search ? 'Try a different search term' : 'Be the first to share something cute ✨'}</div>
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
