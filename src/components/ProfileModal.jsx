import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';

export default function ProfileModal({ isOpen, onClose }) {
    const { profile, updateUserProfile, uploadUserAvatar } = useAuth();
    const showToast = useToast();
    const [displayName, setDisplayName] = useState(profile?.display_name || '');
    const [bio, setBio] = useState(profile?.bio || '');
    const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
    const [avatarFile, setAvatarFile] = useState(null);
    const [previewSrc, setPreviewSrc] = useState(profile?.avatar_url || '');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { showToast('🚫 Image too large! Max 2MB'); return; }
        setAvatarFile(file);
        setAvatarUrl('');
        const reader = new FileReader();
        reader.onload = (ev) => setPreviewSrc(ev.target.result);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let finalAvatarUrl = avatarUrl || null;
            if (avatarFile) {
                try {
                    showToast('📤 Uploading avatar...');
                    finalAvatarUrl = await uploadUserAvatar(avatarFile);
                    showToast('✅ Avatar uploaded!');
                } catch {
                    if (!finalAvatarUrl) {
                        finalAvatarUrl = previewSrc; // base64 fallback
                    }
                    showToast('⚠️ Upload failed, using fallback');
                }
            }
            await updateUserProfile({
                username: profile?.username || 'user',
                display_name: displayName,
                bio,
                avatar_url: finalAvatarUrl,
            });
            showToast('✨ Profile updated!');
            onClose();
        } catch (error) {
            showToast('😭 Error: ' + error.message);
        } finally { setLoading(false); }
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-card profile-modal-card">
                <button className="modal-close" onClick={onClose}>✕</button>
                <div className="auth-modal-header">
                    <div className="auth-modal-icon">✏️</div>
                    <h2 className="auth-modal-title">Edit Profile</h2>
                </div>
                <form className="auth-form active" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Display Name 🏷️</label>
                        <input className="form-input" type="text" placeholder="Your display name"
                            value={displayName} onChange={e => setDisplayName(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Bio ✍️</label>
                        <textarea className="form-textarea" placeholder="Tell us about yourself..."
                            style={{ minHeight: '80px' }} value={bio} onChange={e => setBio(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Profile Picture 🖼️</label>
                        <div className="avatar-upload-area">
                            <div className="avatar-preview-thumb">
                                {previewSrc ? <img src={previewSrc} alt="avatar" /> : '🌸'}
                            </div>
                            <label className="avatar-upload-btn">
                                📷 Choose Photo
                                <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                            </label>
                        </div>
                        <div className="avatar-or-divider">or paste a URL</div>
                        <input className="form-input" type="url" placeholder="https://example.com/avatar.png"
                            value={avatarUrl} onChange={e => { setAvatarUrl(e.target.value); setPreviewSrc(e.target.value); setAvatarFile(null); }} />
                    </div>
                    <button className="btn-auth-submit" type="submit" disabled={loading}>
                        {loading ? 'Saving...' : 'Save Changes 💾'}
                    </button>
                </form>
            </div>
        </div>
    );
}
