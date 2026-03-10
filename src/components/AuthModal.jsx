import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';

export default function AuthModal({ isOpen, onClose }) {
    const { signUp, signIn } = useAuth();
    const showToast = useToast();
    const [tab, setTab] = useState('login');
    const [loading, setLoading] = useState(false);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [signupUsername, setSignupUsername] = useState('');
    const [signupEmail, setSignupEmail] = useState('');
    const [signupPassword, setSignupPassword] = useState('');

    if (!isOpen) return null;

    const handleSignIn = async (e) => {
        e.preventDefault();
        if (!loginEmail || !loginPassword) { showToast('✏️ Fill in all fields!'); return; }
        setLoading(true);
        try {
            await signIn(loginEmail, loginPassword);
            showToast('🌸 Welcome back!');
            onClose();
            setLoginEmail(''); setLoginPassword('');
        } catch (error) {
            const msg = (error.message || '').toLowerCase();
            if (msg.includes('not confirmed')) showToast('📧 Please confirm your email first!');
            else if (msg.includes('invalid')) showToast('🔑 Wrong email or password!');
            else showToast('😭 ' + error.message);
        } finally { setLoading(false); }
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        if (!signupUsername || !signupEmail || !signupPassword) { showToast('✏️ Fill in all fields!'); return; }
        if (signupPassword.length < 6) { showToast('🔑 Password must be at least 6 characters!'); return; }
        setLoading(true);
        try {
            const result = await signUp(signupEmail, signupPassword, signupUsername);
            if (result._needsConfirmation) {
                showToast('📧 Check your email to confirm your account!');
                setTab('login');
                setLoginEmail(signupEmail);
            } else {
                showToast('✨ Account created! Welcome to shae!');
                onClose();
            }
            setSignupUsername(''); setSignupEmail(''); setSignupPassword('');
        } catch (error) {
            const msg = (error.message || '').toLowerCase();
            if (msg.includes('already') || msg.includes('exists')) {
                showToast('🌸 Account already exists! Try logging in.');
                setTab('login'); setLoginEmail(signupEmail);
            } else showToast('😭 ' + error.message);
        } finally { setLoading(false); }
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-card auth-modal-card">
                <button className="modal-close" onClick={onClose}>✕</button>
                <div className="auth-modal-header">
                    <div className="auth-modal-icon">🌸</div>
                    <h2 className="auth-modal-title">Welcome to shae</h2>
                    <p className="auth-modal-subtitle">Your cozy corner on the internet ✿</p>
                </div>
                <div className="auth-tabs">
                    <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>Login</button>
                    <button className={`auth-tab ${tab === 'signup' ? 'active' : ''}`} onClick={() => setTab('signup')}>Sign Up</button>
                </div>

                {tab === 'login' ? (
                    <form className="auth-form active" onSubmit={handleSignIn}>
                        <div className="form-group">
                            <label className="form-label">Email 💌</label>
                            <input className="form-input" type="email" placeholder="your@email.com" required
                                value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password 🔑</label>
                            <input className="form-input" type="password" placeholder="••••••••" required minLength={6}
                                value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
                        </div>
                        <button className="btn-auth-submit" type="submit" disabled={loading}>
                            {loading ? 'Logging in...' : 'Login ♡'}
                        </button>
                    </form>
                ) : (
                    <form className="auth-form active" onSubmit={handleSignUp}>
                        <div className="form-group">
                            <label className="form-label">Pick a Username 🏷️</label>
                            <input className="form-input" type="text" placeholder="cutie_pie_123" required minLength={3} maxLength={20}
                                pattern="[a-zA-Z0-9_]+" value={signupUsername} onChange={e => setSignupUsername(e.target.value)} />
                            <small className="form-hint">Letters, numbers, and underscores only</small>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email 💌</label>
                            <input className="form-input" type="email" placeholder="your@email.com" required
                                value={signupEmail} onChange={e => setSignupEmail(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password 🔑</label>
                            <input className="form-input" type="password" placeholder="Min 6 characters" required minLength={6}
                                value={signupPassword} onChange={e => setSignupPassword(e.target.value)} />
                        </div>
                        <button className="btn-auth-submit" type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Account ✨'}
                        </button>
                    </form>
                )}

                <div className="auth-modal-footer">
                    {tab === 'login' ? (
                        <span>Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); setTab('signup'); }}>Sign up</a></span>
                    ) : (
                        <span>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setTab('login'); }}>Login</a></span>
                    )}
                </div>
            </div>
        </div>
    );
}
