/* ========================================
   SPIPY — App Logic
   ======================================== */

// ---- Data Store ----
const STORAGE_KEY = 'spipy_posts';

function getPosts() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function savePosts(posts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---- Tab Switching ----
document.querySelectorAll('.create-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    // Remove active from all tabs and forms
    document.querySelectorAll('.create-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.create-form').forEach(f => f.classList.remove('active'));

    // Activate clicked tab and corresponding form
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

    // Update upload area text
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
function createPost(type) {
  let post = {
    id: generateId(),
    type: type,
    timestamp: new Date().toISOString(),
    reactions: { heart: 0, star: 0, sparkle: 0 }
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

      // Convert to embed URL
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

      // Reset image form
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

  // Save and render
  const posts = getPosts();
  posts.unshift(post);
  savePosts(posts);
  renderFeed();
  updateStats();
  showToast('✨ Posted successfully!');
}

// ---- Spotify URL Converter ----
function convertSpotifyUrl(url) {
  // Patterns:
  // https://open.spotify.com/track/xxx
  // https://open.spotify.com/album/xxx
  // https://open.spotify.com/playlist/xxx
  // spotify:track:xxx
  try {
    let type, id;

    if (url.includes('open.spotify.com')) {
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split('/').filter(Boolean);
      // parts = ['track', 'id'] or ['intl-xx', 'track', 'id']
      if (parts.length >= 2) {
        // Find the type (track/album/playlist)
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
function deletePost(id) {
  let posts = getPosts();
  posts = posts.filter(p => p.id !== id);
  savePosts(posts);
  renderFeed();
  updateStats();
  showToast('🗑️ Post deleted');
}

// ---- React to Post ----
function reactToPost(postId, reactionType) {
  const posts = getPosts();
  const post = posts.find(p => p.id === postId);
  if (post) {
    post.reactions[reactionType] = (post.reactions[reactionType] || 0) + 1;
    savePosts(posts);
    renderFeed();
  }
}

// ---- Render Feed ----
function renderFeed() {
  const feed = document.getElementById('feed');
  const posts = getPosts();

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
          <span class="post-type-badge ${typeInfo.class}">
            ${typeInfo.icon} ${typeInfo.label}
          </span>
          <button class="post-delete-btn" onclick="deletePost('${post.id}')" title="Delete post">
            ✕
          </button>
        </div>
        <div class="post-card-body">
          ${bodyContent}
        </div>
        <div class="post-card-footer">
          <span class="post-timestamp">${timeAgo}</span>
          <div class="post-reactions">
            <button class="reaction-btn" onclick="reactToPost('${post.id}', 'heart')">
              🩷 ${reactions.heart || ''}
            </button>
            <button class="reaction-btn" onclick="reactToPost('${post.id}', 'star')">
              ⭐ ${reactions.star || ''}
            </button>
            <button class="reaction-btn" onclick="reactToPost('${post.id}', 'sparkle')">
              ✨ ${reactions.sparkle || ''}
            </button>
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
function updateStats() {
  const posts = getPosts();
  const notes = posts.filter(p => p.type === 'note').length;
  const songs = posts.filter(p => p.type === 'song').length;

  animateNumber('stat-posts', posts.length);
  animateNumber('stat-notes', notes);
  animateNumber('stat-songs', songs);
}

function animateNumber(elementId, target) {
  const el = document.getElementById(elementId);
  const start = parseInt(el.textContent) || 0;
  const duration = 600;
  const startTime = performance.now();

  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
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

    // Random pastel colors for variety
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

// ---- FAB & Nav Create Button ----
document.getElementById('fab').addEventListener('click', () => {
  const createArea = document.getElementById('create-area');
  createArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
  // Quick flash effect
  createArea.style.boxShadow = '0 0 0 4px rgba(255, 133, 162, 0.4), 0 12px 40px rgba(255, 182, 193, 0.25)';
  setTimeout(() => {
    createArea.style.boxShadow = '';
  }, 1500);
});

document.getElementById('nav-create-btn').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('create-area').scrollIntoView({ behavior: 'smooth', block: 'center' });
});

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

// ---- Initialize ----
window.addEventListener('scroll', handleNavbarScroll);
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  createSparkles();
  renderFeed();
  updateStats();
});
