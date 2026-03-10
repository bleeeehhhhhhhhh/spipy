import { useRef, useEffect, useState, Children } from 'react';

/**
 * ScrollStack — ReactBits-inspired stacking cards on scroll.
 * Lightweight implementation using Intersection Observer + scroll listener.
 * Cards pin and stack on top of each other as you scroll down.
 */

export function ScrollStackItem({ children, className = '' }) {
    return (
        <div className={`scroll-stack-card ${className}`.trim()}>
            {children}
        </div>
    );
}

export default function ScrollStack({
    children,
    className = '',
    itemDistance = 60,
    itemScale = 0.03,
    itemStackDistance = 20,
    baseScale = 0.88,
}) {
    const containerRef = useRef(null);
    const [scrollProgress, setScrollProgress] = useState([]);
    const childCount = Children.count(children);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const cards = container.querySelectorAll('.scroll-stack-card');
        if (!cards.length) return;

        const handleScroll = () => {
            const progresses = [];
            cards.forEach((card, i) => {
                const rect = card.getBoundingClientRect();
                const windowH = window.innerHeight;
                const triggerPoint = windowH * 0.3;

                // How far past the trigger point
                const distFromTrigger = triggerPoint - rect.top;
                const travelDistance = windowH * 0.5;
                const progress = Math.max(0, Math.min(1, distFromTrigger / travelDistance));

                progresses.push(progress);
            });
            setScrollProgress(progresses);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();

        return () => window.removeEventListener('scroll', handleScroll);
    }, [childCount]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const cards = container.querySelectorAll('.scroll-stack-card');
        cards.forEach((card, i) => {
            const progress = scrollProgress[i] || 0;

            // Scale down as it gets stacked behind
            const targetScale = baseScale + i * itemScale;
            const scale = 1 - progress * (1 - targetScale);

            // Pin the card at the top as you scroll
            const stickyOffset = i * itemStackDistance;

            card.style.position = 'sticky';
            card.style.top = `${100 + stickyOffset}px`;
            card.style.transform = `scale(${scale})`;
            card.style.transformOrigin = 'top center';
            card.style.zIndex = i + 1;
            card.style.transition = 'transform 0.1s ease-out';
        });
    }, [scrollProgress, baseScale, itemScale, itemStackDistance]);

    return (
        <div className={`scroll-stack-container ${className}`.trim()} ref={containerRef}>
            {Children.map(children, (child, i) => (
                <div
                    className="scroll-stack-spacer"
                    key={i}
                    style={{ marginBottom: i < childCount - 1 ? `${itemDistance}px` : 0 }}
                >
                    {child}
                </div>
            ))}
        </div>
    );
}
