export default function KawaiiCharacters() {
    return (
        <div className="floating-characters">
            {/* Chiikawa */}
            <svg className="kawaii-char c1" width="100" height="120" viewBox="0 0 100 120">
                <ellipse cx="50" cy="58" rx="40" ry="46" fill="#FFF5F5" stroke="#FFD6E0" strokeWidth="2" />
                <ellipse cx="14" cy="68" rx="8" ry="5" fill="#FFF5F5" stroke="#FFD6E0" strokeWidth="1.5" transform="rotate(-20 14 68)" />
                <ellipse cx="86" cy="68" rx="8" ry="5" fill="#FFF5F5" stroke="#FFD6E0" strokeWidth="1.5" transform="rotate(20 86 68)" />
                <ellipse cx="35" cy="100" rx="10" ry="6" fill="#FFF5F5" stroke="#FFD6E0" strokeWidth="1.5" />
                <ellipse cx="65" cy="100" rx="10" ry="6" fill="#FFF5F5" stroke="#FFD6E0" strokeWidth="1.5" />
                <circle cx="36" cy="50" r="3.5" fill="#5A4A6A" />
                <circle cx="64" cy="50" r="3.5" fill="#5A4A6A" />
                <circle cx="37.2" cy="49" r="1.3" fill="#FFF" />
                <circle cx="65.2" cy="49" r="1.3" fill="#FFF" />
                <ellipse className="buddy-blush" cx="26" cy="60" rx="10" ry="6" fill="#FFB6C1" opacity="0.5" />
                <ellipse className="buddy-blush" cx="74" cy="60" rx="10" ry="6" fill="#FFB6C1" opacity="0.5" />
                <path d="M44 62 Q50 68 56 62" stroke="#FF85A2" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>

            {/* Hachiware */}
            <svg className="kawaii-char c2" width="110" height="130" viewBox="0 0 110 130">
                <path d="M25 48 L16 12 Q18 8 24 16 L32 38" fill="#89CFF0" stroke="#B0E0E6" strokeWidth="1.5" />
                <path d="M85 48 L94 12 Q92 8 86 16 L78 38" fill="#89CFF0" stroke="#B0E0E6" strokeWidth="1.5" />
                <ellipse cx="55" cy="68" rx="40" ry="44" fill="#FFF8F8" stroke="#B0E0E6" strokeWidth="2" />
                <circle cx="40" cy="60" r="4" fill="#5A4A6A" />
                <circle cx="70" cy="60" r="4" fill="#5A4A6A" />
                <circle cx="41.2" cy="59" r="1.5" fill="#FFF" />
                <circle cx="71.2" cy="59" r="1.5" fill="#FFF" />
                <ellipse className="buddy-blush" cx="30" cy="70" rx="8" ry="5" fill="#FFB6C1" opacity="0.45" />
                <ellipse className="buddy-blush" cx="80" cy="70" rx="8" ry="5" fill="#FFB6C1" opacity="0.45" />
                <ellipse cx="55" cy="67" rx="3" ry="2" fill="#FF85A2" />
            </svg>

            {/* Hello Kitty */}
            <svg className="kawaii-char c3" width="110" height="120" viewBox="0 0 110 120">
                <path d="M24 50 L16 14 Q19 9 25 20 L32 40" fill="#FFFFFF" stroke="#FFD6E0" strokeWidth="1.5" />
                <path d="M86 50 L94 14 Q91 9 85 20 L78 40" fill="#FFFFFF" stroke="#FFD6E0" strokeWidth="1.5" />
                <ellipse cx="55" cy="64" rx="40" ry="40" fill="#FFFFFF" stroke="#FFD6E0" strokeWidth="2" />
                <ellipse cx="88" cy="28" rx="14" ry="10" fill="#FF4466" transform="rotate(-15 88 28)" />
                <ellipse cx="40" cy="60" r="4.5" fill="#5A4A6A" />
                <ellipse cx="70" cy="60" r="4.5" fill="#5A4A6A" />
                <ellipse cx="55" cy="68" rx="3.5" ry="2.5" fill="#FFC947" />
                <ellipse className="buddy-blush" cx="30" cy="70" rx="7" ry="4" fill="#FFB6C1" opacity="0.45" />
                <ellipse className="buddy-blush" cx="80" cy="70" rx="7" ry="4" fill="#FFB6C1" opacity="0.45" />
            </svg>

            {/* Tiny star buddy */}
            <svg className="kawaii-char c5" width="70" height="70" viewBox="0 0 70 70">
                <path d="M35 5 L42 25 L62 25 L46 38 L52 58 L35 46 L18 58 L24 38 L8 25 L28 25 Z" fill="#FFF5BA" stroke="#FFC947" strokeWidth="1.5" strokeLinejoin="round" />
                <circle cx="28" cy="32" r="2.5" fill="#5A4A6A" />
                <circle cx="42" cy="32" r="2.5" fill="#5A4A6A" />
                <path d="M32 38 Q35 42 38 38" stroke="#FF85A2" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                <ellipse className="buddy-blush" cx="23" cy="36" rx="4" ry="3" fill="#FFD6E0" opacity="0.5" />
                <ellipse className="buddy-blush" cx="47" cy="36" rx="4" ry="3" fill="#FFD6E0" opacity="0.5" />
            </svg>
        </div>
    );
}
