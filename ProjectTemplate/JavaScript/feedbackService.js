// Data access layer (local + API)
const LOCAL_STORAGE_KEY = "scrum_squad_feedback";

// Local helpers

function loadLocalFeedback() {
  return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
}

function saveLocalFeedback(list) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
}

// Local upvote toggle

function toggleLocalUpvote(id) {
  const list = loadLocalFeedback();
  const post = list.find(p => p.id === id);
  if (!post) return;

  const voteKey = `upvoted_${id}`;

  if (localStorage.getItem(voteKey)) {
    post.upvotes = Math.max(0, post.upvotes - 1);
    localStorage.removeItem(voteKey);
  } else {
    post.upvotes++;
    localStorage.setItem(voteKey, "true");
  }

  saveLocalFeedback(list);
}

// Feedback Service

const FeedbackService = {

  // Get all feedback (API first, local fallback)
  async getAll() {
    try {
      const res = await fetch("/api/feedback");
      if (!res.ok) throw new Error("API unavailable");
      return await res.json();
    } catch {
      return loadLocalFeedback();
    }
  },

  // Create new feedback
  async create(feedback) {
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feedback)
      });
    } catch {
      const list = loadLocalFeedback();

      list.unshift({
        id: Date.now(),
        issue: feedback.issue,
        impact: feedback.impact,
        suggestion: feedback.suggestion,
        theme: feedback.theme || "Other",
        createdAt: new Date().toISOString(),
        upvotes: 0
      });

      saveLocalFeedback(list);
    }
  },

  // Toggle upvote / un-upvote
  async toggleUpvote(id) {
    try {
      await fetch(`/api/feedback/${id}/upvote`, { method: "POST" });
    } catch {
      toggleLocalUpvote(id);
    }
  }
};
