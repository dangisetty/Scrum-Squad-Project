function renderEmptyState(container) {
  container.innerHTML = `
    <div class="feed-empty">
      <h2>No feedback yet</h2>
      <p>Be the first to share feedback.</p>
    </div>
  `;
}


// Helper to anonymize author for display
function getAuthorLabel(post) {
  if (!post.author || post.author === 'anonymous') return 'Anonymous';
  // Show only last 3 chars of publicId for extra privacy
  if (post.author.startsWith('user-')) return 'User ' + post.author.slice(-3);
  return 'User';
}

function renderFeed(container, posts, onUpvote) {
  container.innerHTML = "";

  if (!posts.length) {
    renderEmptyState(container);
    return;
  }

  posts.forEach(post => {
    container.appendChild(createPostElement(post, onUpvote));
  });
}

function createPostElement(post, onUpvote) {
  const item = document.createElement("div");
  item.className = "feed-item";

  const hasUpvoted = localStorage.getItem(`upvoted_${post.id}`);

  item.innerHTML = `
    <div class="feed-subject">${post.issue}</div>

    <div class="feed-text">
      <strong>Impact:</strong><br>${post.impact}<br><br>
      <strong>Suggestion:</strong><br>${post.suggestion}
    </div>

    <div class="post-meta">
      ${post.theme} • ${new Date(post.createdAt).toLocaleDateString()} • <span class="author-label">${getAuthorLabel(post)}</span>
    </div>

    <button class="upvote-btn ${hasUpvoted ? "active" : ""}">
      👍 ${post.upvotes}
    </button>

    <button class="toggle-updates-btn" style="margin-left:1rem;">View Updates</button>
    <div class="updates-list" style="display:none;"></div>
  `;

  item.querySelector(".upvote-btn").onclick = () => onUpvote(post.id);

  // Toggle updates
  const toggleBtn = item.querySelector('.toggle-updates-btn');
  const updatesList = item.querySelector('.updates-list');
  let updatesLoaded = false;
  toggleBtn.onclick = async () => {
    if (updatesList.style.display === 'none') {
      if (!updatesLoaded) {
        updatesList.innerHTML = '<div class="loading">Loading updates...</div>';
        const updates = await FeedbackService.getUpdates(post.id);
        updatesList.innerHTML = '';
        if (updates.length === 0) {
          updatesList.innerHTML = '<div class="no-updates">No updates yet.</div>';
        } else {
          updates.forEach(u => {
            const uDiv = document.createElement('div');
            uDiv.className = 'feedback-update';
            uDiv.innerHTML = `<div class="update-meta"><strong>${u.authorRole}</strong> <span>${new Date(u.timestamp).toLocaleString()}</span></div><div class="update-text">${u.content}</div>`;
            updatesList.appendChild(uDiv);
          });
        }
        updatesLoaded = true;
      }
      updatesList.style.display = '';
      toggleBtn.textContent = 'Hide Updates';
    } else {
      updatesList.style.display = 'none';
      toggleBtn.textContent = 'View Updates';
    }
  };

  return item;
}
