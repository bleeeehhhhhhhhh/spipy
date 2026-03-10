import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, getProfile, getBookmarks, signUpUser, signInUser, signOutUser, updateProfile as updateProfileApi, uploadAvatar } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [bookmarks, setBookmarks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session?.user) {
                setUser(session.user);
                const p = await getProfile(session.user.id);
                setProfile(p);
                const b = await getBookmarks(session.user.id);
                setBookmarks(b);
            }
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                setUser(session.user);
                const p = await getProfile(session.user.id);
                setProfile(p);
                const b = await getBookmarks(session.user.id);
                setBookmarks(b);
            } else {
                setUser(null);
                setProfile(null);
                setBookmarks([]);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signUp = async (email, password, username) => {
        return await signUpUser(email, password, username);
    };

    const signIn = async (email, password) => {
        return await signInUser(email, password);
    };

    const signOut = async () => {
        await signOutUser();
    };

    const updateUserProfile = async (updates) => {
        if (!user) return;
        const updated = await updateProfileApi(user.id, updates);
        setProfile(updated);
        return updated;
    };

    const uploadUserAvatar = async (file) => {
        if (!user) return;
        return await uploadAvatar(user.id, file);
    };

    const refreshBookmarks = async () => {
        if (!user) return;
        const b = await getBookmarks(user.id);
        setBookmarks(b);
    };

    return (
        <AuthContext.Provider value={{
            user,
            profile,
            bookmarks,
            loading,
            signUp,
            signIn,
            signOut,
            updateUserProfile,
            uploadUserAvatar,
            refreshBookmarks,
            setBookmarks,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
}
