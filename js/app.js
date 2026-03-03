/* ========================================
   SPIPY — App Logic (with Supabase + Auth)
   ======================================== */

// ---- State ----
let currentPosts = [];
let currentUser = null;
let currentProfile = null;
let userBookmarks = [];

async function getPosts() {
  return await getPostsFromSupabase();
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ========================================
// AUTH UI
// ========================================

function showAuthModal() {
  document.getElementById('auth-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function hideAuthModal() {
  document.getElementById('auth-modal').style.display = 'none';
  document.body.style.overflow = '';
}

function showProfileModal() {
  if (!currentProfile) return;
  document.getElementById('edit-display-name').value = currentProfile.display_name || '';
  document.getElementById('edit-bio').value = currentProfile.bio || '';
  document.getElementById('edit-avatar-url').value = currentProfile.avatar_url || '';
  // Reset file input
  const fileInput = document.getElementById('edit-avatar-file');
  if (fileInput) fileInput.value = '';
  // Show current avatar in preview thumb
  const thumb = document.getElementById('avatar-preview-thumb');
  if (thumb) {
    if (currentProfile.avatar_url) {
      thumb.innerHTML = `<img src="${currentProfile.avatar_url}" alt="avatar">`;
    } else {
      thumb.textContent = '🌸';
    }
  }
  document.getElementById('profile-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function hideProfileModal() {
  document.getElementById('profile-modal').style.display = 'none';
  document.body.style.overflow = '';
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

  document.querySelector(`[data-auth-tab="${tab}"]`).classList.add('active');
  document.getElementById(`auth-form-${tab}`).classList.add('active');

  const footerText = document.getElementById('auth-footer-text');
  if (tab === 'login') {
    footerText.innerHTML = `Don't have an account? <a href="#" onclick="switchAuthTab('signup'); return false;">Sign up</a>`;
  } else {
    footerText.innerHTML = `Already have an account? <a href="#" onclick="switchAuthTab('login'); return false;">Login</a>`;
  }
}

async function handleSignUp(e) {
  e.preventDefault();
  const btn = document.getElementById('signup-submit-btn');
  const username = document.getElementById('signup-username').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;

  if (!username || !email || !password) {
    showToast('✏️ Fill in all fields!');
    return;
  }

  if (password.length < 6) {
    showToast('🔑 Password must be at least 6 characters!');
    return;
  }

  btn.textContent = 'Creating...';
  btn.disabled = true;

  try {
    const result = await signUpUser(email, password, username);

    if (result._needsConfirmation) {
      // Email confirmation is required
      showToast('📧 Check your email to confirm your account, then login!');
      switchAuthTab('login');
      // Pre-fill email in login form
      document.getElementById('login-email').value = email;
    } else if (result.session) {
      // Auto-logged in!
      showToast('✨ Account created! Welcome to Spipy!');
      hideAuthModal();
    } else {
      // No session and no confirmation flag — unusual, show confirmation message
      showToast('📧 Account created! Please check your email to confirm, then login.');
      switchAuthTab('login');
      document.getElementById('login-email').value = email;
    }
    // Clear signup form
    document.getElementById('signup-username').value = '';
    document.getElementById('signup-email').value = '';
    document.getElementById('signup-password').value = '';
  } catch (error) {
    const msg = (error.message || 'Signup failed').toLowerCase();
    if (msg.includes('already') || msg.includes('exists') || msg.includes('duplicate') || msg.includes('unique')) {
      showToast('🌸 An account with this email already exists! Try logging in.');
      switchAuthTab('login');
      document.getElementById('login-email').value = email;
    } else if (msg.includes('password') && (msg.includes('short') || msg.includes('weak') || msg.includes('least'))) {
      showToast('🔑 Password is too weak — use at least 6 characters!');
    } else {
      showToast('😭 ' + (error.message || 'Signup failed'));
    }
  } finally {
    btn.textContent = 'Create Account ✨';
    btn.disabled = false;
  }
}

async function handleSignIn(e) {
  e.preventDefault();
  const btn = document.getElementById('login-submit-btn');
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    showToast('✏️ Fill in all fields!');
    return;
  }

  btn.textContent = 'Logging in...';
  btn.disabled = true;

  try {
    await signInUser(email, password);
    showToast('🌸 Welcome back!');
    hideAuthModal();
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
  } catch (error) {
    const msg = (error.message || 'Login failed').toLowerCase();
    if (msg.includes('email not confirmed') || msg.includes('not confirmed') || msg.includes('email_not_confirmed')) {
      showToast('📧 Please check your email and confirm your account first!');
    } else if (msg.includes('invalid login') || msg.includes('invalid_credentials') || msg.includes('invalid credentials')) {
      showToast('🔑 Wrong email or password — try again!');
    } else if (msg.includes('too many requests') || msg.includes('rate limit')) {
      showToast('⏳ Too many attempts! Please wait a moment and try again.');
    } else {
      showToast('😭 ' + (error.message || 'Login failed'));
    }
  } finally {
    btn.textContent = 'Login ♡';
    btn.disabled = false;
  }
}

async function handleSignOut() {
  try {
    await signOutUser();
    showToast('👋 See you later!');
  } catch (error) {
    showToast('😭 Logout error: ' + error.message);
  }
}

async function handleProfileUpdate(e) {
  e.preventDefault();
  if (!currentUser) return;

  const displayName = document.getElementById('edit-display-name').value.trim();
  const bio = document.getElementById('edit-bio').value.trim();
  const avatarUrlInput = document.getElementById('edit-avatar-url').value.trim();
  const avatarFileInput = document.getElementById('edit-avatar-file');
  const avatarFile = avatarFileInput && avatarFileInput.files[0];

  let avatarUrl = avatarUrlInput || null;

  try {
    // If a file was chosen, upload it to Supabase Storage
    if (avatarFile) {
      try {
        showToast('📤 Uploading avatar...');
        avatarUrl = await uploadAvatar(currentUser.id, avatarFile);
        showToast('✅ Avatar uploaded!');
      } catch (uploadErr) {
        console.error('Avatar upload error:', uploadErr);
        // Fall back to URL if upload fails
        if (!avatarUrl) {
          // Convert file to base64 data URL as last resort
          avatarUrl = await fileToBase64(avatarFile);
        }
        showToast('⚠️ Upload failed, using fallback');
      }
    }

    const updated = await updateProfile(currentUser.id, {
      username: currentProfile?.username || ('user_' + currentUser.id.substring(0, 8)),
      display_name: displayName,
      bio: bio,
      avatar_url: avatarUrl
    });
    currentProfile = updated;
    updateProfileUI();
    updateNavAuthUI();
    hideProfileModal();
    showToast('✨ Profile updated!');
  } catch (error) {
    showToast('😭 Error: ' + error.message);
  }
}

// Convert file to base64 data URL (fallback)
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Preview avatar in the profile edit modal
function previewAvatar(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    showToast('🚫 Image too large! Max 2MB for avatars');
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const thumb = document.getElementById('avatar-preview-thumb');
    if (thumb) {
      thumb.innerHTML = `<img src="${e.target.result}" alt="preview">`;
    }
    // Clear URL field since file takes priority
    document.getElementById('edit-avatar-url').value = '';
  };
  reader.readAsDataURL(file);
}

// ---- Auth State ----
function toggleUserMenu() {
  const dropdown = document.getElementById('nav-dropdown');
  dropdown.classList.toggle('open');
}

function closeUserMenu() {
  const dropdown = document.getElementById('nav-dropdown');
  if (dropdown) dropdown.classList.remove('open');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  const menu = document.getElementById('nav-user-menu');
  if (menu && !menu.contains(e.target)) {
    closeUserMenu();
  }
});

function updateNavAuthUI() {
  const loginBtn = document.getElementById('nav-login-btn');
  const userDiv = document.getElementById('nav-user');
  const navAvatar = document.getElementById('nav-avatar');
  const navUsername = document.getElementById('nav-username');

  if (currentUser && currentProfile) {
    loginBtn.style.display = 'none';
    userDiv.style.display = 'flex';
    navUsername.textContent = currentProfile.display_name || currentProfile.username;
    if (currentProfile.avatar_url) {
      navAvatar.innerHTML = `<img src="${currentProfile.avatar_url}" alt="avatar" class="nav-avatar-img">`;
    } else {
      navAvatar.textContent = '🌸';
    }
  } else {
    loginBtn.style.display = 'inline-flex';
    userDiv.style.display = 'none';
  }
}

function updateCreateAreaUI() {
  const loginPrompt = document.getElementById('login-prompt');
  const formsWrapper = document.getElementById('create-forms-wrapper');

  if (currentUser) {
    loginPrompt.style.display = 'none';
    formsWrapper.style.display = 'block';
  } else {
    loginPrompt.style.display = 'block';
    formsWrapper.style.display = 'none';
  }
}

function updateProfileUI() {
  const section = document.getElementById('profile-section');

  if (currentUser && currentProfile) {
    section.style.display = 'block';
    document.getElementById('profile-display-name').textContent = currentProfile.display_name || currentProfile.username;
    document.getElementById('profile-username-tag').textContent = '@' + currentProfile.username;
    document.getElementById('profile-bio').textContent = currentProfile.bio || 'No bio yet — tell us about yourself! ✿';

    const avatarEl = document.getElementById('profile-avatar-lg');
    if (currentProfile.avatar_url) {
      avatarEl.innerHTML = `<img src="${currentProfile.avatar_url}" alt="avatar" class="profile-avatar-img">`;
    } else {
      avatarEl.textContent = '🌸';
    }

    // Count stats
    const myPosts = currentPosts.filter(p => p.user_id === currentUser.id).length;
    document.getElementById('profile-post-count').textContent = myPosts;
    document.getElementById('profile-bookmark-count').textContent = userBookmarks.length;
  } else {
    section.style.display = 'none';
  }
}

async function onAuthChange(event, session) {
  if (session?.user) {
    currentUser = session.user;
    currentProfile = await getProfile(currentUser.id);
    userBookmarks = await getBookmarksFromSupabase(currentUser.id);
  } else {
    currentUser = null;
    currentProfile = null;
    userBookmarks = [];
  }
  updateNavAuthUI();
  updateCreateAreaUI();
  updateProfileUI();
  renderFeed();
}

// ---- Tab Switching ----
document.querySelectorAll('.create-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.create-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.create-form').forEach(f => f.classList.remove('active'));

    tab.classList.add('active');
    const formId = 'form-' + tab.dataset.tab;
    document.getElementById(formId).classList.add('active');
  });
});

// ---- Image Preview ----
function previewImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    showToast('🚫 Image too large! Max 5MB');
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const preview = document.getElementById('image-preview');
    preview.src = e.target.result;
    preview.style.display = 'block';

    const uploadArea = document.getElementById('upload-area');
    uploadArea.querySelector('.upload-text').textContent = file.name;
    uploadArea.querySelector('.upload-hint').textContent = formatFileSize(file.size);
  };
  reader.readAsDataURL(file);
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ---- Create Post ----
async function createPost(type) {
  if (!currentUser) {
    showAuthModal();
    return;
  }

  let post = {
    id: generateId(),
    type: type,
    timestamp: new Date().toISOString(),
    reactions: { heart: 0, star: 0, sparkle: 0 },
    user_id: currentUser.id,
    username: currentProfile?.username || 'Anonymous'
  };

  switch (type) {
    case 'note': {
      const text = document.getElementById('note-text').value.trim();
      if (!text) {
        showToast('✏️ Write something first!');
        return;
      }
      post.content = text;
      document.getElementById('note-text').value = '';
      break;
    }

    case 'song': {
      const url = document.getElementById('song-url').value.trim();
      const caption = document.getElementById('song-caption').value.trim();

      if (!url) {
        showToast('🎵 Paste a Spotify link first!');
        return;
      }

      const embedUrl = convertSpotifyUrl(url);
      if (!embedUrl) {
        showToast('🚫 Invalid Spotify link! Use a track, album, or playlist URL');
        return;
      }

      post.content = embedUrl;
      post.caption = caption;
      document.getElementById('song-url').value = '';
      document.getElementById('song-caption').value = '';
      break;
    }

    case 'image': {
      const preview = document.getElementById('image-preview');
      const caption = document.getElementById('image-caption').value.trim();

      if (!preview.src || preview.style.display === 'none') {
        showToast('📷 Upload a photo first!');
        return;
      }

      post.content = preview.src;
      post.caption = caption;

      preview.style.display = 'none';
      preview.src = '';
      document.getElementById('image-file').value = '';
      document.getElementById('image-caption').value = '';
      const uploadArea = document.getElementById('upload-area');
      uploadArea.querySelector('.upload-text').textContent = 'Click or drag to upload';
      uploadArea.querySelector('.upload-hint').textContent = 'JPG, PNG, GIF — Max 5MB';
      break;
    }
  }

  try {
    await savePostToSupabase(post);
    await refreshFeed();
    await updateStats();
    showToast('✨ Posted successfully!');
  } catch (error) {
    showToast('😭 Error posting: ' + error.message);
  }
}

// ---- Spotify URL Converter ----
function convertSpotifyUrl(url) {
  try {
    let type, id;

    if (url.includes('open.spotify.com')) {
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        const validTypes = ['track', 'album', 'playlist', 'episode', 'show'];
        for (let i = 0; i < parts.length; i++) {
          if (validTypes.includes(parts[i]) && parts[i + 1]) {
            type = parts[i];
            id = parts[i + 1].split('?')[0];
            break;
          }
        }
      }
    } else if (url.startsWith('spotify:')) {
      const parts = url.split(':');
      if (parts.length >= 3) {
        type = parts[1];
        id = parts[2];
      }
    }

    if (type && id) {
      return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
    }
    return null;
  } catch {
    return null;
  }
}

// ---- Delete Post ----
async function deletePost(id) {
  try {
    await deletePostFromSupabase(id);
    await refreshFeed();
    await updateStats();
    showToast('🗑️ Post deleted');
  } catch (error) {
    showToast('😭 Error deleting post: ' + error.message);
  }
}

// ---- React to Post ----
async function reactToPost(postId, reactionType, event) {
  // Animate the button
  const btn = event ? event.currentTarget : null;
  if (btn) {
    btn.classList.remove('reacting');
    void btn.offsetWidth; // trigger reflow
    btn.classList.add('reacting');
    setTimeout(() => btn.classList.remove('reacting'), 500);

    // Spawn floating emoji particle
    const emojis = { heart: '🩷', star: '⭐', sparkle: '✨' };
    spawnReactionParticles(btn, emojis[reactionType] || '✨');
  }

  try {
    const posts = await getPosts();
    const post = posts.find(p => p.id === postId);
    if (post) {
      post.reactions[reactionType] = (post.reactions[reactionType] || 0) + 1;
      await updatePostReactionsInSupabase(postId, post.reactions);
      await refreshFeed();
    }
  } catch (error) {
    showToast('😭 Error reacting: ' + error.message);
  }
}

// ---- Particle Burst Effect ----
function spawnReactionParticles(element, emoji) {
  const rect = element.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  // Floating emoji
  const particle = document.createElement('div');
  particle.className = 'reaction-particle';
  particle.textContent = emoji;
  particle.style.left = (cx - 10) + 'px';
  particle.style.top = (cy - 10) + 'px';
  document.body.appendChild(particle);
  setTimeout(() => particle.remove(), 850);

  // Sparkle burst (6-8 tiny dots)
  const colors = ['#FFB6C1', '#C4A8E0', '#89CFF0', '#FFC947', '#FF85A2', '#B5EAD7'];
  const count = 6 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const spark = document.createElement('div');
    spark.className = 'sparkle-burst';
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const dist = 25 + Math.random() * 30;
    spark.style.left = cx + 'px';
    spark.style.top = cy + 'px';
    spark.style.background = colors[Math.floor(Math.random() * colors.length)];
    spark.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
    spark.style.setProperty('--ty', Math.sin(angle) * dist + 'px');
    spark.style.width = (3 + Math.random() * 5) + 'px';
    spark.style.height = spark.style.width;
    document.body.appendChild(spark);
    setTimeout(() => spark.remove(), 650);
  }
}

// ---- Comments ----
async function toggleComments(postId) {
  const commentsDiv = document.getElementById(`comments-${postId}`);
  if (!commentsDiv) return;

  if (commentsDiv.style.display === 'none' || !commentsDiv.style.display) {
    commentsDiv.style.display = 'block';
    await loadComments(postId);
  } else {
    commentsDiv.style.display = 'none';
  }
}

async function loadComments(postId) {
  const listEl = document.getElementById(`comment-list-${postId}`);
  if (!listEl) return;

  const comments = await getCommentsForPost(postId);
  if (comments.length === 0) {
    listEl.innerHTML = '<div class="comment-empty">No comments yet — be the first! 💬</div>';
  } else {
    listEl.innerHTML = comments.map(c => `
      <div class="comment-item">
        <div class="comment-header">
          <span class="comment-author">@${escapeHtml(c.username)}</span>
          <span class="comment-time">${getTimeAgo(c.created_at)}</span>
          ${currentUser && currentUser.id === c.user_id ? `<button class="comment-delete-btn" onclick="deleteComment('${c.id}', '${postId}')" title="Delete">✕</button>` : ''}
        </div>
        <p class="comment-text">${escapeHtml(c.content)}</p>
      </div>
    `).join('');
  }
}

async function submitComment(postId) {
  if (!currentUser) {
    showAuthModal();
    return;
  }

  const input = document.getElementById(`comment-input-${postId}`);
  const content = input.value.trim();
  if (!content) {
    showToast('✏️ Write a comment first!');
    return;
  }

  try {
    await addCommentToSupabase({
      id: generateId(),
      post_id: postId,
      user_id: currentUser.id,
      username: currentProfile?.username || 'Anonymous',
      content: content
    });
    input.value = '';
    await loadComments(postId);
    showToast('💬 Comment added!');
  } catch (error) {
    showToast('😭 Error: ' + error.message);
  }
}

async function deleteComment(commentId, postId) {
  try {
    await deleteCommentFromSupabase(commentId);
    await loadComments(postId);
    showToast('🗑️ Comment deleted');
  } catch (error) {
    showToast('😭 Error: ' + error.message);
  }
}

// ---- Bookmarks ----
// ---- Animate Button (generic pop) ----
function animateButton(btn) {
  if (!btn) return;
  btn.style.transform = 'scale(0.85)';
  setTimeout(() => { btn.style.transform = 'scale(1.2)'; }, 100);
  setTimeout(() => { btn.style.transform = 'scale(1)'; }, 250);
}

async function toggleBookmark(postId, event) {
  if (!currentUser) {
    showAuthModal();
    return;
  }

  const btn = event ? event.currentTarget : null;

  try {
    if (userBookmarks.includes(postId)) {
      await removeBookmarkFromSupabase(currentUser.id, postId);
      userBookmarks = userBookmarks.filter(id => id !== postId);
      showToast('🔖 Bookmark removed');
    } else {
      await addBookmarkToSupabase(currentUser.id, postId);
      userBookmarks.push(postId);
      showToast('🔖 Post bookmarked!');
      // Spawn particles on bookmark
      if (btn) spawnReactionParticles(btn, '🔖');
    }
    if (btn) animateButton(btn);
    renderFeed();
    updateProfileUI();
  } catch (error) {
    showToast('😭 Error: ' + error.message);
  }
}

// ---- Render Feed ----
function renderFeed() {
  const feed = document.getElementById('feed');
  const posts = currentPosts;

  if (posts.length === 0) {
    feed.innerHTML = `
      <div class="feed-empty">
        <div class="empty-icon">🌷</div>
        <div class="empty-text">No posts yet!</div>
        <div class="empty-hint">Be the first to share something cute ✨</div>
      </div>
    `;
    return;
  }

  feed.innerHTML = posts.map((post, index) => {
    const typeLabels = {
      note: { icon: '📝', label: 'Note', class: 'note' },
      song: { icon: '🎵', label: 'Song', class: 'song' },
      image: { icon: '📷', label: 'Photo', class: 'image' }
    };

    const typeInfo = typeLabels[post.type] || typeLabels.note;
    const timeAgo = getTimeAgo(post.timestamp);
    const reactions = post.reactions || { heart: 0, star: 0, sparkle: 0 };
    const isOwner = currentUser && post.user_id === currentUser.id;
    const isBookmarked = userBookmarks.includes(post.id);
    const authorName = post.username || 'Anonymous';

    let bodyContent = '';

    switch (post.type) {
      case 'note':
        bodyContent = `<p class="post-note-text">${escapeHtml(post.content)}</p>`;
        break;

      case 'song':
        bodyContent = `
          ${post.caption ? `<p class="post-note-text" style="margin-bottom: 12px;">${escapeHtml(post.caption)}</p>` : ''}
          <div class="post-spotify-embed">
            <iframe src="${post.content}" width="100%" height="152" frameborder="0" 
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy" style="border-radius: 12px;"></iframe>
          </div>
        `;
        break;

      case 'image':
        bodyContent = `
          <img class="post-image" src="${post.content}" alt="Shared photo" loading="lazy">
          ${post.caption ? `<p class="post-note-text" style="margin-top: 12px;">${escapeHtml(post.caption)}</p>` : ''}
        `;
        break;
    }

    return `
      <div class="post-card" style="animation-delay: ${index * 0.08}s;">
        <div class="post-card-header">
          <div class="post-author-info">
            <span class="post-author-avatar">🌸</span>
            <span class="post-author-name">@${escapeHtml(authorName)}</span>
          </div>
          <div class="post-header-right">
            <span class="post-type-badge ${typeInfo.class}">
              ${typeInfo.icon} ${typeInfo.label}
            </span>
            ${isOwner ? `<button class="post-delete-btn" onclick="deletePost('${post.id}')" title="Delete post">✕</button>` : ''}
          </div>
        </div>
        <div class="post-card-body">
          ${bodyContent}
        </div>
        <div class="post-card-footer">
          <span class="post-timestamp">${timeAgo}</span>
          <div class="post-actions">
            <div class="post-reactions">
              <button class="reaction-btn" onclick="reactToPost('${post.id}', 'heart', event)">
                🩷 ${reactions.heart || ''}
              </button>
              <button class="reaction-btn" onclick="reactToPost('${post.id}', 'star', event)">
                ⭐ ${reactions.star || ''}
              </button>
              <button class="reaction-btn" onclick="reactToPost('${post.id}', 'sparkle', event)">
                ✨ ${reactions.sparkle || ''}
              </button>
            </div>
            <button class="action-btn comment-toggle-btn" onclick="toggleComments('${post.id}'); animateButton(this)" title="Comments">
              💬
            </button>
            <button class="action-btn bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" onclick="toggleBookmark('${post.id}', event)" title="${isBookmarked ? 'Remove bookmark' : 'Bookmark'}">
              ${isBookmarked ? '🔖' : '🏷️'}
            </button>
          </div>
        </div>
        <!-- Comments Section (collapsible) -->
        <div class="post-comments" id="comments-${post.id}" style="display: none;">
          <div class="comment-list" id="comment-list-${post.id}">
            <div class="comment-empty">Loading...</div>
          </div>
          <div class="comment-input-wrap">
            <input class="comment-input" id="comment-input-${post.id}" type="text" placeholder="Write a comment..." onkeydown="if(event.key==='Enter') submitComment('${post.id}')">
            <button class="comment-send-btn" onclick="submitComment('${post.id}')">↗</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ---- Time Formatting ----
function getTimeAgo(isoString) {
  const now = new Date();
  const then = new Date(isoString);
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';

  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ---- Escape HTML ----
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ---- Update Stats ----
async function updateStats() {
  const posts = await getPosts();
  currentPosts = posts;
  const notes = posts.filter(p => p.type === 'note').length;
  const songs = posts.filter(p => p.type === 'song').length;

  animateNumber('stat-posts', posts.length);
  animateNumber('stat-notes', notes);
  animateNumber('stat-songs', songs);
}

// ---- Refresh Feed ----
async function refreshFeed() {
  const posts = await getPosts();
  currentPosts = posts;
  renderFeed();
  await updateStats();
  updateProfileUI();
}

window.refreshFeed = refreshFeed;

function animateNumber(elementId, target) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const start = parseInt(el.textContent) || 0;
  const duration = 600;
  const startTime = performance.now();

  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * eased);
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

// ---- Toast Notification ----
function showToast(message) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// ---- Sparkle Particles Generator ----
function createSparkles() {
  const container = document.getElementById('sparkles');
  const count = 20;

  for (let i = 0; i < count; i++) {
    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle';
    sparkle.style.left = Math.random() * 100 + '%';
    sparkle.style.animationDuration = (8 + Math.random() * 12) + 's';
    sparkle.style.animationDelay = Math.random() * 15 + 's';
    sparkle.style.width = (3 + Math.random() * 6) + 'px';
    sparkle.style.height = sparkle.style.width;

    const colors = [
      'rgba(255, 182, 193, 0.6)',
      'rgba(196, 168, 224, 0.6)',
      'rgba(176, 224, 230, 0.6)',
      'rgba(255, 245, 186, 0.6)',
      'rgba(255, 255, 255, 0.8)'
    ];
    sparkle.style.background = `radial-gradient(circle, ${colors[Math.floor(Math.random() * colors.length)]}, transparent)`;

    container.appendChild(sparkle);
  }
}

// ---- Navbar Scroll Effect ----
function handleNavbarScroll() {
  const navbar = document.getElementById('navbar');
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
}

// ---- Nav Create Button ----
document.getElementById('nav-create-btn').addEventListener('click', (e) => {
  e.preventDefault();
  if (!currentUser) {
    showAuthModal();
    return;
  }
  document.getElementById('create-area').scrollIntoView({ behavior: 'smooth', block: 'center' });
});

// ---- Bubble Menu (ReactBits inspired) ----
const bubbleTrigger = document.getElementById('bubble-trigger');
const bubbleMenu = document.getElementById('bubble-menu');

if (bubbleTrigger && bubbleMenu) {
  bubbleTrigger.addEventListener('click', () => {
    bubbleMenu.classList.toggle('open');
    bubbleTrigger.classList.toggle('open');
  });

  // Close bubble menu when clicking outside
  document.addEventListener('click', (e) => {
    if (bubbleMenu && !bubbleMenu.contains(e.target)) {
      bubbleMenu.classList.remove('open');
      bubbleTrigger.classList.remove('open');
    }
  });

  // Bubble menu item actions
  document.getElementById('bubble-note')?.addEventListener('click', () => {
    if (!currentUser) { showAuthModal(); return; }
    bubbleMenu.classList.remove('open');
    bubbleTrigger.classList.remove('open');
    // Activate note tab and scroll to create area
    document.querySelectorAll('.create-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.create-form').forEach(f => f.classList.remove('active'));
    document.querySelector('[data-tab="note"]')?.classList.add('active');
    document.getElementById('form-note')?.classList.add('active');
    document.getElementById('create-area').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  document.getElementById('bubble-song')?.addEventListener('click', () => {
    if (!currentUser) { showAuthModal(); return; }
    bubbleMenu.classList.remove('open');
    bubbleTrigger.classList.remove('open');
    document.querySelectorAll('.create-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.create-form').forEach(f => f.classList.remove('active'));
    document.querySelector('[data-tab="song"]')?.classList.add('active');
    document.getElementById('form-song')?.classList.add('active');
    document.getElementById('create-area').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  document.getElementById('bubble-photo')?.addEventListener('click', () => {
    if (!currentUser) { showAuthModal(); return; }
    bubbleMenu.classList.remove('open');
    bubbleTrigger.classList.remove('open');
    document.querySelectorAll('.create-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.create-form').forEach(f => f.classList.remove('active'));
    document.querySelector('[data-tab="image"]')?.classList.add('active');
    document.getElementById('form-image')?.classList.add('active');
    document.getElementById('create-area').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  document.getElementById('bubble-top')?.addEventListener('click', () => {
    bubbleMenu.classList.remove('open');
    bubbleTrigger.classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ---- Drag & Drop for Images ----
const uploadArea = document.getElementById('upload-area');

uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.style.borderColor = 'var(--pink-deep)';
  uploadArea.style.background = 'rgba(255, 214, 224, 0.3)';
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.style.borderColor = '';
  uploadArea.style.background = '';
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.style.borderColor = '';
  uploadArea.style.background = '';

  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    const input = document.getElementById('image-file');
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    input.files = dataTransfer.files;
    previewImage({ target: input });
  } else {
    showToast('🚫 Please drop an image file');
  }
});

// ---- Theme Toggle (Dark/Light Mode) ----
const THEME_KEY = 'spipy_theme';

function getTheme() {
  return localStorage.getItem(THEME_KEY) || 'light';
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
  const current = getTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  showToast(next === 'dark' ? '🌙 Dark mode activated' : '☀️ Light mode activated');
}

function initTheme() {
  const saved = getTheme();
  if (saved === 'dark') {
    setTheme('dark');
  }
}

document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

// Close modals on overlay click
document.getElementById('auth-modal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('auth-modal')) {
    hideAuthModal();
  }
});

document.getElementById('profile-modal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('profile-modal')) {
    hideProfileModal();
  }
});

// ---- Click Spark Effect (ReactBits inspired) ----
function initClickSpark() {
  const sparkColors = ['#FFB6C1', '#C4A8E0', '#89CFF0', '#FFC947', '#FF85A2', '#B5EAD7', '#FFD6E0', '#E6E6FA'];

  document.addEventListener('click', (e) => {
    // Don't spark on interactive elements to avoid visual clash
    if (e.target.closest('button, a, input, textarea, select, .modal-overlay')) return;

    const count = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      const spark = document.createElement('div');
      spark.className = 'click-spark';
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
      const dist = 30 + Math.random() * 50;
      spark.style.left = e.clientX + 'px';
      spark.style.top = e.clientY + 'px';
      spark.style.background = sparkColors[Math.floor(Math.random() * sparkColors.length)];
      spark.style.setProperty('--spark-tx', Math.cos(angle) * dist + 'px');
      spark.style.setProperty('--spark-ty', Math.sin(angle) * dist + 'px');
      spark.style.width = (4 + Math.random() * 5) + 'px';
      spark.style.height = spark.style.width;
      document.body.appendChild(spark);
      setTimeout(() => spark.remove(), 600);
    }
  });
}

// ---- 3D Cubes Background (ReactBits inspired) ----
function createCubes() {
  const container = document.getElementById('cubes-bg');
  if (!container) return;

  const cubeColors = [
    'rgba(255, 182, 193, 0.15)',
    'rgba(196, 168, 224, 0.15)',
    'rgba(137, 207, 240, 0.15)',
    'rgba(255, 245, 186, 0.15)',
    'rgba(181, 234, 215, 0.15)',
    'rgba(255, 214, 224, 0.12)',
    'rgba(230, 230, 250, 0.12)',
  ];

  const cubeCount = 8;
  for (let i = 0; i < cubeCount; i++) {
    const size = 30 + Math.random() * 50;
    const color = cubeColors[Math.floor(Math.random() * cubeColors.length)];
    const duration = 15 + Math.random() * 20;
    const delay = Math.random() * duration;
    const rotDuration = 8 + Math.random() * 12;
    const drift = (Math.random() - 0.5) * 100;
    const left = Math.random() * 100;

    const wrapper = document.createElement('div');
    wrapper.className = 'cube-wrapper';
    wrapper.style.cssText = `
      width: ${size}px; height: ${size}px;
      left: ${left}%;
      --cube-size: ${size}px;
      --cube-drift: ${drift}px;
      animation-duration: ${duration}s;
      animation-delay: -${delay}s;
    `;

    const cube = document.createElement('div');
    cube.className = 'cube';
    cube.style.animationDuration = rotDuration + 's';

    const faces = ['front', 'back', 'right', 'left', 'top', 'bottom'];
    faces.forEach(face => {
      const el = document.createElement('div');
      el.className = `cube-face ${face}`;
      el.style.background = color;
      cube.appendChild(el);
    });

    wrapper.appendChild(cube);
    container.appendChild(wrapper);
  }
}

// ---- Initialize ----
window.addEventListener('scroll', handleNavbarScroll);

async function initializeApp() {
  initTheme();
  createSparkles();
  initClickSpark();
  createCubes();

  // Setup auth listener
  onAuthStateChange(onAuthChange);

  // Check existing session
  const session = await getCurrentSession();
  if (session?.user) {
    currentUser = session.user;
    currentProfile = await getProfile(currentUser.id);
    userBookmarks = await getBookmarksFromSupabase(currentUser.id);
    updateNavAuthUI();
    updateCreateAreaUI();
  } else {
    updateCreateAreaUI();
  }

  // Load posts
  try {
    const posts = await getPostsFromSupabase();
    currentPosts = posts;
    renderFeed();
    await updateStats();
    updateProfileUI();
  } catch (error) {
    console.error('Error loading posts:', error);
    showToast('⚠️ Could not load posts from Supabase');
  }
}

document.addEventListener('DOMContentLoaded', initializeApp);
