// Base URL of the Express backend.
// In development: http://localhost:3001
// In production behind Caddy the frontend and API share the same origin, so "" works.
const BASE_URL = import.meta.env.VITE_API_URL ?? "";

function getToken(): string | null {
  try {
    const auth = localStorage.getItem("auth");
    if (auth) return JSON.parse(auth).token;
  } catch {}
  return null;
}

async function authedFetch(url: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem("auth");
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return res.json();
}

// DB Query actions (authenticated, direct PostgreSQL via Express)
async function dbQuery(action: string, params: Record<string, unknown> = {}) {
  return authedFetch(`${BASE_URL}/db-query`, {
    method: "POST",
    body: JSON.stringify({ action, params }),
  });
}

// N8N proxy actions (authenticated) — always POST
async function proxyN8n(target: string, params: Record<string, unknown> = {}) {
  console.log(`[Webhook] Calling proxy-n8n target="${target}" with params:`, params);
  const result = await authedFetch(`${BASE_URL}/proxy-n8n`, {
    method: "POST",
    body: JSON.stringify({ target, params }),
  });
  console.log(`[Webhook] Response from target="${target}":`, result);
  return result;
}

// === News ===
export async function fetchAllNews() {
  return dbQuery("list_news");
}

// === Image Production ===
export async function saveImageData(data: {
  news_source_id: number;
  image_for_post: string;
  catogires: string;
  image_url: string;
  image_owner_name: string;
}) {
  return dbQuery("save_image_data", data);
}

export async function getImageByNewsId(news_source_id: number) {
  return dbQuery("get_image_by_news_id", { news_source_id });
}

export async function triggerImageGeneration(id: number, catogires: string) {
  console.log(`[Webhook] triggerImageGeneration called with id=${id}, catogires=${catogires}`);
  return proxyN8n("generate_image", { id, catogires });
}

export async function updateImageGeneratedUrl(news_source_id: number, download_link: string) {
  return dbQuery("update_image_generated_url", { news_source_id, download_link });
}

export async function fetchAllImages() {
  return dbQuery("list_images");
}

// === Reel Production ===
export async function saveReelData(data: {
  news_source_id: number;
  video_url: string;
  video_owner_name: string;
  video_dimension: string;
  reel_cover_image?: string;
}) {
  return dbQuery("save_reel_data", data);
}

export async function getReelByNewsId(news_source_id: number) {
  return dbQuery("get_reel_by_news_id", { news_source_id });
}

export async function triggerVideoGeneration(data: {
  id: number;
  video_url: string;
  video_dimension: string;
  video_without_voice_over: string;
  reel_cover_image?: string;
}) {
  console.log(`[Webhook] triggerVideoGeneration called with:`, data);
  return proxyN8n("make_video", data);
}

export async function updateReelGeneratedUrl(news_source_id: number, final_video: string) {
  return dbQuery("update_reel_generated_url", { news_source_id, final_video });
}

export async function fetchAllReels() {
  return dbQuery("list_reels");
}

export async function triggerCoverImageCreation(news_source_id: number) {
  console.log(`[Webhook] triggerCoverImageCreation called with news_source_id=${news_source_id}`);
  return proxyN8n("own_cover_image", { news_source_id });
}
