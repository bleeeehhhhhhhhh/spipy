import { useState } from 'react';

/**
 * Cute animal mascots for buttons.
 * Mochi = Bunny (pink), Kuro = Cat (blue), Tama = Squirrel (lavender), Suki = Hamster (gold)
 * Usage: <ButtonMascot animal="bunny" /> inside any button
 */

function BunnySVG({ happy }) {
    return (
        <svg width="22" height="22" viewBox="0 0 40 40" className="btn-mascot-svg">
            {/* Ears */}
            <ellipse cx="14" cy="8" rx="4" ry="10" fill={happy ? '#FFD1DC' : '#FFE4EC'} stroke="#FFB6C1" strokeWidth="1">
                {happy && <animateTransform attributeName="transform" type="rotate" values="0 14 18;-8 14 18;0 14 18;8 14 18;0 14 18" dur="0.4s" repeatCount="3" />}
            </ellipse>
            <ellipse cx="14" cy="8" rx="2" ry="6" fill="#FFB6C1" opacity="0.4" />
            <ellipse cx="26" cy="8" rx="4" ry="10" fill={happy ? '#FFD1DC' : '#FFE4EC'} stroke="#FFB6C1" strokeWidth="1">
                {happy && <animateTransform attributeName="transform" type="rotate" values="0 26 18;8 26 18;0 26 18;-8 26 18;0 26 18" dur="0.4s" repeatCount="3" />}
            </ellipse>
            <ellipse cx="26" cy="8" rx="2" ry="6" fill="#FFB6C1" opacity="0.4" />
            {/* Body */}
            <ellipse cx="20" cy="26" rx="13" ry="12" fill="#FFF0F5" stroke="#FFB6C1" strokeWidth="1.2" />
            {/* Eyes */}
            {happy ? (
                <>
                    <path d="M14 24 Q16 21 18 24" stroke="#5A4A6A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                    <path d="M22 24 Q24 21 26 24" stroke="#5A4A6A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                </>
            ) : (
                <>
                    <circle cx="16" cy="24" r="2" fill="#5A4A6A" />
                    <circle cx="24" cy="24" r="2" fill="#5A4A6A" />
                    <circle cx="16.7" cy="23.3" r="0.7" fill="white" />
                    <circle cx="24.7" cy="23.3" r="0.7" fill="white" />
                </>
            )}
            {/* Cheeks */}
            <ellipse cx="10" cy="27" rx="3" ry="2" fill="#FFB6C1" opacity="0.5" />
            <ellipse cx="30" cy="27" rx="3" ry="2" fill="#FFB6C1" opacity="0.5" />
            {/* Nose & mouth */}
            <ellipse cx="20" cy="27" rx="1.5" ry="1" fill="#FF85A2" />
            {happy ? (
                <path d="M17 29 Q20 33 23 29" stroke="#FF85A2" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            ) : (
                <path d="M18 30 Q20 32 22 30" stroke="#FF85A2" strokeWidth="1" fill="none" strokeLinecap="round" />
            )}
        </svg>
    );
}

function CatSVG({ happy }) {
    return (
        <svg width="22" height="22" viewBox="0 0 40 40" className="btn-mascot-svg">
            {/* Ears */}
            <polygon points="8,18 4,2 16,14" fill={happy ? '#B8D4E8' : '#D4E8F5'} stroke="#89CFF0" strokeWidth="1" strokeLinejoin="round">
                {happy && <animateTransform attributeName="transform" type="rotate" values="0 10 14;-6 10 14;0 10 14" dur="0.3s" repeatCount="4" />}
            </polygon>
            <polygon points="8,18 6,6 14,15" fill="#89CFF0" opacity="0.3" />
            <polygon points="32,18 36,2 24,14" fill={happy ? '#B8D4E8' : '#D4E8F5'} stroke="#89CFF0" strokeWidth="1" strokeLinejoin="round">
                {happy && <animateTransform attributeName="transform" type="rotate" values="0 30 14;6 30 14;0 30 14" dur="0.3s" repeatCount="4" />}
            </polygon>
            <polygon points="32,18 34,6 26,15" fill="#89CFF0" opacity="0.3" />
            {/* Body */}
            <ellipse cx="20" cy="26" rx="14" ry="12" fill="#E8F4FD" stroke="#89CFF0" strokeWidth="1.2" />
            {/* Eyes */}
            {happy ? (
                <>
                    <path d="M13 23 Q15 20 17 23" stroke="#5A4A6A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                    <path d="M23 23 Q25 20 27 23" stroke="#5A4A6A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                </>
            ) : (
                <>
                    <ellipse cx="15" cy="23" rx="2.5" ry="3" fill="#5A4A6A" />
                    <ellipse cx="25" cy="23" rx="2.5" ry="3" fill="#5A4A6A" />
                    <circle cx="15.8" cy="22" r="1" fill="white" />
                    <circle cx="25.8" cy="22" r="1" fill="white" />
                </>
            )}
            {/* Cheeks */}
            <ellipse cx="9" cy="27" rx="3" ry="2" fill="#FFB6C1" opacity="0.4" />
            <ellipse cx="31" cy="27" rx="3" ry="2" fill="#FFB6C1" opacity="0.4" />
            {/* Nose */}
            <ellipse cx="20" cy="26" rx="1.8" ry="1.2" fill="#5A9BD5" />
            {/* Whiskers */}
            <line x1="4" y1="25" x2="12" y2="27" stroke="#89CFF0" strokeWidth="0.7" opacity="0.6" />
            <line x1="4" y1="28" x2="12" y2="28" stroke="#89CFF0" strokeWidth="0.7" opacity="0.6" />
            <line x1="28" y1="27" x2="36" y2="25" stroke="#89CFF0" strokeWidth="0.7" opacity="0.6" />
            <line x1="28" y1="28" x2="36" y2="28" stroke="#89CFF0" strokeWidth="0.7" opacity="0.6" />
            {/* Mouth */}
            {happy ? (
                <path d="M17 29 Q20 33 23 29" stroke="#5A9BD5" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            ) : (
                <path d="M18 29 Q20 31 22 29" stroke="#5A9BD5" strokeWidth="1" fill="none" strokeLinecap="round" />
            )}
        </svg>
    );
}

function SquirrelSVG({ happy }) {
    return (
        <svg width="22" height="22" viewBox="0 0 40 40" className="btn-mascot-svg">
            {/* Fluffy tail */}
            <ellipse cx="34" cy="18" rx="7" ry="10" fill="#D4C4F0" stroke="#C4A8E0" strokeWidth="1" transform="rotate(20 34 18)">
                {happy && <animate attributeName="rx" values="7;8;7" dur="0.3s" repeatCount="4" />}
            </ellipse>
            {/* Ears */}
            <ellipse cx="12" cy="12" rx="4" ry="5" fill="#E8DEFF" stroke="#C4A8E0" strokeWidth="1" transform="rotate(-10 12 12)" />
            <ellipse cx="28" cy="12" rx="4" ry="5" fill="#E8DEFF" stroke="#C4A8E0" strokeWidth="1" transform="rotate(10 28 12)" />
            <ellipse cx="12" cy="12" rx="2" ry="3" fill="#C4A8E0" opacity="0.3" transform="rotate(-10 12 12)" />
            <ellipse cx="28" cy="12" rx="2" ry="3" fill="#C4A8E0" opacity="0.3" transform="rotate(10 28 12)" />
            {/* Body */}
            <ellipse cx="20" cy="26" rx="13" ry="12" fill="#F3EEFF" stroke="#C4A8E0" strokeWidth="1.2" />
            {/* Belly */}
            <ellipse cx="20" cy="28" rx="8" ry="7" fill="#EDE4FF" opacity="0.5" />
            {/* Eyes */}
            {happy ? (
                <>
                    <path d="M14 23 Q16 20 18 23" stroke="#5A4A6A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                    <path d="M22 23 Q24 20 26 23" stroke="#5A4A6A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                </>
            ) : (
                <>
                    <circle cx="16" cy="23" r="2.5" fill="#5A4A6A" />
                    <circle cx="24" cy="23" r="2.5" fill="#5A4A6A" />
                    <circle cx="16.8" cy="22" r="1" fill="white" />
                    <circle cx="24.8" cy="22" r="1" fill="white" />
                </>
            )}
            {/* Cheeks */}
            <ellipse cx="10" cy="27" rx="3" ry="2" fill="#E0B0FF" opacity="0.4" />
            <ellipse cx="30" cy="27" rx="3" ry="2" fill="#E0B0FF" opacity="0.4" />
            {/* Nose */}
            <circle cx="20" cy="26" r="1.5" fill="#9B72CF" />
            {/* Mouth */}
            {happy ? (
                <path d="M17 29 Q20 33 23 29" stroke="#9B72CF" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            ) : (
                <path d="M18 29 Q20 31 22 29" stroke="#9B72CF" strokeWidth="1" fill="none" strokeLinecap="round" />
            )}
        </svg>
    );
}

function HamsterSVG({ happy }) {
    return (
        <svg width="22" height="22" viewBox="0 0 40 40" className="btn-mascot-svg">
            {/* Ears */}
            <circle cx="10" cy="12" r="5" fill="#FFE5A0" stroke="#FFC947" strokeWidth="1">
                {happy && <animateTransform attributeName="transform" type="rotate" values="0 10 12;-8 10 12;0 10 12" dur="0.3s" repeatCount="3" />}
            </circle>
            <circle cx="10" cy="12" r="2.5" fill="#FFC947" opacity="0.3" />
            <circle cx="30" cy="12" r="5" fill="#FFE5A0" stroke="#FFC947" strokeWidth="1">
                {happy && <animateTransform attributeName="transform" type="rotate" values="0 30 12;8 30 12;0 30 12" dur="0.3s" repeatCount="3" />}
            </circle>
            <circle cx="30" cy="12" r="2.5" fill="#FFC947" opacity="0.3" />
            {/* Body */}
            <ellipse cx="20" cy="26" rx="14" ry="13" fill="#FFF8E1" stroke="#FFC947" strokeWidth="1.2" />
            {/* Cheek pouches — big & fluffy! */}
            <ellipse cx="8" cy="27" rx="5" ry="4" fill="#FFE5A0" stroke="#FFC947" strokeWidth="0.8" opacity={happy ? 1 : 0.7}>
                {happy && <animate attributeName="rx" values="5;6;5" dur="0.5s" repeatCount="3" />}
            </ellipse>
            <ellipse cx="32" cy="27" rx="5" ry="4" fill="#FFE5A0" stroke="#FFC947" strokeWidth="0.8" opacity={happy ? 1 : 0.7}>
                {happy && <animate attributeName="rx" values="5;6;5" dur="0.5s" repeatCount="3" />}
            </ellipse>
            {/* Eyes */}
            {happy ? (
                <>
                    <path d="M15 23 Q17 20 19 23" stroke="#5A4A6A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                    <path d="M21 23 Q23 20 25 23" stroke="#5A4A6A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                </>
            ) : (
                <>
                    <circle cx="17" cy="23" r="2" fill="#5A4A6A" />
                    <circle cx="23" cy="23" r="2" fill="#5A4A6A" />
                    <circle cx="17.5" cy="22.3" r="0.7" fill="white" />
                    <circle cx="23.5" cy="22.3" r="0.7" fill="white" />
                </>
            )}
            {/* Nose */}
            <ellipse cx="20" cy="26" rx="1.5" ry="1" fill="#E5A800" />
            {/* Mouth */}
            {happy ? (
                <path d="M17 28 Q20 32 23 28" stroke="#E5A800" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            ) : (
                <path d="M18 29 Q20 31 22 29" stroke="#E5A800" strokeWidth="1" fill="none" strokeLinecap="round" />
            )}
        </svg>
    );
}

const ANIMALS = {
    bunny: BunnySVG,
    cat: CatSVG,
    squirrel: SquirrelSVG,
    hamster: HamsterSVG,
};

const NAMES = {
    bunny: 'Mochi',
    cat: 'Kuro',
    squirrel: 'Tama',
    hamster: 'Suki',
};

export default function ButtonMascot({ animal = 'bunny', size = 22 }) {
    const [hovered, setHovered] = useState(false);
    const AnimalComponent = ANIMALS[animal] || BunnySVG;

    return (
        <span
            className={`btn-mascot ${hovered ? 'btn-mascot-happy' : ''}`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            title={`${NAMES[animal]} says hi!`}
            style={{ width: size, height: size }}
        >
            <AnimalComponent happy={hovered} />
        </span>
    );
}

export { ButtonMascot, BunnySVG, CatSVG, SquirrelSVG, HamsterSVG };
