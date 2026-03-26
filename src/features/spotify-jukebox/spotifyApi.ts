"use client";

// Thin Spotify Web API wrapper used by the jukebox panel.

export type SpotifyTrack = {
  id: string;
  name: string;
  uri: string;
  durationMs: number;
  artists: { name: string }[];
  album: { name: string; images: { url: string; width: number; height: number }[] };
};

export type PlayerState = {
  isPlaying: boolean;
  progressMs: number;
  track: SpotifyTrack | null;
  volumePercent: number;
  deviceId: string | null;
};

type RawTrack = {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  artists: { name: string }[];
  album: { name: string; images: { url: string; width: number; height: number }[] };
};

type RawPlayerState = {
  is_playing: boolean;
  progress_ms: number;
  device: { id: string; volume_percent: number };
  item: RawTrack | null;
};

const BASE = "https://api.spotify.com/v1";

const headers = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

const mapTrack = (raw: RawTrack): SpotifyTrack => ({
  id: raw.id,
  name: raw.name,
  uri: raw.uri,
  durationMs: raw.duration_ms,
  artists: raw.artists,
  album: raw.album,
});

// ---------------------------------------------------------------------------
// Player state
// ---------------------------------------------------------------------------

export const fetchPlayerState = async (token: string): Promise<PlayerState | null> => {
  const res = await fetch(`${BASE}/me/player`, { headers: headers(token) });
  if (res.status === 204 || !res.ok) return null;
  const data = (await res.json()) as RawPlayerState;
  return {
    isPlaying: data.is_playing,
    progressMs: data.progress_ms,
    track: data.item ? mapTrack(data.item) : null,
    volumePercent: data.device?.volume_percent ?? 50,
    deviceId: data.device?.id ?? null,
  };
};

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export const searchTracks = async (token: string, query: string): Promise<SpotifyTrack[]> => {
  const params = new URLSearchParams({ q: query, type: "track", limit: "10" });
  const res = await fetch(`${BASE}/search?${params}`, { headers: headers(token) });
  if (!res.ok) return [];
  const data = await res.json() as { tracks: { items: RawTrack[] } };
  return (data.tracks?.items ?? []).map(mapTrack);
};

// ---------------------------------------------------------------------------
// Playback controls
// ---------------------------------------------------------------------------

export const playTrack = async (token: string, uri: string, deviceId?: string | null): Promise<void> => {
  const params = deviceId ? `?device_id=${deviceId}` : "";
  await fetch(`${BASE}/me/player/play${params}`, {
    method: "PUT",
    headers: headers(token),
    body: JSON.stringify({ uris: [uri] }),
  });
};

export const pausePlayback = async (token: string): Promise<void> => {
  await fetch(`${BASE}/me/player/pause`, { method: "PUT", headers: headers(token) });
};

export const resumePlayback = async (token: string): Promise<void> => {
  await fetch(`${BASE}/me/player/play`, { method: "PUT", headers: headers(token) });
};

export const skipToNext = async (token: string): Promise<void> => {
  await fetch(`${BASE}/me/player/next`, { method: "POST", headers: headers(token) });
};

export const skipToPrevious = async (token: string): Promise<void> => {
  await fetch(`${BASE}/me/player/previous`, { method: "POST", headers: headers(token) });
};

export const setVolume = async (token: string, volumePercent: number): Promise<void> => {
  const params = new URLSearchParams({ volume_percent: String(Math.round(volumePercent)) });
  await fetch(`${BASE}/me/player/volume?${params}`, { method: "PUT", headers: headers(token) });
};
