let feedbackList = [];
let currentSort = "recent";
let currentUser = null;

document.addEventListener("DOMContentLoaded", initFeed);

async function initFeed() {
  const feed = document.getElementById("feedList");

  // Get current user
  try {
    const res = await fetch('/api/whoami', { credentials: 'include' });
    const data = await res.json();
    currentUser = data.ok ? data.user : null;
  } catch {
    currentUser = null;
  }

  // Show empty state immediately
  renderFeed(feed, [], handleUpvote, currentUser);

  feedbackList = await FeedbackService.getAll();
  render();
}


function render() {
  const feed = document.getElementById("feedList");
  renderFeed(feed, getSortedFeedback(), handleUpvote, currentUser);
}

function getSortedFeedback() {
  const list = [...feedbackList];

  if (currentSort === "upvotes") {
    return list.sort((a, b) => b.upvotes - a.upvotes);
  }

  if (currentSort === "date") {
    return list.sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
  }

  return list.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
}

function changeSort() {
  currentSort = document.getElementById("sortSelect").value;
  render();
}

async function handleUpvote(id) {
  await FeedbackService.toggleUpvote(id);
  feedbackList = await FeedbackService.getAll();
  render();
}

async function submitFeedback() {
  const issue = document.getElementById("issue").value.trim();
  const impact = document.getElementById("impact").value.trim();
  const suggestion = document.getElementById("suggestion").value.trim();
  const theme = document.getElementById("theme").value;

  if (!issue || !impact || !suggestion) return;

  const newPost = {
    id: Date.now(),
    issue,
    impact,
    suggestion,
    theme,
    upvotes: 0,
    createdAt: new Date().toISOString()
  };

  // Optimistic UI
  feedbackList.unshift(newPost);
  render();

  closeModal();

  // Persist
  await FeedbackService.create({ issue, impact, suggestion, theme });

  feedbackList = await FeedbackService.getAll();
  render();
}

// Modal helpers (UI only)

function openModal() {
  document.getElementById("modalOverlay").style.display = "flex";
}

function closeModal() {
  document.getElementById("modalOverlay").style.display = "none";
}
