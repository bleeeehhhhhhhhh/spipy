import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import CubesBackground from '../components/CubesBackground';
import GlowCard from '../components/GlowCard';
import FadeContent from '../components/FadeContent';
import ScrollStack, { ScrollStackItem } from '../components/ScrollStack';
import ButtonMascot from '../components/ButtonMascot';
import { getPosts } from '../lib/supabase';

function AnimatedNumber({ target }) {
    const [value, setValue] = useState(0);
    useEffect(() => {
        const duration = 600;
        const start = performance.now();
        function tick(now) {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(target * eased));
            if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }, [target]);
    return <span>{value}</span>;
}

export default function HomePage() {
    const [stats, setStats] = useState({ posts: 0, notes: 0, songs: 0 });

    useEffect(() => {
        (async () => {
            const posts = await getPosts();
            setStats({
                posts: posts.length,
                notes: posts.filter(p => p.type === 'note').length,
                songs: posts.filter(p => p.type === 'song').length,
            });
        })();
    }, []);

    return (
        <>
            {/* Hero Section */}
            <section className="hero" id="hero">
                <CubesBackground />
                <motion.div className="hero-content"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}>

                    <div className="hero-badge">✦ Your cozy corner on the internet</div>

                    <h1 className="hero-title">
                        <span className="hero-shae-animated">
                            {'Shae'.split('').map((letter, i) => (
                                <span key={i} className="hero-letter" style={{ animationDelay: `${i * 0.12}s` }}>{letter}</span>
                            ))}
                            <span className="hero-sparkle-wrap">
                                <svg className="hero-sparkle-svg" width="28" height="28" viewBox="0 0 28 28">
                                    <path d="M14 0 L16.5 11.5 L28 14 L16.5 16.5 L14 28 L11.5 16.5 L0 14 L11.5 11.5 Z" fill="url(#sparkleGrad)">
                                        <animateTransform attributeName="transform" type="rotate" from="0 14 14" to="360 14 14" dur="4s" repeatCount="indefinite" />
                                    </path>
                                    <defs>
                                        <linearGradient id="sparkleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#FFB6C1" />
                                            <stop offset="50%" stopColor="#C4A8E0" />
                                            <stop offset="100%" stopColor="#89CFF0" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                            </span>
                        </span>
                        <span className="title-buddy">
                            <svg className="buddy-svg" width="44" height="52" viewBox="0 0 44 52">
                                <ellipse cx="22" cy="26" rx="18" ry="22" fill="#FFF5F5" stroke="#FFD6E0" strokeWidth="1.5" />
                                <ellipse cx="5" cy="30" rx="4" ry="2.5" fill="#FFF5F5" stroke="#FFD6E0" strokeWidth="1" transform="rotate(-20 5 30)" />
                                <ellipse cx="39" cy="30" rx="4" ry="2.5" fill="#FFF5F5" stroke="#FFD6E0" strokeWidth="1" transform="rotate(20 39 30)" />
                                <circle className="buddy-eye-l" cx="16" cy="22" r="2" fill="#5A4A6A" />
                                <circle className="buddy-eye-r" cx="28" cy="22" r="2" fill="#5A4A6A" />
                                <circle cx="16.8" cy="21.4" r="0.8" fill="#FFF" />
                                <circle cx="28.8" cy="21.4" r="0.8" fill="#FFF" />
                                <ellipse className="buddy-blush" cx="10" cy="28" rx="4" ry="2.5" fill="#FFB6C1" opacity="0.5" />
                                <ellipse className="buddy-blush" cx="34" cy="28" rx="4" ry="2.5" fill="#FFB6C1" opacity="0.5" />
                                <path className="buddy-mouth" d="M19 30 Q22 34 25 30" stroke="#FF85A2" strokeWidth="1.3" fill="none" strokeLinecap="round" />
                            </svg>
                        </span>
                        <br />
                        <span style={{ fontSize: '0.5em', opacity: 0.85 }}>share your world ✨</span>
                    </h1>

                    <p className="hero-subtitle">
                        Drop your notes, favorite Spotify songs, and photos ✨<br />
                        A cute space only for my baby 🌷
                    </p>

                    <div className="hero-buttons">
                        <Link to="/feed" className="btn-primary"><ButtonMascot animal="bunny" /> Start Posting ♡</Link>
                        <Link to="/explore" className="btn-secondary"><ButtonMascot animal="cat" /> Explore Feed 🌸</Link>
                    </div>

                    <div className="hero-stats">
                        <div className="stat">
                            <div className="stat-number"><AnimatedNumber target={stats.posts} /></div>
                            <div className="stat-label">Posts shared</div>
                        </div>
                        <div className="stat">
                            <div className="stat-number"><AnimatedNumber target={stats.notes} /></div>
                            <div className="stat-label">Notes written</div>
                        </div>
                        <div className="stat">
                            <div className="stat-number"><AnimatedNumber target={stats.songs} /></div>
                            <div className="stat-label">Songs added</div>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* About Section — with FadeContent and ScrollStack */}
            <section className="about-section" id="about-section">
                <div className="about-inner">
                    <FadeContent blur={true} duration={800}>
                        <div className="section-header">
                            <h2 className="section-title">✿ What is shae? ✿</h2>
                            <p className="section-desc">A kawaii social space to express yourself 🌷</p>
                        </div>
                    </FadeContent>

                    <ScrollStack itemDistance={40} itemScale={0.02} itemStackDistance={15} baseScale={0.92}>
                        {[
                            { icon: '📝', title: 'Share Notes', desc: 'Write down your thoughts, poems, or daily musings. Every note gets a cozy card with reactions!' },
                            { icon: '🎵', title: 'Drop Songs', desc: 'Paste any Spotify link and it becomes an embedded player. Share your current vibe with the world!' },
                            { icon: '📷', title: 'Post Photos', desc: 'Upload your favorite pics — selfies, art, pets, food. Drag & drop or click to upload!' },
                            { icon: '💬', title: 'Comment & React', desc: 'Leave cute comments and react with hearts, stars, and sparkles on posts you love!' },
                            { icon: '🔖', title: 'Bookmark Favs', desc: 'Save your favorite posts to revisit later. Your bookmarks are private, just for you!' },
                            { icon: '🌙', title: 'Dark Mode', desc: 'Switch between light and dark themes. Both look gorgeous with our kawaii aesthetic!' },
                        ].map((card, i) => (
                            <ScrollStackItem key={i}>
                                <FadeContent blur={true} duration={600} delay={i * 80}>
                                    <GlowCard className="about-card">
                                        <div className="about-card-icon">{card.icon}</div>
                                        <h3 className="about-card-title">{card.title}</h3>
                                        <p className="about-card-desc">{card.desc}</p>
                                    </GlowCard>
                                </FadeContent>
                            </ScrollStackItem>
                        ))}
                    </ScrollStack>
                </div>
            </section>
        </>
    );
}
