/**
 * Tests for the voice transcription API route — focusing on the upload size
 * limit that must be enforced BEFORE the request body is buffered into memory
 * (issue #7 fix).
 *
 * Uses mock request objects instead of real Request/FormData to avoid
 * vitest environment issues where Request.formData() hangs on Blob bodies.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks — must be hoisted before the route import.
// ---------------------------------------------------------------------------

vi.mock("@/lib/openclaw/voiceTranscription", () => ({
  transcribeVoiceWithOpenClaw: vi.fn().mockResolvedValue({
    transcript: "hello world",
    provider: "openai",
    model: "whisper-1",
    decision: { outcome: "success" },
    ignored: false,
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const { MAX_VOICE_UPLOAD_BYTES, POST } = await import(
  "@/app/api/office/voice/transcribe/route"
);

/** Create a File-like object that passes the route's duck-typing check. */
function makeAudioFile(byteLength: number) {
  return {
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(byteLength)),
    name: "voice.webm",
    type: "audio/webm",
  };
}

/**
 * Build a mock Request whose headers and formData are fully controlled,
 * avoiding the real Request/Blob path that hangs in vitest.
 */
function mockRequest(opts: {
  contentLength?: string;
  audioFile?: ReturnType<typeof makeAudioFile> | null;
}): Request {
  const headersMap = new Map<string, string>();
  if (opts.contentLength !== undefined) {
    headersMap.set("content-length", opts.contentLength);
  }

  const audio = opts.audioFile ?? null;
  const fakeFormData = {
    get: (key: string) => (key === "audio" ? audio : null),
  };

  return {
    headers: { get: (name: string) => headersMap.get(name) ?? null },
    formData: () => Promise.resolve(fakeFormData),
  } as unknown as Request;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/office/voice/transcribe — size limit enforcement (issue #7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // The early Content-Length check uses MAX_VOICE_UPLOAD_BYTES + 1024 as its
  // threshold because multipart/form-data requests include boundary/header
  // overhead on top of the raw audio bytes.
  const MULTIPART_OVERHEAD_ALLOWANCE = 1024;

  // ── Content-Length early rejection ────────────────────────────────────────

  it("returns 413 immediately when Content-Length clearly exceeds the limit + overhead", async () => {
    const oversizeBytes = MAX_VOICE_UPLOAD_BYTES + MULTIPART_OVERHEAD_ALLOWANCE + 1;
    const request = mockRequest({
      contentLength: String(oversizeBytes),
      audioFile: makeAudioFile(1),
    });

    const response = await POST(request);

    expect(response.status).toBe(413);
    const body = await response.json();
    expect(body.error).toMatch(/exceeds/i);
  });

  it("does NOT reject early when Content-Length is MAX + 1 (within multipart overhead allowance)", async () => {
    const request = mockRequest({
      contentLength: String(MAX_VOICE_UPLOAD_BYTES + 1),
      audioFile: makeAudioFile(1),
    });

    const response = await POST(request);
    expect(response.status).not.toBe(413);
  });

  it("does NOT reject when Content-Length equals MAX_VOICE_UPLOAD_BYTES exactly", async () => {
    const request = mockRequest({
      contentLength: String(MAX_VOICE_UPLOAD_BYTES),
      audioFile: makeAudioFile(1),
    });

    const response = await POST(request);
    expect(response.status).not.toBe(413);
  });

  // ── No Content-Length header — handled gracefully ─────────────────────────

  it("proceeds normally when Content-Length header is absent and file is within limit", async () => {
    const request = mockRequest({ audioFile: makeAudioFile(1024) });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.transcript).toBe("hello world");
  });

  it("returns 413 after buffering when Content-Length is absent but body exceeds limit", async () => {
    const request = mockRequest({
      audioFile: makeAudioFile(MAX_VOICE_UPLOAD_BYTES + 1),
    });

    const response = await POST(request);
    expect(response.status).toBe(413);
    const body = await response.json();
    expect(body.error).toMatch(/exceeds/i);
  });

  // ── Normal happy path ─────────────────────────────────────────────────────

  it("returns 200 with transcript for a valid upload within the size limit", async () => {
    const request = mockRequest({ audioFile: makeAudioFile(4096) });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      transcript: "hello world",
      provider: "openai",
      model: "whisper-1",
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  it("returns 400 when no audio field is present in the form", async () => {
    const request = mockRequest({ audioFile: null });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/audio file is required/i);
  });

  it("returns 400 for an empty audio file (0 bytes)", async () => {
    const request = mockRequest({ audioFile: makeAudioFile(0) });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/empty/i);
  });

  it("ignores a malformed (non-numeric) Content-Length header and falls through", async () => {
    const request = mockRequest({
      contentLength: "not-a-number",
      audioFile: makeAudioFile(512),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});
