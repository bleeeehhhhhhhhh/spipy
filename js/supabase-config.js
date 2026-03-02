/* ========================================
   SUPABASE Configuration + Auth
   ======================================== */

const SUPABASE_URL = 'https://pnihqpsppbfuzvrlmzgc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuaWhxcHNwcGJmdXp2cmxtemdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5OTY0MTcsImV4cCI6MjA4NzU3MjQxN30.z-G_HJz_Q7LcppgndwUnOLaDb9pi2rjRyNl4JivtpJY';

// Initialize Supabase client (safely)
let supabaseClient = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    if (window.supabase && window.supabase.createClient) {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
      console.error('Supabase library not loaded! Make sure the CDN script is included before this file.');
      return null;
    }
  }
  return supabaseClient;
}

// ========================================
// AUTH FUNCTIONS
// ========================================

async function signUpUser(email, password, username) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase not connected');

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: window.location.href
    }
  });

  if (error) throw error;

  // Check if the user already exists (Supabase returns a user with
  // identities array empty when signup is attempted with existing email)
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    throw new Error('An account with this email already exists. Please login instead.');
  }

  // If session is returned, user is auto-confirmed and logged in
  if (data.session) {
    return data;
  }

  // No session — try to sign in immediately (works if autoconfirm is on)
  try {
    const signInResult = await client.auth.signInWithPassword({ email, password });
    if (!signInResult.error && signInResult.data.session) {
      return signInResult.data;
    }
  } catch (e) {
    // Sign-in failed, that's okay — fall through to confirmation message
  }

  // If we get here, email confirmation is required
  data._needsConfirmation = true;
  return data;
}

async function signInUser(email, password) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase not connected');

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
}

async function signOutUser() {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase not connected');

  const { error } = await client.auth.signOut();
  if (error) throw error;
}

async function getCurrentUser() {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data: { user } } = await client.auth.getUser();
  return user;
}

async function getCurrentSession() {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data: { session } } = await client.auth.getSession();
  return session;
}

function onAuthStateChange(callback) {
  const client = getSupabaseClient();
  if (!client) return;

  client.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

// ========================================
// PROFILE FUNCTIONS
// ========================================

async function getProfile(userId) {
  try {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      // If profiles table doesn't exist, return a local fallback
      if (error.message && (error.message.includes('schema cache') || error.code === '42P01' || error.message.includes('relation') || error.message.includes('Could not find'))) {
        console.warn('Profiles table not found — using fallback profile. Run SUPABASE_AUTH_SETUP.sql to fix this!');
        return _localFallbackProfile(userId);
      }
      // PGRST116 = no rows found — auto-create the profile in the database
      if (error.code === 'PGRST116') {
        console.warn('No profile row found — auto-creating profile...');
        return await _autoCreateProfile(userId, client);
      }
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Profile fetch error:', err);
    return _localFallbackProfile(userId);
  }
}

// Helper: get username from auth user metadata
async function _getUsernameFromAuth(userId, client) {
  try {
    const { data: { user } } = await client.auth.getUser();
    if (user && user.id === userId && user.user_metadata) {
      return user.user_metadata.username || null;
    }
  } catch (e) { /* ignore */ }
  return null;
}

// Helper: auto-create a profile row in the database when one doesn't exist
async function _autoCreateProfile(userId, client) {
  try {
    const authUsername = await _getUsernameFromAuth(userId, client);
    const username = authUsername || 'user_' + userId.substring(0, 8);

    const newProfile = {
      id: userId,
      username: username,
      display_name: authUsername || 'New User',
      bio: '',
      avatar_url: null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await client
      .from('profiles')
      .upsert(newProfile, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.warn('Could not auto-create profile:', error.message);
      return _localFallbackProfile(userId);
    }

    console.log('Auto-created profile for user:', userId);
    return data;
  } catch (err) {
    console.warn('Auto-create profile error:', err);
    return _localFallbackProfile(userId);
  }
}

// Helper: return an in-memory fallback (won't persist)
function _localFallbackProfile(userId) {
  return {
    id: userId,
    username: 'user_' + userId.substring(0, 8),
    display_name: 'New User',
    bio: '',
    avatar_url: null
  };
}

async function updateProfile(userId, updates) {
  try {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase not connected');

    // Use upsert so it works even if the profile row doesn't exist yet
    const profileData = {
      id: userId,
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await client
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      // If profiles table doesn't exist, return a local fallback
      if (error.message && (error.message.includes('schema cache') || error.code === '42P01' || error.message.includes('relation') || error.message.includes('Could not find'))) {
        console.warn('Profiles table not found — returning local profile');
        return {
          id: userId,
          username: updates.username || 'user_' + userId.substring(0, 8),
          display_name: updates.display_name || 'New User',
          bio: updates.bio || '',
          avatar_url: updates.avatar_url || null,
          ...updates
        };
      }
      throw error;
    }
    return data;
  } catch (err) {
    // Catch-all: if it's a missing table error, return fallback
    if (err.message && (err.message.includes('schema cache') || err.message.includes('Could not find') || err.message.includes('relation'))) {
      console.warn('Profiles table error — returning local profile');
      return {
        id: userId,
        username: updates.username || 'user_' + userId.substring(0, 8),
        display_name: updates.display_name || 'New User',
        bio: updates.bio || '',
        avatar_url: updates.avatar_url || null,
        ...updates
      };
    }
    throw err;
  }
}

// ========================================
// POSTS FUNCTIONS (Updated for auth)
// ========================================

async function getPostsFromSupabase() {
  try {
    const client = getSupabaseClient();
    if (!client) return [];

    const { data, error } = await client
      .from('posts')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching posts:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Supabase fetch error:', err);
    return [];
  }
}

async function savePostToSupabase(post) {
  try {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase not connected');

    const { data, error } = await client
      .from('posts')
      .insert([post])
      .select();

    if (error) {
      console.error('Error saving post:', error);
      throw new Error(error.message);
    }
    return data[0];
  } catch (err) {
    console.error('Supabase save error:', err);
    throw err;
  }
}

async function updatePostReactionsInSupabase(postId, reactions) {
  try {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase not connected');

    const { data, error } = await client
      .from('posts')
      .update({ reactions })
      .eq('id', postId)
      .select();

    if (error) {
      console.error('Error updating reactions:', error);
      throw new Error(error.message);
    }
    return data[0];
  } catch (err) {
    console.error('Supabase update error:', err);
    throw err;
  }
}

async function deletePostFromSupabase(postId) {
  try {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase not connected');

    // Also delete related comments and bookmarks (ignore if tables don't exist)
    try { await client.from('comments').delete().eq('post_id', postId); } catch (e) { /* table may not exist */ }
    try { await client.from('bookmarks').delete().eq('post_id', postId); } catch (e) { /* table may not exist */ }

    const { error } = await client
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) {
      console.error('Error deleting post:', error);
      throw new Error(error.message);
    }
  } catch (err) {
    console.error('Supabase delete error:', err);
    throw err;
  }
}

// ========================================
// COMMENTS FUNCTIONS
// ========================================

async function getCommentsForPost(postId) {
  try {
    const client = getSupabaseClient();
    if (!client) return [];

    const { data, error } = await client
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      // Silently handle missing table
      if (error.message && (error.message.includes('schema cache') || error.code === '42P01')) {
        console.warn('Comments table not found — skipping');
        return [];
      }
      console.error('Error fetching comments:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Comments fetch error:', err);
    return [];
  }
}

async function addCommentToSupabase(comment) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase not connected');

  const { data, error } = await client
    .from('comments')
    .insert([comment])
    .select();

  if (error) {
    if (error.message && (error.message.includes('schema cache') || error.code === '42P01')) {
      throw new Error('Comments feature is not set up yet. Please run SUPABASE_AUTH_SETUP.sql first!');
    }
    throw error;
  }
  return data[0];
}

async function deleteCommentFromSupabase(commentId) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase not connected');

  const { error } = await client
    .from('comments')
    .delete()
    .eq('id', commentId);

  if (error) throw error;
}

// ========================================
// BOOKMARKS FUNCTIONS
// ========================================

async function getBookmarksFromSupabase(userId) {
  try {
    const client = getSupabaseClient();
    if (!client) return [];

    const { data, error } = await client
      .from('bookmarks')
      .select('post_id')
      .eq('user_id', userId);

    if (error) {
      // Silently handle missing table
      if (error.message && (error.message.includes('schema cache') || error.code === '42P01')) {
        console.warn('Bookmarks table not found — skipping');
        return [];
      }
      console.error('Error fetching bookmarks:', error);
      return [];
    }
    return (data || []).map(b => b.post_id);
  } catch (err) {
    console.error('Bookmarks fetch error:', err);
    return [];
  }
}

async function addBookmarkToSupabase(userId, postId) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase not connected');

  const { error } = await client
    .from('bookmarks')
    .insert([{ user_id: userId, post_id: postId }]);

  if (error) {
    if (error.message && (error.message.includes('schema cache') || error.code === '42P01')) {
      throw new Error('Bookmarks feature is not set up yet. Please run SUPABASE_AUTH_SETUP.sql first!');
    }
    throw error;
  }
}

async function removeBookmarkFromSupabase(userId, postId) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase not connected');

  const { error } = await client
    .from('bookmarks')
    .delete()
    .eq('user_id', userId)
    .eq('post_id', postId);

  if (error) throw error;
}

// ========================================
// REALTIME LISTENER
// ========================================

function setupRealtimeListener() {
  const client = getSupabaseClient();
  if (!client) return;

  client
    .channel('posts-changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'posts' },
      (payload) => {
        console.log('Posts updated:', payload);
        if (window.refreshFeed) {
          window.refreshFeed();
        }
      }
    )
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'comments' },
      (payload) => {
        console.log('Comments updated:', payload);
        if (window.refreshFeed) {
          window.refreshFeed();
        }
      }
    )
    .subscribe();
}

// Initialize real-time when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupRealtimeListener);
} else {
  setupRealtimeListener();
}
