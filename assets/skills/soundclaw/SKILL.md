---
name: soundclaw
description: Control Spotify playback, search music, and return shareable music links.
metadata: {"openclaw":{"skillKey":"soundclaw"}}
---

# SOUNDCLAW

Use this skill when the user wants an agent to search for music, play a song or playlist, control Spotify playback, or send back a shareable Spotify link on the same channel the request came from.

## Trigger

```json
{
  "activation": {
    "anyPhrases": [
      "spotify",
      "play a song",
      "play this song",
      "play music",
      "play a playlist",
      "find a song",
      "queue this song",
      "music link"
    ]
  },
  "movement": {
    "target": "jukebox",
    "skipIfAlreadyThere": true
  }
}
```

When this skill is activated, the agent should walk to the office jukebox before handling the request.

- Treat requests from Telegram or any other external surface as valid triggers when they ask for Spotify playback, search, queueing, or music-link sharing.
- The physical behavior for this skill is: go to the jukebox, perform the music-selection workflow, then report the result.
- If the agent is already at the jukebox, continue without adding extra movement narration.

## Channel behavior

- Reply on the same active channel or session that received the request.
- If playback cannot start but a matching track, album, or playlist is found, send back the best Spotify link instead of failing silently.
- If multiple matches are plausible, ask a clarifying question instead of guessing.

---

## OpenClaw Gateway Skill Contract

> This section is for developers implementing the backend skill handler in OpenClaw.
> The Claw3D UI handles authentication via Spotify PKCE OAuth in the browser.
> The gateway skill handles agent-driven requests via the `soundclaw.*` RPC namespace.

### Authentication model

The user authenticates directly in the browser (PKCE, no secret required).
The access token is stored in browser `localStorage` under the key `soundclaw_token`.

For **agent-driven** playback (e.g. "play Jazz for me"), the gateway skill should either:
- Use a server-side Spotify app token (Client Credentials) for search-only actions, or
- Instruct the agent to tell the user to use the jukebox panel for actual playback

### RPC methods the gateway skill should expose

```ts
// Search for tracks. Returns a list of { name, artist, album, uri, spotifyUrl }.
soundclaw.search({ query: string }): SpotifySearchResult[]

// Get a shareable Spotify link for a query (for Telegram/chat replies).
soundclaw.getLink({ query: string }): { url: string; title: string }

// Report current playback state (reads from Spotify API).
soundclaw.playerStatus(): PlayerStatus | null

// Request playback of a URI (requires user to be authenticated in browser).
soundclaw.play({ uri: string }): { ok: boolean; message?: string }

// Pause / resume / skip.
soundclaw.pause(): void
soundclaw.resume(): void
soundclaw.next(): void
soundclaw.previous(): void
```

### Agent workflow

1. Agent receives a music request ("play some jazz", "find this song", etc.)
2. Agent walks to the jukebox (`movement.target: "jukebox"`)
3. Agent calls `soundclaw.search` to find the best match
4. If the request came from a chat channel (Telegram, etc.): call `soundclaw.getLink` and reply with the link
5. If the request came from the office UI: call `soundclaw.play` to start playback
6. Agent reports back what was played or linked
