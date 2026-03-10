import { useEffect } from 'react';

const sparkColors = ['#FFB6C1', '#C4A8E0', '#89CFF0', '#FFC947', '#FF85A2', '#B5EAD7', '#FFD6E0', '#E6E6FA'];

export default function ClickSpark() {
    useEffect(() => {
        const handler = (e) => {
            if (e.target.closest('button, a, input, textarea, select, .modal-overlay')) return;
            const count = 8 + Math.floor(Math.random() * 5);
            for (let i = 0; i < count; i++) {
                const spark = document.createElement('div');
                spark.className = 'click-spark';
                const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
                const dist = 30 + Math.random() * 50;
                spark.style.left = e.clientX + 'px';
                spark.style.top = e.clientY + 'px';
                spark.style.background = sparkColors[Math.floor(Math.random() * sparkColors.length)];
                spark.style.setProperty('--spark-tx', Math.cos(angle) * dist + 'px');
                spark.style.setProperty('--spark-ty', Math.sin(angle) * dist + 'px');
                spark.style.width = (4 + Math.random() * 5) + 'px';
                spark.style.height = spark.style.width;
                document.body.appendChild(spark);
                setTimeout(() => spark.remove(), 600);
            }
        };
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, []);

    return null;
}
