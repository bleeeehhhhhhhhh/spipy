import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * Interactive Furry Chibi Characters
 * - Fluffy, round, cute anime-style characters with fur texture
 * - Hover reactions: happy, jealous, angry, sad
 * - Click to climb on cursor, then fall with gravity
 */

const CHIBI_DATA = [
    { name: 'Mochi', fur: '#FFD1DC', furDark: '#FFB6C1', accent: '#FF85A2', inner: '#FFF0F5', earInner: '#FFB6C1', x: 8, y: 72 },
    { name: 'Kuro', fur: '#B8D4E8', furDark: '#89CFF0', accent: '#5A9BD5', inner: '#E8F4FD', earInner: '#89CFF0', x: 87, y: 78 },
    { name: 'Tama', fur: '#D4C4F0', furDark: '#C4A8E0', accent: '#9B72CF', inner: '#F3EEFF', earInner: '#C4A8E0', x: 50, y: 82 },
    { name: 'Suki', fur: '#FFE5A0', furDark: '#FFC947', accent: '#E5A800', inner: '#FFF8E1', earInner: '#FFC947', x: 28, y: 76 },
];

function FurryChibi({ chibi, mousePos }) {
    const [mood, setMood] = useState('happy');
    const [isClimbing, setIsClimbing] = useState(false);
    const [isFalling, setIsFalling] = useState(false);
    const [fallY, setFallY] = useState(0);
    const [hovered, setHovered] = useState(false);
    const climbTimer = useRef(null);
    const fallTimer = useRef(null);

    const handleMouseEnter = () => {
        setHovered(true);
        const moods = ['happy', 'jealous', 'angry', 'sad'];
        setMood(moods[Math.floor(Math.random() * moods.length)]);
    };

    const handleMouseLeave = () => {
        setHovered(false);
        setTimeout(() => setMood('happy'), 1200);
    };

    const handleClick = useCallback(() => {
        if (isClimbing || isFalling) return;
        setIsClimbing(true);
        setMood('happy');

        climbTimer.current = setTimeout(() => {
            setIsClimbing(false);
            setIsFalling(true);
            setMood('sad');
            let step = 0;
            fallTimer.current = setInterval(() => {
                step += 1;
                setFallY(prev => prev + step * 2.5);
                if (step > 18) {
                    clearInterval(fallTimer.current);
                    setIsFalling(false);
                    setFallY(0);
                    setMood('happy');
                }
            }, 30);
        }, 2200);
    }, [isClimbing, isFalling]);

    useEffect(() => {
        return () => {
            if (climbTimer.current) clearTimeout(climbTimer.current);
            if (fallTimer.current) clearInterval(fallTimer.current);
        };
    }, []);

    const posStyle = isClimbing && mousePos
        ? { position: 'fixed', left: mousePos.x - 30 + 'px', top: mousePos.y - 60 + 'px', zIndex: 9998, transition: 'left 0.12s ease-out, top 0.12s ease-out' }
        : isFalling && mousePos
            ? { position: 'fixed', left: mousePos.x - 30 + 'px', top: mousePos.y - 60 + fallY + 'px', zIndex: 9998, transition: 'none' }
            : { left: chibi.x + '%', bottom: (100 - chibi.y) + '%' };

    // Fur edge bumps (wavy outline for fluffy look)
    const furBumps = 'M15,20 Q10,17 8,14 Q6,10 10,7 Q12,5 15,6 Q17,3 20,4 Q22,2 25,3 Q28,2 30,4 Q33,3 35,6 Q38,5 40,7 Q44,10 42,14 Q40,17 35,20';

    return (
        <div
            className={`pixel-chibi ${hovered ? 'hovered' : ''} ${isClimbing ? 'climbing' : ''} ${isFalling ? 'falling' : ''}`}
            style={posStyle}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            title={`${chibi.name} is ${mood}! Click to pick up!`}
        >
            <svg width="60" height="65" viewBox="0 0 50 55" className="chibi-svg">
                {/* Fur texture filter */}
                <defs>
                    <filter id={`fur-${chibi.name}`}>
                        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" />
                    </filter>
                    <radialGradient id={`bodyGrad-${chibi.name}`} cx="40%" cy="35%">
                        <stop offset="0%" stopColor={chibi.inner} />
                        <stop offset="70%" stopColor={chibi.fur} />
                        <stop offset="100%" stopColor={chibi.furDark} />
                    </radialGradient>
                </defs>

                {/* Fluffy body — large round with fur bumps outline */}
                <path d={furBumps + ' Q42,25 40,32 Q38,38 35,40 Q30,43 25,43 Q20,43 15,40 Q12,38 10,32 Q8,25 15,20 Z'}
                    fill={`url(#bodyGrad-${chibi.name})`} stroke={chibi.furDark} strokeWidth="1.2" />

                {/* Fur tuft on top */}
                <path d="M22,4 Q25,-2 28,4" fill="none" stroke={chibi.furDark} strokeWidth="1.5" strokeLinecap="round" />
                <path d="M20,6 Q22,-1 24,5" fill="none" stroke={chibi.fur} strokeWidth="1" strokeLinecap="round" />
                <path d="M26,5 Q28,-1 30,6" fill="none" stroke={chibi.fur} strokeWidth="1" strokeLinecap="round" />

                {/* Fluffy ears */}
                <ellipse cx="12" cy="10" rx="6" ry="8" fill={chibi.fur} stroke={chibi.furDark} strokeWidth="1"
                    transform="rotate(-15 12 10)" />
                <ellipse cx="12" cy="10" rx="3.5" ry="5" fill={chibi.earInner} opacity="0.5"
                    transform="rotate(-15 12 10)" />
                <ellipse cx="38" cy="10" rx="6" ry="8" fill={chibi.fur} stroke={chibi.furDark} strokeWidth="1"
                    transform="rotate(15 38 10)" />
                <ellipse cx="38" cy="10" rx="3.5" ry="5" fill={chibi.earInner} opacity="0.5"
                    transform="rotate(15 38 10)" />

                {/* Eyes */}
                {mood === 'angry' ? (
                    <>
                        <line x1="16" y1="22" x2="21" y2="24" stroke="#4A3A5A" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1="29" y1="24" x2="34" y2="22" stroke="#4A3A5A" strokeWidth="2.5" strokeLinecap="round" />
                    </>
                ) : mood === 'sad' ? (
                    <>
                        <ellipse cx="19" cy="24" rx="3.5" ry="4" fill="#4A3A5A" />
                        <ellipse cx="31" cy="24" rx="3.5" ry="4" fill="#4A3A5A" />
                        <circle cx="20" cy="23" r="1.3" fill="white" />
                        <circle cx="32" cy="23" r="1.3" fill="white" />
                        <circle cx="19.5" cy="22" r="0.6" fill="white" opacity="0.7" />
                        <circle cx="31.5" cy="22" r="0.6" fill="white" opacity="0.7" />
                        {/* Tears */}
                        <ellipse cx="16" cy="30" rx="1.5" ry="2.5" fill="#89CFF0" opacity="0.6">
                            <animate attributeName="cy" values="30;35;30" dur="1.2s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.6;0;0.6" dur="1.2s" repeatCount="indefinite" />
                        </ellipse>
                        <ellipse cx="34" cy="30" rx="1.5" ry="2.5" fill="#89CFF0" opacity="0.6">
                            <animate attributeName="cy" values="30;35;30" dur="1.4s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.6;0;0.6" dur="1.4s" repeatCount="indefinite" />
                        </ellipse>
                    </>
                ) : mood === 'jealous' ? (
                    <>
                        <ellipse cx="19" cy="24" rx="3" ry="3.5" fill="#4A3A5A" />
                        <ellipse cx="31" cy="24" rx="3" ry="3.5" fill="#4A3A5A" />
                        <circle cx="20" cy="23" r="1" fill="white" />
                        <circle cx="32" cy="23" r="1" fill="white" />
                        {/* Squinting brows */}
                        <line x1="15" y1="19" x2="22" y2="20" stroke="#4A3A5A" strokeWidth="1.8" strokeLinecap="round" />
                        <line x1="28" y1="20" x2="35" y2="19" stroke="#4A3A5A" strokeWidth="1.8" strokeLinecap="round" />
                    </>
                ) : (
                    <>
                        {/* Happy — big sparkly eyes */}
                        <ellipse cx="19" cy="24" rx="4" ry="4.5" fill="#4A3A5A" />
                        <ellipse cx="31" cy="24" rx="4" ry="4.5" fill="#4A3A5A" />
                        <circle cx="20.5" cy="22.5" r="1.8" fill="white" />
                        <circle cx="32.5" cy="22.5" r="1.8" fill="white" />
                        <circle cx="18" cy="21.5" r="0.8" fill="white" opacity="0.6" />
                        <circle cx="30" cy="21.5" r="0.8" fill="white" opacity="0.6" />
                    </>
                )}

                {/* Blush cheeks */}
                <ellipse cx="11" cy="29" rx="4.5" ry="2.8" fill={chibi.accent} opacity={mood === 'angry' ? 0.7 : 0.4} />
                <ellipse cx="39" cy="29" rx="4.5" ry="2.8" fill={chibi.accent} opacity={mood === 'angry' ? 0.7 : 0.4} />

                {/* Tiny nose */}
                <ellipse cx="25" cy="27" rx="1.5" ry="1" fill={chibi.accent} opacity="0.5" />

                {/* Mouth */}
                {mood === 'happy' ? (
                    <path d="M21 32 Q25 37 29 32" stroke={chibi.accent} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                ) : mood === 'sad' ? (
                    <path d="M21 35 Q25 31 29 35" stroke={chibi.accent} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                ) : mood === 'angry' ? (
                    <path d="M21 33 L29 33" stroke={chibi.accent} strokeWidth="2" strokeLinecap="round" />
                ) : (
                    <path d="M23 33 Q25 34.5 27 33" stroke={chibi.accent} strokeWidth="1.3" fill="none" strokeLinecap="round" />
                )}

                {/* Fluffy paws — little round arms */}
                <ellipse cx="6" cy="32" rx="5" ry="4" fill={chibi.fur} stroke={chibi.furDark} strokeWidth="0.8">
                    {hovered && <animateTransform attributeName="transform" type="rotate" values="0 6 32;-20 6 32;0 6 32;20 6 32;0 6 32" dur="0.5s" repeatCount="indefinite" />}
                </ellipse>
                <ellipse cx="44" cy="32" rx="5" ry="4" fill={chibi.fur} stroke={chibi.furDark} strokeWidth="0.8">
                    {hovered && <animateTransform attributeName="transform" type="rotate" values="0 44 32;20 44 32;0 44 32;-20 44 32;0 44 32" dur="0.5s" repeatCount="indefinite" />}
                </ellipse>

                {/* Paw pads */}
                <circle cx="5" cy="33" r="1.2" fill={chibi.accent} opacity="0.4" />
                <circle cx="45" cy="33" r="1.2" fill={chibi.accent} opacity="0.4" />

                {/* Fluffy feet */}
                <ellipse cx="18" cy="43" rx="6" ry="3.5" fill={chibi.fur} stroke={chibi.furDark} strokeWidth="0.8" />
                <ellipse cx="32" cy="43" rx="6" ry="3.5" fill={chibi.fur} stroke={chibi.furDark} strokeWidth="0.8" />
                <circle cx="16" cy="43.5" r="1" fill={chibi.accent} opacity="0.3" />
                <circle cx="18" cy="44" r="1" fill={chibi.accent} opacity="0.3" />
                <circle cx="20" cy="43.5" r="1" fill={chibi.accent} opacity="0.3" />
                <circle cx="30" cy="43.5" r="1" fill={chibi.accent} opacity="0.3" />
                <circle cx="32" cy="44" r="1" fill={chibi.accent} opacity="0.3" />
                <circle cx="34" cy="43.5" r="1" fill={chibi.accent} opacity="0.3" />

                {/* Fluffy tail */}
                <ellipse cx="43" cy="38" rx="5" ry="4" fill={chibi.fur} stroke={chibi.furDark} strokeWidth="0.8"
                    transform="rotate(25 43 38)">
                    {hovered && <animate attributeName="rx" values="5;6;5" dur="0.4s" repeatCount="indefinite" />}
                </ellipse>

                {/* Mood bubble */}
                {hovered && (
                    <g>
                        <rect x="33" y="-2" width="16" height="13" rx="6" fill="white" stroke={chibi.furDark} strokeWidth="0.8" opacity="0.95" />
                        <polygon points="35,11 38,15 40,11" fill="white" stroke={chibi.furDark} strokeWidth="0.5" />
                        <text x="41" y="8" textAnchor="middle" fontSize="8" fill={chibi.accent}>
                            {mood === 'happy' ? '♡' : mood === 'sad' ? '💧' : mood === 'angry' ? '💢' : '😤'}
                        </text>
                    </g>
                )}
            </svg>
            <div className="chibi-name" style={{ color: chibi.accent }}>{chibi.name}</div>
        </div>
    );
}

export default function PixelChibis() {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const move = (e) => setMousePos({ x: e.clientX, y: e.clientY });
        window.addEventListener('mousemove', move);
        return () => window.removeEventListener('mousemove', move);
    }, []);

    return (
        <div className="pixel-chibis-container">
            {CHIBI_DATA.map(c => (
                <FurryChibi key={c.name} chibi={c} mousePos={mousePos} />
            ))}
        </div>
    );
}
