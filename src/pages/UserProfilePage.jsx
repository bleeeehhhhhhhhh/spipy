import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PostCard from '../components/PostCard';
import { getProfileByUsername, getPostsByUserId, getOrCreateConversation } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function UserProfilePage() {
    const { username } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [startingChat, setStartingChat] = useState(false);

    const loadProfile = useCallback(async () => {
        setLoading(true);
        const p = await getProfileByUsername(username);
        if (!p) {
            setNotFound(true);
            setLoading(false);
            return;
        }
        setProfile(p);
        const userPosts = await getPostsByUserId(p.id);
        setPosts(userPosts);
        setLoading(false);
    }, [username]);

    useEffect(() => { loadProfile(); }, [loadProfile]);

    const handleSendMessage = async () => {
        if (!user || !profile || startingChat) return;
        setStartingChat(true);
        try {
            const convId = await getOrCreateConversation(user.id, profile.id);
            if (convId) {
                navigate(`/messages/${convId}`);
            } else {
                alert('Could not start conversation. Please make sure the messaging database is set up.');
            }
        } catch (err) {
            console.error('Failed to start conversation:', err);
            alert('Failed to start conversation: ' + (err?.message || 'Unknown error. Make sure MESSAGING_SETUP.sql has been run in Supabase.'));
        }
        setStartingChat(false);
    };

    if (loading) {
        return (
            <main className="main-content">
                <div className="feed-empty">
                    <div className="empty-icon">⏳</div>
                    <div className="empty-text">Loading profile...</div>
                </div>
            </main>
        );
    }

    if (notFound) {
        return (
            <main className="main-content">
                <div className="feed-empty">
                    <div className="empty-icon">😿</div>
                    <div className="empty-text">User not found</div>
                    <div className="empty-hint">@{username} doesn't exist</div>
                    <Link to="/explore" className="btn-primary" style={{ marginTop: '20px', display: 'inline-block' }}>
                        Back to Explore
                    </Link>
                </div>
            </main>
        );
    }

    const isOwnProfile = user && profile && user.id === profile.id;

    return (
        <main className="main-content">
            <motion.section className="profile-section" style={{ display: 'block' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}>
                <div className="profile-inner">
                    <div className="profile-card user-profile-card">
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
                        <p className="profile-bio">{profile.bio || 'No bio yet ✿'}</p>
                        <div className="profile-stats-row">
                            <div className="profile-stat">
                                <span className="profile-stat-num">{posts.length}</span>
                                <span className="profile-stat-label">Posts</span>
                            </div>
                        </div>
                        <div className="profile-actions-row">
                            {isOwnProfile ? (
                                <Link to="/profile" className="btn-primary" style={{ marginTop: '16px', display: 'inline-block', fontSize: '14px', padding: '10px 24px' }}>
                                    Go to My Profile
                                </Link>
                            ) : user && (
                                <button
                                    className="btn-send-message"
                                    onClick={handleSendMessage}
                                    disabled={startingChat}
                                >
                                    {startingChat ? '⏳ Opening...' : '💬 Send Message'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </motion.section>

            <div className="section-header">
                <h2 className="section-title">✦ Posts by @{profile.username} ✦</h2>
            </div>

            <div className="feed">
                {posts.length === 0 ? (
                    <div className="feed-empty">
                        <div className="empty-icon">🌷</div>
                        <div className="empty-text">No posts yet</div>
                        <div className="empty-hint">@{profile.username} hasn't posted anything yet</div>
                    </div>
                ) : (
                    posts.map((post, i) => (
                        <PostCard key={post.id} post={post} index={i} onRefresh={loadProfile} />
                    ))
                )}
            </div>
        </main>
    );
}

