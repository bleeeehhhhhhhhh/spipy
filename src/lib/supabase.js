import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pnihqpsppbfuzvrlmzgc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuaWhxcHNwcGJmdXp2cmxtemdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5OTY0MTcsImV4cCI6MjA4NzU3MjQxN30.z-G_HJz_Q7LcppgndwUnOLaDb9pi2rjRyNl4JivtpJY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- AUTH ----
export async function signUpUser(email, password, username) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { username },
            emailRedirectTo: window.location.href,
        },
    });
    if (error) throw error;
    if (data.user?.identities?.length === 0) {
        throw new Error('An account with this email already exists. Please login instead.');
    }
    if (data.session) return data;
    try {
        const res = await supabase.auth.signInWithPassword({ email, password });
        if (!res.error && res.data.session) return res.data;
    } catch { }
    data._needsConfirmation = true;
    return data;
}

export async function signInUser(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

export async function signOutUser() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

// ---- PROFILES ----
export async function getProfile(userId) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        if (error) {
            if (error.code === 'PGRST116') return await autoCreateProfile(userId);
            return null;
        }
        return data;
    } catch {
        return null;
    }
}

async function autoCreateProfile(userId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const username = (user?.id === userId && user?.user_metadata?.username) || 'user_' + userId.substring(0, 8);
        const profile = {
            id: userId,
            username,
            display_name: user?.user_metadata?.username || 'New User',
            bio: '',
            avatar_url: null,
            updated_at: new Date().toISOString(),
        };
        const { data, error } = await supabase
            .from('profiles')
            .upsert(profile, { onConflict: 'id' })
            .select()
            .single();
        if (error) return { ...profile };
        return data;
    } catch {
        return { id: userId, username: 'user_' + userId.substring(0, 8), display_name: 'New User', bio: '', avatar_url: null };
    }
}

export async function updateProfile(userId, updates) {
    const { data, error } = await supabase
        .from('profiles')
        .upsert({ id: userId, ...updates, updated_at: new Date().toISOString() }, { onConflict: 'id' })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function uploadAvatar(userId, file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const path = `${userId}/avatar.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { cacheControl: '3600', upsert: true });
    if (error) throw new Error('Failed to upload avatar: ' + error.message);
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    if (!urlData?.publicUrl) throw new Error('Could not get public URL for avatar');
    return urlData.publicUrl + '?t=' + Date.now();
}

// ---- POSTS ----
export async function getPosts() {
    const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('timestamp', { ascending: false });
    if (error) { console.error('Error fetching posts:', error); return []; }
    return data || [];
}

export async function createPost(post) {
    const { data, error } = await supabase.from('posts').insert([post]).select();
    if (error) throw new Error(error.message);
    return data[0];
}

export async function deletePost(postId) {
    try { await supabase.from('comments').delete().eq('post_id', postId); } catch { }
    try { await supabase.from('bookmarks').delete().eq('post_id', postId); } catch { }
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) throw new Error(error.message);
}

export async function updatePostReactions(postId, reactions) {
    const { data, error } = await supabase
        .from('posts')
        .update({ reactions })
        .eq('id', postId)
        .select();
    if (error) throw new Error(error.message);
    return data[0];
}

// ---- COMMENTS ----
export async function getComments(postId) {
    try {
        const { data, error } = await supabase
            .from('comments')
            .select('id, post_id, user_id, username, content, created_at, profiles(avatar_url, username)')
            .eq('post_id', postId)
            .order('created_at', { ascending: true });
        if (error) return [];
        return data || [];
    } catch {
        return [];
    }
}

export async function addComment(comment) {
    const { data, error } = await supabase.from('comments').insert([comment]).select();
    if (error) throw error;
    return data[0];
}

export async function deleteComment(commentId) {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) throw error;
}

// ---- BOOKMARKS ----
export async function getBookmarks(userId) {
    try {
        const { data, error } = await supabase
            .from('bookmarks')
            .select('post_id')
            .eq('user_id', userId);
        if (error) return [];
        return (data || []).map(b => b.post_id);
    } catch {
        return [];
    }
}

export async function addBookmark(userId, postId) {
    const { error } = await supabase.from('bookmarks').insert([{ user_id: userId, post_id: postId }]);
    if (error) throw error;
}

export async function removeBookmark(userId, postId) {
    const { error } = await supabase.from('bookmarks').delete().eq('user_id', userId).eq('post_id', postId);
    if (error) throw error;
}

// ---- REALTIME ----
export function subscribeToChanges(callback) {
    const channel = supabase
        .channel('posts-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, callback)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, callback)
        .subscribe();
    return () => supabase.removeChannel(channel);
}

// ---- HELPERS ----
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function convertSpotifyUrl(url) {
    try {
        let type, id;
        if (url.includes('open.spotify.com')) {
            const parts = new URL(url).pathname.split('/').filter(Boolean);
            const validTypes = ['track', 'album', 'playlist', 'episode', 'show'];
            for (let i = 0; i < parts.length; i++) {
                if (validTypes.includes(parts[i]) && parts[i + 1]) {
                    type = parts[i];
                    id = parts[i + 1].split('?')[0];
                    break;
                }
            }
        } else if (url.startsWith('spotify:')) {
            const parts = url.split(':');
            if (parts.length >= 3) { type = parts[1]; id = parts[2]; }
        }
        return type && id ? `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0` : null;
    } catch {
        return null;
    }
}
