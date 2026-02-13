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
      const res = await fetch("/api/feedback", { credentials: "include" });
      if (!res.ok) throw new Error("API unavailable");
      return await res.json();
    } catch {
      return loadLocalFeedback();
    }
  },

  // Get updates for a post
  async getUpdates(postId) {
    // Try production ASMX endpoint first
    try {
      const res = await fetch('ProjectServices.asmx/GetUpdatesForPost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ postId })
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return data.d || [];
      }
    } catch (e) {
      // fall through to mock
    }

    try {
      const res2 = await fetch(`/api/feedback/${encodeURIComponent(postId)}/updates`, { credentials: 'include' });
      if (!res2.ok) return [];
      return await res2.json();
    } catch {
      return [];
    }
  },

  // Create new feedback
  async create(feedback) {
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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
      await fetch(`/api/feedback/${id}/upvote`, { method: "POST", credentials: "include" });
    } catch {
      toggleLocalUpvote(id);
    }
  },

  // Update feedback
  async addUpdate(feedbackId, text) {
    try {
      await fetch(`/api/feedback/${feedbackId}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text })
      });
    } catch {
      const list = loadLocalFeedback();
      const item = list.find(f => f.id === feedbackId || String(f.id) === String(feedbackId));
      if (item) {
        item.updates = item.updates || [];
        item.updates.unshift({
          id: Date.now(),
          text,
          createdAt: new Date().toISOString()
        });
        saveLocalFeedback(list);
      }
    }
  }
};

// expose it if module pattern in file uses an object
// if file attaches functions to a global `feedbackService`, add:
// feedbackService.addUpdate = addUpdate;
