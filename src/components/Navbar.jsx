import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import NotificationBell from './NotificationBell';
import { getConversations, subscribeToNotifications } from '../lib/supabase';

function LogoSparkle({ x, y }) {
    return (
        <span className="logo-sparkle-particle" style={{
            left: x + 'px', top: y + 'px',
            '--sx': (Math.random() - 0.5) * 80 + 'px',
            '--sy': (Math.random() - 0.5) * 80 + 'px',
        }} />
    );
}

function LogoBow({ hovered }) {
    return (
        <span className={`logo-bow-text ${hovered ? 'bow-wiggle' : ''}`}>
            <span className="bow-loop bow-left" />
            <span className="bow-knot" />
            <span className="bow-loop bow-right" />
        </span>
    );
}

export default function Navbar({ onOpenAuth, onOpenProfile }) {
    const { user, profile, signOut } = useAuth();
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [sparkles, setSparkles] = useState([]);
    const [logoHovered, setLogoHovered] = useState(false);
    const [unreadMsgCount, setUnreadMsgCount] = useState(0);
    const logoRef = useRef(null);
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Track unread messages
    useEffect(() => {
        if (!user) { setUnreadMsgCount(0); return; }

        const loadUnread = async () => {
            try {
                const convos = await getConversations(user.id);
                let count = 0;
                convos.forEach(c => {
                    const myPart = c.participants?.find(p => p.user_id === user.id);
                    if (c.last_message && myPart
                        && new Date(c.last_message.created_at) > new Date(myPart.last_read_at)
                        && c.last_message.sender_id !== user.id) {
                        count++;
                    }
                });
                setUnreadMsgCount(count);
            } catch { }
        };

        loadUnread();

        // Refresh on notification (new message triggers a notification)
        const unsub = subscribeToNotifications(user.id, (payload) => {
            if (payload.eventType === 'INSERT' && payload.new?.type === 'message') {
                // Only bump count if we're not on the messages page
                if (!window.location.pathname.startsWith('/messages')) {
                    setUnreadMsgCount(prev => prev + 1);
                }
            }
        });

        return unsub;
    }, [user]);

    // Reset unread count when visiting messages page
    useEffect(() => {
        if (location.pathname.startsWith('/messages') && user) {
            setUnreadMsgCount(0);
        }
    }, [location.pathname, user]);

    const handleLogoEnter = useCallback((e) => {
        setLogoHovered(true);
        const rect = logoRef.current?.getBoundingClientRect();
        if (!rect) return;
        const newSparkles = Array.from({ length: 8 }, (_, i) => ({
            id: Date.now() + i,
            x: e.clientX - rect.left + (Math.random() - 0.5) * 50,
            y: e.clientY - rect.top + (Math.random() - 0.5) * 30,
        }));
        setSparkles(prev => [...prev, ...newSparkles]);
        setTimeout(() => setSparkles(prev => prev.filter(s => !newSparkles.find(n => n.id === s.id))), 800);
    }, []);

    const handleLogoMouseMove = useCallback((e) => {
        if (!logoRef.current) return;
        const rect = logoRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / rect.width;
        const dy = (e.clientY - cy) / rect.height;
        logoRef.current.style.transform = `perspective(400px) rotateY(${dx * 14}deg) rotateX(${-dy * 14}deg) scale(1.08)`;
    }, []);

    const handleLogoLeave = useCallback(() => {
        setLogoHovered(false);
        if (logoRef.current) logoRef.current.style.transform = '';
    }, []);

    const handleSignOut = async () => {
        await signOut();
        setMenuOpen(false);
    };

    const toggleTheme = () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('spipy_theme', next);
    };

    const isActive = (path) => location.pathname === path || (path === '/messages' && location.pathname.startsWith('/messages'));

    return (
        <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
            <Link to="/" className="nav-logo">
                <span
                    className={`nav-logo-text animated-logo rainbow-logo ${logoHovered ? 'logo-hovered' : ''}`}
                    ref={logoRef}
                    onMouseEnter={handleLogoEnter}
                    onMouseMove={handleLogoMouseMove}
                    onMouseLeave={handleLogoLeave}
                >
                    {'Sha'.split('').map((letter, i) => (
                        <span key={i} className="logo-letter rainbow-letter" style={{ animationDelay: `${i * 0.12}s` }}>{letter}</span>
                    ))}
                    <span className="logo-letter-e-wrap">
                        <span className="logo-letter rainbow-letter" style={{ animationDelay: '0.36s' }}>e</span>
                        <LogoBow hovered={logoHovered} />
                    </span>
                    {sparkles.map(s => <LogoSparkle key={s.id} x={s.x} y={s.y} />)}
                </span>
            </Link>

            <button className={`mobile-menu-btn ${mobileOpen ? 'open' : ''}`} onClick={() => setMobileOpen(!mobileOpen)}>
                <span></span><span></span><span></span>
            </button>

            <div className={`nav-right ${mobileOpen ? 'mobile-open' : ''}`}>
                <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme" aria-label="Toggle theme">
                    <span className="theme-icon sun">☀️</span>
                    <span className="theme-icon moon">🌙</span>
                    <span className="theme-slider"></span>
                </button>

                <ul className="nav-links">
                    <li><Link to="/" className={isActive('/') ? 'active' : ''} onClick={() => setMobileOpen(false)}>Home</Link></li>
                    <li><Link to="/feed" className={isActive('/feed') ? 'active' : ''} onClick={() => setMobileOpen(false)}>Feed</Link></li>
                    <li><Link to="/explore" className={isActive('/explore') ? 'active' : ''} onClick={() => setMobileOpen(false)}>Explore</Link></li>
                    {user && <li><Link to="/bookmarks" className={isActive('/bookmarks') ? 'active' : ''} onClick={() => setMobileOpen(false)}>Bookmarks</Link></li>}
                    {user && (
                        <li>
                            <Link to="/messages" className={`nav-messages-link ${isActive('/messages') ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
                                💬 Messages
                                {unreadMsgCount > 0 && (
                                    <span className="nav-msg-badge">{unreadMsgCount > 9 ? '9+' : unreadMsgCount}</span>
                                )}
                            </Link>
                        </li>
                    )}
                </ul>

                <div className="nav-auth">
                    {!user ? (
                        <button className="btn-login" onClick={onOpenAuth}>Login ✦</button>
                    ) : (
                        <div className="nav-user">
                            <NotificationBell />

                            <div className="nav-user-menu">
                                <button className="nav-user-trigger" onClick={() => setMenuOpen(!menuOpen)}>
                                    <div className="nav-avatar">
                                        {profile?.avatar_url ? (
                                            <img src={profile.avatar_url} alt="avatar" className="nav-avatar-img" />
                                        ) : '🌸'}
                                    </div>
                                    <span className="nav-username">{profile?.display_name || profile?.username || 'User'}</span>
                                    <span className="nav-chevron">▾</span>
                                </button>
                                {menuOpen && (
                                    <div className="nav-dropdown open">
                                        <button className="nav-dropdown-item" onClick={() => { onOpenProfile(); setMenuOpen(false); setMobileOpen(false); }}>
                                            <span>✏️</span> Edit Profile
                                        </button>
                                        <Link to="/profile" className="nav-dropdown-item" onClick={() => { setMenuOpen(false); setMobileOpen(false); }}>
                                            <span>👤</span> My Profile
                                        </Link>
                                        <Link to="/messages" className="nav-dropdown-item" onClick={() => { setMenuOpen(false); setMobileOpen(false); }}>
                                            <span>💬</span> Messages
                                        </Link>
                                        <div className="nav-dropdown-divider"></div>
                                        <button className="nav-dropdown-item logout" onClick={handleSignOut}>
                                            <span>👋</span> Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}

