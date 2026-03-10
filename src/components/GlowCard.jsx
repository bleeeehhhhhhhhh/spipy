import { useRef } from 'react';

export default function GlowCard({ children, className = '' }) {
    const cardRef = useRef(null);

    const handleMouseMove = (e) => {
        const card = cardRef.current;
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--glow-x', x + 'px');
        card.style.setProperty('--glow-y', y + 'px');
    };

    return (
        <div
            ref={cardRef}
            className={`glow-card ${className}`}
            onMouseMove={handleMouseMove}
        >
            {children}
        </div>
    );
}
