import { useRef, useEffect, useState } from 'react';

/**
 * FadeContent — ReactBits-inspired scroll-triggered fade-in component.
 * Uses Intersection Observer for zero-dependency, performant scroll detection.
 * Supports blur, opacity, duration, delay, and threshold props.
 */
export default function FadeContent({
    children,
    blur = true,
    duration = 1000,
    delay = 0,
    threshold = 0.1,
    initialOpacity = 0,
    className = '',
    style = {},
    ...props
}) {
    const ref = useRef(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(el);
                }
            },
            { threshold }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [threshold]);

    const durationSec = duration > 10 ? duration / 1000 : duration;
    const delaySec = delay > 10 ? delay / 1000 : delay;

    const fadeStyle = {
        opacity: isVisible ? 1 : initialOpacity,
        filter: isVisible ? 'blur(0px)' : (blur ? 'blur(10px)' : 'none'),
        transition: `opacity ${durationSec}s ease-out ${delaySec}s, filter ${durationSec}s ease-out ${delaySec}s`,
        willChange: 'opacity, filter',
        ...style,
    };

    return (
        <div ref={ref} className={className} style={fadeStyle} {...props}>
            {children}
        </div>
    );
}
