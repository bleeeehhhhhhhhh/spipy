export default function SparkleField() {
    const sparkles = Array.from({ length: 20 }, (_, i) => {
        const colors = [
            'rgba(255, 182, 193, 0.6)',
            'rgba(196, 168, 224, 0.6)',
            'rgba(176, 224, 230, 0.6)',
            'rgba(255, 245, 186, 0.6)',
            'rgba(255, 255, 255, 0.8)',
        ];
        const size = 3 + Math.random() * 6;
        return (
            <div
                key={i}
                className="sparkle"
                style={{
                    left: Math.random() * 100 + '%',
                    animationDuration: (8 + Math.random() * 12) + 's',
                    animationDelay: Math.random() * 15 + 's',
                    width: size + 'px',
                    height: size + 'px',
                    background: `radial-gradient(circle, ${colors[Math.floor(Math.random() * colors.length)]}, transparent)`,
                }}
            />
        );
    });

    return <div className="sparkles">{sparkles}</div>;
}
