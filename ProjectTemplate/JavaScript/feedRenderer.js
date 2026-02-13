function renderEmptyState(container) {
  container.innerHTML = `
    <div class="feed-empty">
      <h2>No feedback yet</h2>
      <p>Be the first to share feedback.</p>
    </div>
  `;
}

function createPostElement(post, onUpvote) {
  const item = document.createElement("div");
  item.className = "feed-item";

  item.innerHTML = `
    <div class="feed-subject">${post.issue}</div>

    <div class="feed-text">
      <strong>Impact:</strong><br>${post.impact}<br><br>
      <strong>Suggestion:</strong><br>${post.suggestion}
    </div>

    <div class="post-meta">
      ${post.theme || "General"} • 
      ${new Date(post.createdAt).toLocaleDateString()}
    </div>

    <button class="upvote-btn">👍 ${post.upvotes}</button>
  `;

  item.querySelector(".upvote-btn").onclick = () => onUpvote(post.id);

  return item;
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
      ${post.theme} • 
      ${new Date(post.createdAt).toLocaleDateString()}
    </div>

    <button class="upvote-btn ${hasUpvoted ? "active" : ""}">
      👍 ${post.upvotes}
    </button>
  `;

  item.querySelector(".upvote-btn").onclick = () => onUpvote(post.id);

  return item;
}
