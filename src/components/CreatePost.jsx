import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { createPost, convertSpotifyUrl, generateId } from '../lib/supabase';

export default function CreatePost({ onPostCreated, defaultTab = 'note' }) {
    const { user, profile } = useAuth();
    const showToast = useToast();
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [noteText, setNoteText] = useState('');
    const [songUrl, setSongUrl] = useState('');
    const [songCaption, setSongCaption] = useState('');
    const [imageCaption, setImageCaption] = useState('');
    const [imagePreview, setImagePreview] = useState('');
    const fileInputRef = useRef(null);

    if (!user) {
        return (
            <div className="create-area">
                <div className="login-prompt">
                    <p>🔒 <strong>Login to start posting!</strong> You can still browse the feed without an account.</p>
                </div>
            </div>
        );
    }

    const handleImageFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { showToast('🚫 Image too large! Max 5MB'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => setImagePreview(ev.target.result);
        reader.readAsDataURL(file);
    };

    const handleDragOver = (e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--pink-deep)'; };
    const handleDragLeave = (e) => { e.currentTarget.style.borderColor = ''; };
    const handleDrop = (e) => {
        e.preventDefault();
        e.currentTarget.style.borderColor = '';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            const dt = new DataTransfer();
            dt.items.add(file);
            if (fileInputRef.current) fileInputRef.current.files = dt.files;
            handleImageFile({ target: { files: [file] } });
        } else {
            showToast('🚫 Please drop an image file');
        }
    };

    const handlePost = async () => {
        let post = {
            id: generateId(),
            type: activeTab,
            timestamp: new Date().toISOString(),
            reactions: { heart: 0, star: 0, sparkle: 0 },
            user_id: user.id,
            username: profile?.username || 'Anonymous',
        };

        switch (activeTab) {
            case 'note': {
                if (!noteText.trim()) { showToast('✏️ Write something first!'); return; }
                post.content = noteText.trim();
                break;
            }
            case 'song': {
                if (!songUrl.trim()) { showToast('🎵 Paste a Spotify link first!'); return; }
                const embedUrl = convertSpotifyUrl(songUrl);
                if (!embedUrl) { showToast('🚫 Invalid Spotify link!'); return; }
                post.content = embedUrl;
                post.caption = songCaption;
                break;
            }
            case 'image': {
                if (!imagePreview) { showToast('📷 Upload a photo first!'); return; }
                post.content = imagePreview;
                post.caption = imageCaption;
                break;
            }
        }

        try {
            await createPost(post);
            showToast('✨ Posted successfully!');
            setNoteText(''); setSongUrl(''); setSongCaption('');
            setImageCaption(''); setImagePreview('');
            if (onPostCreated) onPostCreated();
        } catch (error) {
            showToast('😭 Error posting: ' + error.message);
        }
    };

    return (
        <div className="create-area">
            <div className="create-tabs">
                {[
                    { key: 'note', icon: '📝', label: 'Note' },
                    { key: 'song', icon: '🎵', label: 'Spotify Song' },
                    { key: 'image', icon: '📷', label: 'Photo' },
                ].map(t => (
                    <button key={t.key} className={`create-tab ${activeTab === t.key ? 'active' : ''}`}
                        onClick={() => setActiveTab(t.key)}>
                        <span className="tab-icon">{t.icon}</span> {t.label}
                    </button>
                ))}
            </div>

            {activeTab === 'note' && (
                <div className="create-form active">
                    <div className="form-group">
                        <label className="form-label">What's on your mind? 💭</label>
                        <textarea className="form-textarea" placeholder="Write something cute..."
                            value={noteText} onChange={e => setNoteText(e.target.value)} />
                    </div>
                    <div className="btn-buddy-wrap post-wrap">
                        <button className="btn-post" onClick={handlePost}>Post Note ✨</button>
                    </div>
                </div>
            )}

            {activeTab === 'song' && (
                <div className="create-form active">
                    <div className="form-group">
                        <label className="form-label">Paste a Spotify link 🎧</label>
                        <input className="form-input" type="url" placeholder="https://open.spotify.com/track/..."
                            value={songUrl} onChange={e => setSongUrl(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Add a caption (optional) 💬</label>
                        <input className="form-input" type="text" placeholder="Why do you love this song?"
                            value={songCaption} onChange={e => setSongCaption(e.target.value)} />
                    </div>
                    <div className="btn-buddy-wrap post-wrap">
                        <button className="btn-post" onClick={handlePost}>Share Song 🎶</button>
                    </div>
                </div>
            )}

            {activeTab === 'image' && (
                <div className="create-form active">
                    <div className="form-group">
                        <label className="form-label">Upload a photo 🖼️</label>
                        <div className="image-upload-area" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                            <div className="upload-icon">📷</div>
                            <div className="upload-text">Click or drag to upload</div>
                            <div className="upload-hint">JPG, PNG, GIF — Max 5MB</div>
                            <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageFile} />
                        </div>
                        {imagePreview && <img className="image-preview" src={imagePreview} alt="Preview" style={{ display: 'block' }} />}
                    </div>
                    <div className="form-group">
                        <label className="form-label">Add a caption (optional) 💬</label>
                        <input className="form-input" type="text" placeholder="Describe your photo..."
                            value={imageCaption} onChange={e => setImageCaption(e.target.value)} />
                    </div>
                    <div className="btn-buddy-wrap post-wrap">
                        <button className="btn-post" onClick={handlePost}>Share Photo 🌈</button>
                    </div>
                </div>
            )}
        </div>
    );
}
