import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function BubbleMenu({ onOpenAuth }) {
    const [open, setOpen] = useState(false);
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleAction = (path) => {
        if (!user) { onOpenAuth(); setOpen(false); return; }
        setOpen(false);
        navigate(path);
    };

    return (
        <div className={`bubble-menu ${open ? 'open' : ''}`}>
            <div className="bubble-items">
                <button className="bubble-item" title="Write a Note" onClick={() => handleAction('/feed?tab=note')}>
                    📝<span className="bubble-tooltip">Note</span>
                </button>
                <button className="bubble-item" title="Share a Song" onClick={() => handleAction('/feed?tab=song')}>
                    🎵<span className="bubble-tooltip">Song</span>
                </button>
                <button className="bubble-item" title="Share a Photo" onClick={() => handleAction('/feed?tab=image')}>
                    📷<span className="bubble-tooltip">Photo</span>
                </button>
                <button className="bubble-item" title="Scroll to Top" onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setOpen(false); }}>
                    ⬆️<span className="bubble-tooltip">Top</span>
                </button>
            </div>
            <button className={`bubble-trigger ${open ? 'open' : ''}`} onClick={() => setOpen(!open)} title="Menu">
                ✦
            </button>
        </div>
    );
}
