import { useState, useEffect, useRef, useCallback } from 'react';

const MESSAGES = [
    'hi~! ♡', 'meow~', '✨ sparkle!', 'hewwo!', '(◕‿◕)', 'nyaa~', '♡ love u!',
    'hehe~', '(*≧ω≦)', '☆ yay!', 'boop!', '(´• ω •`)', 'purrr~', '♪♫'
];

export default function FloatingMascot() {
    const [pos, setPos] = useState({ x: 120, y: 300 });
    const [targetPos, setTargetPos] = useState({ x: 120, y: 300 });
    const [blinking, setBlinking] = useState(false);
    const [mood, setMood] = useState('idle'); // idle, curious, surprised, sleepy
    const [message, setMessage] = useState(null);
    const [isIdle, setIsIdle] = useState(false);
    const lastScrollY = useRef(0);
    const idleTimer = useRef(null);
    const animFrame = useRef(null);
    const velocity = useRef({ x: 0, y: 0 });

    // Smooth spring physics for following cursor
    useEffect(() => {
        const spring = 0.015;
        const damping = 0.88;
        const offset = { x: -40, y: 30 };

        function animate() {
            setPos(prev => {
                const dx = targetPos.x + offset.x - prev.x;
                const dy = targetPos.y + offset.y - prev.y;
                velocity.current.x = (velocity.current.x + dx * spring) * damping;
                velocity.current.y = (velocity.current.y + dy * spring) * damping;
                return {
                    x: prev.x + velocity.current.x,
                    y: prev.y + velocity.current.y,
                };
            });
            animFrame.current = requestAnimationFrame(animate);
        }
        animFrame.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animFrame.current);
    }, [targetPos]);

    // Track cursor
    useEffect(() => {
        const handleMove = (e) => {
            setTargetPos({ x: e.clientX, y: e.clientY });
            setIsIdle(false);
            setMood('curious');
            clearTimeout(idleTimer.current);
            idleTimer.current = setTimeout(() => {
                setIsIdle(true);
                setMood('idle');
            }, 4000);
        };
        window.addEventListener('mousemove', handleMove);
        return () => window.removeEventListener('mousemove', handleMove);
    }, []);

    // Blink periodically
    useEffect(() => {
        const interval = setInterval(() => {
            setBlinking(true);
            setTimeout(() => setBlinking(false), 180);
        }, 3000 + Math.random() * 2000);
        return () => clearInterval(interval);
    }, []);

    // Detect fast scroll → surprised
    useEffect(() => {
        const handleScroll = () => {
            const delta = Math.abs(window.scrollY - lastScrollY.current);
            if (delta > 80) {
                setMood('surprised');
                setTimeout(() => setMood('idle'), 1500);
            }
            lastScrollY.current = window.scrollY;
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Sleepy after long idle
    useEffect(() => {
        if (isIdle) {
            const timer = setTimeout(() => setMood('sleepy'), 8000);
            return () => clearTimeout(timer);
        }
    }, [isIdle]);

    // Click to show speech bubble
    const handleClick = useCallback(() => {
        const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
        setMessage(msg);
        setMood('curious');
        setTimeout(() => setMessage(null), 2000);
    }, []);

    // Determine eye style
    const renderEyes = () => {
        if (blinking) {
            return (
                <>
                    <line x1="14" y1="20" x2="20" y2="20" stroke="#4A3A5A" strokeWidth="2" strokeLinecap="round" />
                    <line x1="30" y1="20" x2="36" y2="20" stroke="#4A3A5A" strokeWidth="2" strokeLinecap="round" />
                </>
            );
        }
        if (mood === 'sleepy') {
            return (
                <>
                    <path d="M14 21 Q17 18 20 21" stroke="#4A3A5A" strokeWidth="2" fill="none" strokeLinecap="round" />
                    <path d="M30 21 Q33 18 36 21" stroke="#4A3A5A" strokeWidth="2" fill="none" strokeLinecap="round" />
                    <text x="38" y="14" fontSize="6" fill="#89CFF0">z</text>
                    <text x="42" y="10" fontSize="5" fill="#89CFF0" opacity="0.6">z</text>
                </>
            );
        }
        if (mood === 'surprised') {
            return (
                <>
                    <circle cx="17" cy="19" r="4.5" fill="#4A3A5A" />
                    <circle cx="33" cy="19" r="4.5" fill="#4A3A5A" />
                    <circle cx="18.5" cy="17.5" r="2" fill="white" />
                    <circle cx="34.5" cy="17.5" r="2" fill="white" />
                    <circle cx="16" cy="16.5" r="0.8" fill="white" opacity="0.6" />
                    <circle cx="32" cy="16.5" r="0.8" fill="white" opacity="0.6" />
                </>
            );
        }
        // Default / curious eyes
        return (
            <>
                <ellipse cx="17" cy="20" rx="3.5" ry="4" fill="#4A3A5A" />
                <ellipse cx="33" cy="20" rx="3.5" ry="4" fill="#4A3A5A" />
                <circle cx="18.5" cy="18.5" r="1.5" fill="white" />
                <circle cx="34.5" cy="18.5" r="1.5" fill="white" />
                <circle cx="16.5" cy="17.5" r="0.7" fill="white" opacity="0.6" />
                <circle cx="32.5" cy="17.5" r="0.7" fill="white" opacity="0.6" />
            </>
        );
    };

    return (
        <div
            className={`floating-mascot ${mood} ${isIdle ? 'idle-sway' : ''}`}
            style={{
                left: pos.x + 'px',
                top: pos.y + 'px',
            }}
            onClick={handleClick}
            title="Click me! ♡"
        >
            {/* Speech bubble */}
            {message && (
                <div className="mascot-speech">
                    {message}
                </div>
            )}

            <svg width="56" height="52" viewBox="0 0 50 45" className="mascot-svg">
                <defs>
                    <radialGradient id="mascotGrad" cx="40%" cy="35%">
                        <stop offset="0%" stopColor="#FFF5FA" />
                        <stop offset="60%" stopColor="#FFE4EC" />
                        <stop offset="100%" stopColor="#FFD1DC" />
                    </radialGradient>
                    <filter id="mascotGlow">
                        <feGaussianBlur stdDeviation="1.5" result="glow" />
                        <feMerge>
                            <feMergeNode in="glow" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Ghost/blob body */}
                <path
                    d="M8,22 Q8,6 25,6 Q42,6 42,22 Q42,32 38,36 Q36,38 34,35 Q32,32 30,35 Q28,38 25,35 Q22,38 20,35 Q18,32 16,35 Q14,38 12,36 Q8,32 8,22 Z"
                    fill="url(#mascotGrad)"
                    stroke="#FFB6C1"
                    strokeWidth="1.2"
                    filter="url(#mascotGlow)"
                />

                {/* Rosy cheeks */}
                <ellipse cx="10" cy="25" rx="4" ry="2.5" fill="#FFB6C1" opacity="0.45" />
                <ellipse cx="40" cy="25" rx="4" ry="2.5" fill="#FFB6C1" opacity="0.45" />

                {/* Eyes */}
                {renderEyes()}

                {/* Mouth */}
                {mood === 'surprised' ? (
                    <ellipse cx="25" cy="28" rx="2.5" ry="2" fill="#FF85A2" opacity="0.7" />
                ) : mood === 'sleepy' ? (
                    <path d="M22 28 L28 28" stroke="#FF85A2" strokeWidth="1.5" strokeLinecap="round" />
                ) : (
                    <path d="M21 27 Q25 31 29 27" stroke="#FF85A2" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                )}

                {/* Sparkle near eyes when curious */}
                {mood === 'curious' && (
                    <>
                        <circle cx="40" cy="12" r="1.5" fill="#FFC947" opacity="0.8">
                            <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1s" repeatCount="indefinite" />
                        </circle>
                        <circle cx="43" cy="9" r="1" fill="#FFB6C1" opacity="0.6">
                            <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1.3s" repeatCount="indefinite" />
                        </circle>
                    </>
                )}
            </svg>
        </div>
    );
}
