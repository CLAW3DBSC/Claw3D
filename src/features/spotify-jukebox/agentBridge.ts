"use client";

import { useJukeboxStore } from "./store";
import { searchTracks } from "./spotifyApi";

type BrowserJukeboxCommand =
  | { kind: "pause" }
  | { kind: "resume" }
  | { kind: "next" }
  | { kind: "previous" }
  | { kind: "play"; query: string | null };

export type BrowserJukeboxExecutionResult =
  | { ok: false }
  | { ok: true; reply: string };

const normalize = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

const stripPlayPrefix = (normalizedMessage: string): string => {
  let value = normalizedMessage;
  value = value.replace(/\b(play|queue|put on|start)\b/g, " ");
  value = value.replace(/\b(on spotify|from spotify|on the jukebox|with the jukebox)\b/g, " ");
  value = value.replace(/\b(the )?(jukebox|spotify|music|song|songs|track|tracks)\b/g, " ");
  value = value.replace(/\s+/g, " ").trim();
  return value;
};

export const parseBrowserJukeboxCommand = (
  message: string | null | undefined,
): BrowserJukeboxCommand | null => {
  const normalized = normalize(message ?? "");
  if (!normalized) return null;

  if (/\b(pause|stop music|stop playback|stop song)\b/.test(normalized)) {
    return { kind: "pause" };
  }
  if (/\b(resume|continue|unpause)\b/.test(normalized)) {
    return { kind: "resume" };
  }
  if (/\b(next|skip)\b/.test(normalized)) {
    return { kind: "next" };
  }
  if (/\b(previous|prev|back)\b/.test(normalized)) {
    return { kind: "previous" };
  }
  if (/\b(play|queue|put on|start)\b/.test(normalized)) {
    const query = stripPlayPrefix(normalized);
    return { kind: "play", query: query.length > 0 ? query : null };
  }

  return null;
};

export const executeBrowserJukeboxCommand = async (
  message: string | null | undefined,
): Promise<BrowserJukeboxExecutionResult> => {
  const command = parseBrowserJukeboxCommand(message);
  if (!command) return { ok: false };

  const store = useJukeboxStore.getState();
  store.init();
  const { token } = useJukeboxStore.getState();
  if (!token) return { ok: false };

  switch (command.kind) {
    case "pause":
      await useJukeboxStore.getState().pause();
      return { ok: true, reply: "Paused the office jukebox." };
    case "resume":
      await useJukeboxStore.getState().resume();
      return { ok: true, reply: "Resumed the office jukebox." };
    case "next":
      await useJukeboxStore.getState().next();
      return { ok: true, reply: "Skipped to the next track on the office jukebox." };
    case "previous":
      await useJukeboxStore.getState().previous();
      return { ok: true, reply: "Went back to the previous track on the office jukebox." };
    case "play": {
      if (!command.query) {
        await useJukeboxStore.getState().resume();
        return { ok: true, reply: "Started the office jukebox." };
      }
      const results = await searchTracks(token, command.query);
      useJukeboxStore.setState({
        searchQuery: command.query,
        searchResults: results,
      });
      if (results.length === 0) {
        return { ok: false };
      }
      await useJukeboxStore.getState().play(results[0].uri);
      const top = results[0];
      const artist = top.artists[0]?.name ?? "Unknown artist";
      return {
        ok: true,
        reply: `Playing ${artist} - "${top.name}" on the office jukebox.`,
      };
    }
  }
};
