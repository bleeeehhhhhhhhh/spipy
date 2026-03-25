import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pnihqpsppbfuzvrlmzgc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuaWhxcHNwcGJmdXp2cmxtemdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5OTY0MTcsImV4cCI6MjA4NzU3MjQxN30.z-G_HJz_Q7LcppgndwUnOLaDb9pi2rjRyNl4JivtpJY';

// CRITICAL FIX: Override navigator.locks to prevent GoTrueClient from using the
// broken navigatorLock implementation which causes "this.lock is not a function"
// errors and indefinite hangs on some environments (Render, etc).
// navigator.locks is a read-only getter, so we must use Object.defineProperty.
try {
    Object.defineProperty(navigator, 'locks', {
        value: {
            request: async (_name, _opts, cb) => {
                const fn = cb || _opts;
                return await fn({ name: _name, mode: 'exclusive' });
            },
        },
        writable: true,
        configurable: true,
    });
} catch (e) {
    console.warn('Could not override navigator.locks:', e);
}

// Create client with normal initialization — navigator.locks is now safe
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
    },
});

// ---- AUTH ----
export async function signUpUser(email, password, username) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { username },
            emailRedirectTo: window.location.origin,
        },
    });
    if (error) throw error;
    if (data.user?.identities?.length === 0) {
        throw new Error('An account with this email already exists. Please login instead.');
    }
    // If a session was returned, signup + auto-confirm worked
    if (data.session) return data;
    // No session means email confirmation is required
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
    // Try Supabase Storage first (with timeout)
    try {
        const ext = file.name.split('.').pop().toLowerCase();
        const path = `${userId}/avatar.${ext}`;

        const uploadWithTimeout = Promise.race([
            supabase.storage.from('avatars').upload(path, file, { cacheControl: '3600', upsert: true }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Upload timed out')), 15000)),
        ]);

        const { error } = await uploadWithTimeout;
        if (!error) {
            const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
            if (urlData?.publicUrl) return urlData.publicUrl + '?t=' + Date.now();
        }
        console.warn('Avatar storage upload failed, falling back to compressed base64:', error?.message);
    } catch (err) {
        console.warn('Avatar storage not available or timed out, using compressed base64:', err.message);
    }

    // Fallback: compress and return base64 (smaller for avatars)
    return await compressImage(file, 200, 0.7);
}

export async function uploadPostImage(userId, file) {
    // Try Supabase Storage first (with timeout to prevent hanging)
    try {
        const ext = file.name.split('.').pop().toLowerCase();
        const uniqueName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const path = `${userId}/${uniqueName}.${ext}`;

        // Wrap storage upload with a 15-second timeout
        const uploadWithTimeout = Promise.race([
            supabase.storage.from('post-images').upload(path, file, { cacheControl: '3600', upsert: false }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Upload timed out')), 15000)),
        ]);

        const { error } = await uploadWithTimeout;
        if (!error) {
            const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(path);
            if (urlData?.publicUrl) return urlData.publicUrl;
        }
        console.warn('Storage upload failed, falling back to compressed base64:', error?.message);
    } catch (err) {
        console.warn('Storage not available or timed out, using compressed base64:', err.message);
    }

    // Fallback: compress and return base64
    return await compressImage(file, 800, 0.7);
}

// Compress an image file to fit safely in the database
async function compressImage(file, maxDimension = 800, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                // Scale down if larger than maxDimension
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    } else {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = () => reject(new Error('Failed to load image for compression'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(file);
    });
}

// ---- POSTS ----
export async function getPosts() {
    try {
        const fetchWithTimeout = Promise.race([
            supabase
                .from('posts')
                .select('*')
                .order('timestamp', { ascending: false }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Fetching posts timed out')), 10000)),
        ]);
        const { data, error } = await fetchWithTimeout;
        if (error) { console.error('Error fetching posts:', error); return []; }
        return data || [];
    } catch (err) {
        console.error('Failed to fetch posts:', err);
        return [];
    }
}

export async function createPost(post) {
    // Wrap with timeout to prevent hanging forever
    const insertWithTimeout = Promise.race([
        supabase.from('posts').insert([post]).select(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Post creation timed out — please try again')), 15000)),
    ]);

    const { data, error } = await insertWithTimeout;
    if (error) {
        console.error('Create post error:', error);
        throw new Error(error.message);
    }
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
        const fetchWithTimeout = Promise.race([
            supabase
                .from('comments')
                .select('id, post_id, user_id, username, content, created_at, profiles(avatar_url, username)')
                .eq('post_id', postId)
                .order('created_at', { ascending: true }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Fetching comments timed out')), 10000)),
        ]);
        const { data, error } = await fetchWithTimeout;
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
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
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
