import { Link } from 'react-router-dom';

export default function Footer() {
    return (
        <footer className="footer-enhanced">
            <div className="footer-glow" />
            <div className="footer-content">
                <div className="footer-brand">
                    <span className="footer-logo rainbow-text">Shae</span>
                    <p className="footer-tagline">your cozy corner on the internet ✿</p>
                </div>
                <div className="footer-links">
                    <Link to="/">Home</Link>
                    <Link to="/feed">Feed</Link>
                    <Link to="/explore">Explore</Link>
                    <Link to="/bookmarks">Bookmarks</Link>
                </div>
                <div className="footer-bottom">
                    <span className="footer-hearts">
                        {'♡'.split('').map((h, i) => (
                            <span key={i} className="footer-heart" style={{ animationDelay: `${i * 0.3}s` }}>{h}</span>
                        ))}
                    </span>
                    <span>made with love — share your world</span>
                    <span className="footer-hearts">
                        {'♡'.split('').map((h, i) => (
                            <span key={i} className="footer-heart" style={{ animationDelay: `${i * 0.3 + 0.15}s` }}>{h}</span>
                        ))}
                    </span>
                </div>
            </div>
        </footer>
    );
}
