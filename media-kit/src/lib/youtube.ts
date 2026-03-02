/**
 * YouTube Data API v3 helpers for channel stats and recent videos.
 * Requires YOUTUBE_API_KEY in environment.
 */

const BASE = "https://www.googleapis.com/youtube/v3";

export interface YouTubeChannelStats {
  channelId: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  description: string;
  uploadsPlaylistId: string;
}

export interface RecentVideoStat {
  videoId: string;
  title: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

/**
 * Normalize input to a channel ID. Accepts:
 * - Raw channel ID (e.g. UC...)
 * - URL https://www.youtube.com/channel/UC...
 * Returns the channel ID or null if not parseable.
 */
export function parseChannelId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  // Already looks like a channel ID (starts with UC, 24 chars)
  if (/^UC[\w-]{22}$/.test(raw)) return raw;

  try {
    const url = raw.startsWith("http") ? new URL(raw) : new URL(`https://${raw}`);
    if (url.hostname.includes("youtube.com") || url.hostname.includes("youtu.be")) {
      const path = url.pathname;
      const channelMatch = path.match(/\/channel\/(UC[\w-]{22})/);
      if (channelMatch) return channelMatch[1];
      // /@handle or /c/... would need an API call to resolve; for "default to channel ID" we don't resolve here
    }
  } catch {
    // not a URL
  }
  return null;
}

/**
 * Resolve to a channel ID. If input is a channel ID or channel URL, returns it (or extracted ID).
 * If input looks like @handle, returns null (caller can treat as invalid or add forHandle lookup).
 */
export function resolveChannelId(input: string): string | null {
  return parseChannelId(input);
}

function getApiKey(): string | null {
  return process.env.YOUTUBE_API_KEY ?? null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Fetch channel statistics and snippet. Requires valid channel ID.
 */
export async function fetchChannelStats(channelId: string): Promise<YouTubeChannelStats> {
  const key = getApiKey();
  if (!key) throw new Error("YOUTUBE_API_KEY is not set");

  const url = new URL(`${BASE}/channels`);
  url.searchParams.set("key", key);
  url.searchParams.set("id", channelId);
  url.searchParams.set("part", "statistics,snippet,contentDetails");

  const data = (await fetchJson(url.toString())) as {
    items?: Array<{
      id: string;
      statistics?: { subscriberCount?: string; viewCount?: string; videoCount?: string };
      snippet?: { description?: string };
      contentDetails?: { relatedPlaylists?: { uploads?: string } };
    }>;
  };

  const item = data.items?.[0];
  if (!item) throw new Error("YouTube channel not found");

  const stats = item.statistics ?? {};
  const uploadsId = item.contentDetails?.relatedPlaylists?.uploads ?? "";

  return {
    channelId: item.id,
    subscriberCount: parseInt(stats.subscriberCount ?? "0", 10) || 0,
    viewCount: parseInt(stats.viewCount ?? "0", 10) || 0,
    videoCount: parseInt(stats.videoCount ?? "0", 10) || 0,
    description: item.snippet?.description ?? "",
    uploadsPlaylistId: uploadsId,
  };
}

/**
 * Fetch recent videos from the channel's uploads playlist (title + view/like/comment counts).
 */
export async function fetchRecentVideoStats(
  uploadsPlaylistId: string,
  maxResults: number = 12
): Promise<RecentVideoStat[]> {
  const key = getApiKey();
  if (!key) throw new Error("YOUTUBE_API_KEY is not set");
  if (!uploadsPlaylistId) return [];

  const playlistUrl = new URL(`${BASE}/playlistItems`);
  playlistUrl.searchParams.set("key", key);
  playlistUrl.searchParams.set("playlistId", uploadsPlaylistId);
  playlistUrl.searchParams.set("maxResults", String(maxResults));
  playlistUrl.searchParams.set("part", "contentDetails,snippet");

  const playlistData = (await fetchJson(playlistUrl.toString())) as {
    items?: Array<{ contentDetails?: { videoId?: string }; snippet?: { title?: string } }>;
  };

  const videoIds = (playlistData.items ?? [])
    .map((i) => i.contentDetails?.videoId)
    .filter(Boolean) as string[];

  if (videoIds.length === 0) return [];

  const videosUrl = new URL(`${BASE}/videos`);
  videosUrl.searchParams.set("key", key);
  videosUrl.searchParams.set("id", videoIds.join(","));
  videosUrl.searchParams.set("part", "statistics,snippet");

  const videosData = (await fetchJson(videosUrl.toString())) as {
    items?: Array<{
      id: string;
      statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
      snippet?: { title?: string };
    }>;
  };

  return (videosData.items ?? []).map((i) => ({
    videoId: i.id,
    title: i.snippet?.title ?? "",
    viewCount: parseInt(i.statistics?.viewCount ?? "0", 10) || 0,
    likeCount: parseInt(i.statistics?.likeCount ?? "0", 10) || 0,
    commentCount: parseInt(i.statistics?.commentCount ?? "0", 10) || 0,
  }));
}

/**
 * One-shot: fetch channel stats and recent video stats for a channel ID.
 */
export async function fetchYouTubeCreatorData(channelId: string): Promise<{
  channel: YouTubeChannelStats;
  recentVideos: RecentVideoStat[];
  avgViewsPerVideo: number;
  engagementProxy: number;
}> {
  const channel = await fetchChannelStats(channelId);
  const recentVideos = channel.uploadsPlaylistId
    ? await fetchRecentVideoStats(channel.uploadsPlaylistId)
    : [];

  const totalViews = recentVideos.reduce((s, v) => s + v.viewCount, 0);
  const totalEngagement = recentVideos.reduce(
    (s, v) => s + v.likeCount + v.commentCount,
    0
  );
  const avgViewsPerVideo =
    recentVideos.length > 0 ? totalViews / recentVideos.length : channel.viewCount / Math.max(1, channel.videoCount);
  const engagementProxy =
    totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0;

  return {
    channel,
    recentVideos,
    avgViewsPerVideo: Math.round(avgViewsPerVideo),
    engagementProxy,
  };
}
