/* ========================================
   SUPABASE Configuration
   ======================================== */

const SUPABASE_URL = 'https://pnihqpsppbfuzvrlmzgc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuaWhxcHNwcGJmdXp2cmxtemdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5OTY0MTcsImV4cCI6MjA4NzU3MjQxN30.z-G_HJz_Q7LcppgndwUnOLaDb9pi2rjRyNl4JivtpJY';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- Supabase Database Functions ----
async function getPostsFromSupabase() {
  try {
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    const { error } = await supabase
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

// Set up real-time listener for posts
const postsChannel = supabase
  .channel('posts-changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'posts' }, 
    (payload) => {
      console.log('Posts updated:', payload);
      // Refresh the feed when changes occur
      if (window.refreshFeed) {
        window.refreshFeed();
      }
    }
  )
  .subscribe();
