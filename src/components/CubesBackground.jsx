import { useEffect, useRef } from 'react';

const cubeColors = [
    'rgba(255, 182, 193, 0.15)',
    'rgba(196, 168, 224, 0.15)',
    'rgba(137, 207, 240, 0.15)',
    'rgba(255, 245, 186, 0.15)',
    'rgba(181, 234, 215, 0.15)',
    'rgba(255, 214, 224, 0.12)',
    'rgba(230, 230, 250, 0.12)',
];

export default function CubesBackground() {
    const containerRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = '';

        const cubeCount = 8;
        for (let i = 0; i < cubeCount; i++) {
            const size = 30 + Math.random() * 50;
            const color = cubeColors[Math.floor(Math.random() * cubeColors.length)];
            const duration = 15 + Math.random() * 20;
            const delay = Math.random() * duration;
            const rotDuration = 8 + Math.random() * 12;
            const drift = (Math.random() - 0.5) * 100;
            const left = Math.random() * 100;

            const wrapper = document.createElement('div');
            wrapper.className = 'cube-wrapper';
            wrapper.style.cssText = `width:${size}px;height:${size}px;left:${left}%;--cube-size:${size}px;--cube-drift:${drift}px;animation-duration:${duration}s;animation-delay:-${delay}s;`;

            const cube = document.createElement('div');
            cube.className = 'cube';
            cube.style.animationDuration = rotDuration + 's';

            ['front', 'back', 'right', 'left', 'top', 'bottom'].forEach(face => {
                const el = document.createElement('div');
                el.className = `cube-face ${face}`;
                el.style.background = color;
                cube.appendChild(el);
            });

            wrapper.appendChild(cube);
            container.appendChild(wrapper);
        }
    }, []);

    return <div className="cubes-bg" ref={containerRef} />;
}
