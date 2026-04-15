type PackagedSkillFile = {
  relativePath: string;
  content: string;
};

// Keep this string synchronized with assets/skills/todo-board/SKILL.md.
const TODO_BOARD_SKILL_MD = `---
name: todo
description: Maintain a shared workspace TODO list with blocked tasks.
metadata: {"openclaw":{"skillKey":"todo-board"}}
---

# TODO Board

Use this skill when the user wants to manage a shared task list for the current workspace.

## Trigger

\`\`\`json
{
  "activation": {
    "anyPhrases": [
      "todo",
      "todo list",
      "blocked task",
      "blocked tasks",
      "add to my todo",
      "show my todo"
    ]
  },
  "movement": {
    "target": "desk",
    "skipIfAlreadyThere": true
  }
}
\`\`\`

When this skill is activated, the agent should return to its assigned desk before handling the request.

- If the user asks from Telegram or any other external surface to add, block, unblock, remove, or read TODO items, treat that as a trigger for this skill.
- The physical behavior for this skill is: go sit at the assigned desk, then perform the TODO board workflow.
- If the agent is already at the desk, continue without adding extra movement narration.

## Storage location

The authoritative task file is \`todo-skill/todo-list.json\` in the workspace root.

- Always treat that file as the source of truth.
- Never rely on chat memory alone for the latest task state.
- Create the \`todo-skill\` directory and \`todo-list.json\` file if they do not exist.

## Required workflow

1. Read \`todo-skill/todo-list.json\` before answering any task-management request.
2. If the file does not exist, create it with the schema in this document before continuing.
3. After every add, remove, block, or unblock action, write the full updated JSON back to disk.
4. If the file exists but is invalid JSON or does not match the schema, repair it into a valid structure, preserve any recoverable items, and mention that repair in your response.
5. If the user request is ambiguous, ask a clarifying question instead of guessing.

## Supported actions

- Add a task.
  Create a new item unless an equivalent active item already exists.
- Block a task.
  Change the matching item to \`status: "blocked"\`. If the task does not exist and the request is clear, create it directly as blocked.
- Unblock a task.
  Change the matching item back to \`status: "todo"\` and clear \`blockReason\`.
- Remove a task.
  Delete only the matching item. If multiple items could match, ask for clarification.
- Read the list.
  Summarize tasks grouped into \`TODO\` and \`BLOCKED\`.

## File format

Use this JSON shape:

\`\`\`json
{
  "version": 1,
  "updatedAt": "2026-03-22T00:00:00.000Z",
  "items": [
    {
      "id": "task-1",
      "title": "Example task",
      "status": "todo",
      "createdAt": "2026-03-22T00:00:00.000Z",
      "updatedAt": "2026-03-22T00:00:00.000Z",
      "blockReason": null
    }
  ]
}
\`\`\`

## Field rules

- Keep \`version\` at \`1\`.
- Generate stable, human-readable IDs such as \`prepare-demo\` or \`task-2\`.
- Keep titles concise and preserve the user's intent.
- Use only \`todo\` or \`blocked\` for \`status\`.
- Use ISO timestamps for \`createdAt\`, item \`updatedAt\`, and top-level \`updatedAt\`.
- Keep \`blockReason\` as \`null\` unless the user gave a reason or a short precise reason is clearly implied.

## Mutation rules

- Avoid duplicate active items that describe the same work.
- Preserve existing IDs and \`createdAt\` values for unchanged items.
- Update the touched item's \`updatedAt\` whenever you modify it.
- Update the top-level \`updatedAt\` on every write.
- Keep untouched items in their original order unless there is a strong reason to reorder them.

## Response style

- After each mutation, say what changed.
- When showing the list, group tasks into \`TODO\` and \`BLOCKED\`.
- Include each blocked task's reason when one exists.
`;

// Keep this string synchronized with assets/skills/todo-board/todo-list.example.json.
const TODO_BOARD_EXAMPLE_JSON = `{
  "version": 1,
  "updatedAt": "2026-03-22T00:00:00.000Z",
  "items": [
    {
      "id": "draft-roadmap",
      "title": "Draft the TODO skill roadmap",
      "status": "todo",
      "createdAt": "2026-03-22T00:00:00.000Z",
      "updatedAt": "2026-03-22T00:00:00.000Z",
      "blockReason": null
    },
    {
      "id": "gateway-access",
      "title": "Confirm gateway install access",
      "status": "blocked",
      "createdAt": "2026-03-22T00:00:00.000Z",
      "updatedAt": "2026-03-22T00:00:00.000Z",
      "blockReason": "Waiting for gateway credentials"
    }
  ]
}
`;

// Keep this string synchronized with assets/skills/task-manager/SKILL.md.
const TASK_MANAGER_SKILL_MD = `---
name: task-manager
description: Capture actionable user requests as persistent tasks, update task status as work progresses, and keep a shared task store in sync. Use when a user asks an agent to do work, check progress, block a task, complete a task, or manage the Kanban board.
metadata: {"openclaw":{"skillKey":"task-manager"}}
---

# Task Manager

Use this skill for task capture and task lifecycle updates.

## Trigger

\`\`\`json
{
  "activation": {
    "anyPhrases": [
      "add a task",
      "create a task",
      "track this task",
      "task status",
      "mark this done",
      "block this task",
      "what tasks do we have"
    ]
  },
  "movement": {
    "target": "desk",
    "skipIfAlreadyThere": true
  }
}
\`\`\`

Also use this skill even when those exact phrases are absent if the latest user message is an actionable work request. If the user asks the agent to do something, that request must become a task before the agent proceeds.

## Storage location

The authoritative task file is:

- \`\${OPENCLAW_STATE_DIR}/claw3d/task-manager/tasks.json\` when \`OPENCLAW_STATE_DIR\` is set.
- \`~/.openclaw/claw3d/task-manager/tasks.json\` otherwise.

Always treat that file as the shared source of truth for the Kanban board.

## Required workflow

1. Read the task file before handling an actionable request.
2. If the file does not exist, create it with the schema in this document.
3. If the latest user message is actionable and no matching active task exists, create one immediately.
4. Before starting execution, ensure the task is \`todo\` or move it to \`in_progress\`.
5. If work cannot continue, set the task to \`blocked\` and record a short reason in \`notes\`.
6. When work is finished, set the task to \`done\`.
7. When work needs user review or confirmation, set the task to \`review\`.
8. After every mutation, write the full updated JSON back to disk.

## Matching rules

- Match first by \`externalThreadId\` when the request comes from a stable thread or conversation.
- Otherwise match by a concise normalized title that preserves user intent.
- Avoid creating duplicate active tasks for the same request.

## Task fields

Each task must include:

- \`id\`
- \`title\`
- \`description\`
- \`status\`
- \`source\`
- \`sourceEventId\`
- \`assignedAgentId\`
- \`createdAt\`
- \`updatedAt\`
- \`playbookJobId\`
- \`runId\`
- \`channel\`
- \`externalThreadId\`
- \`lastActivityAt\`
- \`notes\`
- \`isArchived\`
- \`isInferred\`
- \`history\`

## Status rules

- New actionable requests start as \`todo\` unless work has already begun.
- Move to \`in_progress\` when the agent is actively working.
- Move to \`blocked\` when progress depends on missing input, credentials, approvals, or failures.
- Move to \`review\` when the work is ready for inspection or handoff.
- Move to \`done\` only when the requested work is complete.

## File format

\`\`\`json
{
  "schemaVersion": 1,
  "updatedAt": "2026-03-30T00:00:00.000Z",
  "tasks": [
    {
      "id": "research-mtulsa-com",
      "title": "Research mtulsa.com",
      "description": "Review mtulsa.com and summarize the site, positioning, and improvement opportunities.",
      "status": "in_progress",
      "source": "claw3d_manual",
      "sourceEventId": null,
      "assignedAgentId": "main",
      "createdAt": "2026-03-30T00:00:00.000Z",
      "updatedAt": "2026-03-30T00:10:00.000Z",
      "playbookJobId": null,
      "runId": null,
      "channel": "telegram",
      "externalThreadId": "telegram:direct:6866695577",
      "lastActivityAt": "2026-03-30T00:10:00.000Z",
      "notes": [],
      "isArchived": false,
      "isInferred": false,
      "history": [
        {
          "at": "2026-03-30T00:00:00.000Z",
          "type": "created",
          "note": "Task created.",
          "fromStatus": null,
          "toStatus": "todo"
        },
        {
          "at": "2026-03-30T00:10:00.000Z",
          "type": "status_changed",
          "note": null,
          "fromStatus": "todo",
          "toStatus": "in_progress"
        }
      ]
    }
  ]
}
\`\`\`

## Response rules

- Briefly confirm which task was created or updated.
- If the request is ambiguous, ask a clarifying question instead of guessing.
- Do not claim work is complete without updating the task status.
`;

// Keep this string synchronized with assets/skills/task-manager/tasks.example.json.
const TASK_MANAGER_EXAMPLE_JSON = `{
  "schemaVersion": 1,
  "updatedAt": "2026-03-30T00:10:00.000Z",
  "tasks": [
    {
      "id": "research-mtulsa-com",
      "title": "Research mtulsa.com",
      "description": "Review mtulsa.com and summarize the site, positioning, and improvement opportunities.",
      "status": "in_progress",
      "source": "claw3d_manual",
      "sourceEventId": null,
      "assignedAgentId": "main",
      "createdAt": "2026-03-30T00:00:00.000Z",
      "updatedAt": "2026-03-30T00:10:00.000Z",
      "playbookJobId": null,
      "runId": null,
      "channel": "telegram",
      "externalThreadId": "telegram:direct:6866695577",
      "lastActivityAt": "2026-03-30T00:10:00.000Z",
      "notes": [],
      "isArchived": false,
      "isInferred": false,
      "history": [
        {
          "at": "2026-03-30T00:00:00.000Z",
          "type": "created",
          "note": "Task created.",
          "fromStatus": null,
          "toStatus": "todo"
        },
        {
          "at": "2026-03-30T00:10:00.000Z",
          "type": "status_changed",
          "note": null,
          "fromStatus": "todo",
          "toStatus": "in_progress"
        }
      ]
    }
  ]
}
`;

// Keep this string synchronized with assets/skills/soundclaw/SKILL.md.
const SOUNDCLAW_SKILL_MD = `---
name: soundclaw
description: Control Spotify playback, search music, and return shareable music links.
metadata: {"openclaw":{"skillKey":"soundclaw"}}
---

# SOUNDCLAW

Use this skill when the user wants an agent to search for music, play a song or playlist, control Spotify playback, or send back a shareable Spotify link on the same channel the request came from.

## Trigger

\`\`\`json
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
\`\`\`

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
> The gateway skill handles agent-driven requests via the \`soundclaw.*\` RPC namespace.

### Authentication model

The user authenticates directly in the browser (PKCE, no secret required).
The access token is stored in browser \`localStorage\` under the key \`soundclaw_token\`.

For **agent-driven** playback (e.g. "play Jazz for me"), the gateway skill should either:
- Use a server-side Spotify app token (Client Credentials) for search-only actions, or
- Instruct the agent to tell the user to use the jukebox panel for actual playback

### RPC methods the gateway skill should expose

\`\`\`ts
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
\`\`\`

### Agent workflow

1. Agent receives a music request ("play some jazz", "find this song", etc.)
2. Agent walks to the jukebox (\`movement.target: "jukebox"\`)
3. Agent calls \`soundclaw.search\` to find the best match
4. If the request came from a chat channel (Telegram, etc.): call \`soundclaw.getLink\` and reply with the link
5. If the request came from the office UI: call \`soundclaw.play\` to start playback
6. Agent reports back what was played or linked
`;

// Keep this string synchronized with assets/skills/amazon-ordering/SKILL.md.
const AMAZON_ORDERING_SKILL_MD = `---
name: amazon
description: Buy and return items on Amazon using browser automation. Use for purchasing, reordering, checking order history, and processing returns.
metadata: {"openclaw":{"skillKey":"amazon-ordering"}}
---

# Amazon Ordering

Use this skill when the user wants an agent to buy something on Amazon, reorder a previous item, inspect Amazon order history, or start a return.

## Trigger

\`\`\`json
{
  "activation": {
    "anyPhrases": [
      "amazon",
      "buy on amazon",
      "order on amazon",
      "reorder on amazon",
      "amazon order history",
      "amazon return"
    ]
  },
  "movement": {
    "target": "shop",
    "skipIfAlreadyThere": true
  }
}
\`\`\`

When this skill is activated, the agent should walk to the office shop before handling the request.

- Treat requests from Telegram or any other external surface as valid triggers when they ask for Amazon purchasing, reordering, order lookup, or return processing.
- The physical behavior for this skill is: go to the shop, connect to the browser session, then perform the Amazon workflow.
- If the agent is already at the shop, continue without adding extra movement narration.

## Prerequisites

- \`agent-browser\` CLI installed.
- Chrome running with remote debugging enabled on port \`9222\`.
- Logged into Amazon. If logged out, retrieve the password from the configured password manager or ask the user to complete login.
- If running headless on Linux, use VNC or another visual path so the user can solve CAPTCHAs or 2FA when needed.

## Setup

Read \`skills/amazon-ordering/defaults.json\` before making a purchase or processing a return. Use these saved workspace defaults:

\`\`\`json
{
  "shippingAddress": "123 Main St, Springfield, IL 62704",
  "paymentMethod": "Visa ending in 4242",
  "returnDropoff": "Whole Foods"
}
\`\`\`

If \`defaults.json\` is missing, fall back to these environment variables:

\`\`\`bash
export AMAZON_SHIPPING_ADDRESS="Your shipping address"
export AMAZON_PAYMENT_METHOD="Your preferred card"
export AMAZON_RETURN_DROPOFF="Whole Foods"
\`\`\`

Always verify the shipping address and payment method before placing an order.

## Communication rules

- Do not narrate each click or intermediate browser step.
- Only message the user when you need clarification, confirmation, or manual intervention.
- If Amazon shows CAPTCHA, MFA, login recovery, or an unexpected checkout change, pause and ask the user to help.
- When a purchase, reorder, or return is confirmed, reply with a brief summary of the result.

## Ordering rules

### Reorders

- Go directly to Amazon order history and search for the item.
- Use "Buy it again" when the correct previous item is found.
- Verify the selected address and payment method.
- Place the order once the item clearly matches the user's request.
- No screenshot is required for a confirmed reorder unless something looks ambiguous.

### New items

- Search or navigate to the requested product.
- Before adding to cart, send the user a screenshot that clearly shows the product image and price.
- Wait for explicit user confirmation before continuing with a new item purchase.
- Verify the address and payment method again on checkout before placing the order.

### Order history and status

- Use order history for lookup, reorder decisions, and return eligibility checks.
- When the user asks about past purchases, summarize only the relevant orders instead of dumping the full page.
- If multiple similar orders match, ask which one they mean before acting.

## Return defaults

Use these defaults unless the user says otherwise:

- Return reason: "Changed Mind" -> "My needs changed".
- Packaging opened: Yes.
- Item in original packaging: Yes.
- Have you used the item: Yes.
- Signs of use: None.
- Battery leaks or overheating: No.
- All accessories included: Yes.
- Refund type: Refund to original payment method.
- Drop-off location: Use \`returnDropoff\` from \`defaults.json\`, or \`AMAZON_RETURN_DROPOFF\`, or Whole Foods.

## Return flow

1. Open order history and find the item.
2. Choose "Return or replace items".
3. Select "Changed Mind" and then "My needs changed".
4. Answer condition questions with the defaults in this document unless the user gave different facts.
5. Continue past support suggestions.
6. Select refund to the original payment method.
7. Select the preferred drop-off location.
8. Confirm the return.

After a successful return, send only a short confirmation that includes the item name, refund amount, and drop-off location plus deadline if Amazon shows one.

## Browser workflow

### Connect to the browser

\`\`\`bash
agent-browser connect 9222
\`\`\`

Always open a new tab because other sessions may share the same Chrome profile. Use \`--new-tab\` on every open command.

### Search order history

\`\`\`bash
agent-browser open --new-tab "https://www.amazon.com/gp/your-account/order-history"
agent-browser snapshot -i
\`\`\`

Use the order-history search box to find the relevant item.

### Reorder flow

\`\`\`bash
agent-browser click @[buy-it-again-ref]
agent-browser snapshot -i
\`\`\`

Verify the address and payment method before clicking the place-order control.

### Screenshot guidance

- Scroll past Amazon navigation bars before taking the screenshot.
- Ensure the product image and current price are both visible.
- Save the screenshot to a temporary location and send it with a short caption.

## Starting the browser if needed

### Linux desktop session

\`\`\`bash
google-chrome --user-data-dir=$HOME/.config/chrome-agent --no-first-run --remote-debugging-port=9222 https://www.amazon.com &
\`\`\`

### Linux headless session

\`\`\`bash
DISPLAY=:99 google-chrome --user-data-dir=$HOME/.config/chrome-agent --no-first-run --remote-debugging-port=9222 https://www.amazon.com &
\`\`\`

### macOS

\`\`\`bash
open -na "Google Chrome" --args --user-data-dir=$HOME/.config/chrome-agent --no-first-run --remote-debugging-port=9222 https://www.amazon.com
\`\`\`

## Notes

- The browser profile typically persists login at \`$HOME/.config/chrome-agent\`.
- Workspace defaults live in \`skills/amazon-ordering/defaults.json\`.
- Order confirmations go to the email on the Amazon account.
- If the user asks for a new purchase but has not confirmed the item screenshot yet, do not place the order.
- If the user asks for a return, use the silent return workflow and only surface the final result unless clarification is required.
`;

const PACKAGED_SKILL_FILES: Record<string, PackagedSkillFile[]> = {
  "amazon-ordering": [
    {
      relativePath: "SKILL.md",
      content: AMAZON_ORDERING_SKILL_MD,
    },
  ],
  "todo-board": [
    {
      relativePath: "SKILL.md",
      content: TODO_BOARD_SKILL_MD,
    },
    {
      relativePath: "todo-list.example.json",
      content: TODO_BOARD_EXAMPLE_JSON,
    },
  ],
  "task-manager": [
    {
      relativePath: "SKILL.md",
      content: TASK_MANAGER_SKILL_MD,
    },
    {
      relativePath: "tasks.example.json",
      content: TASK_MANAGER_EXAMPLE_JSON,
    },
  ],
  soundclaw: [
    {
      relativePath: "SKILL.md",
      content: SOUNDCLAW_SKILL_MD,
    },
  ],
};

export const readPackagedSkillFiles = (
  packageId: string,
): PackagedSkillFile[] => {
  const files = PACKAGED_SKILL_FILES[packageId];
  if (!files || files.length === 0) {
    throw new Error(`Packaged skill assets are missing: ${packageId}`);
  }
  if (!files.some((file) => file.relativePath === "SKILL.md")) {
    throw new Error(`Packaged skill is missing SKILL.md: ${packageId}`);
  }
  return files.map((file) => ({ ...file }));
};
