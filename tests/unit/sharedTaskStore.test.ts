import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  archiveSharedTask,
  listSharedTasks,
  resolveSharedTaskStorePath,
  upsertSharedTask,
} from "@/lib/tasks/shared-store";

const makeTempDir = (name: string) => fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));

describe("shared task store", () => {
  const priorStateDir = process.env.OPENCLAW_STATE_DIR;
  let tempDir: string | null = null;

  afterEach(() => {
    process.env.OPENCLAW_STATE_DIR = priorStateDir;
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it("creates and lists persisted tasks", () => {
    tempDir = makeTempDir("shared-task-store-create");
    process.env.OPENCLAW_STATE_DIR = tempDir;

    const created = upsertSharedTask({
      id: "task-1",
      title: "Research mtulsa.com",
      description: "Check site positioning.",
      status: "todo",
      source: "claw3d_manual",
    });

    expect(created.history).toHaveLength(1);
    expect(created.history[0]).toEqual(
      expect.objectContaining({
        type: "created",
        toStatus: "todo",
      })
    );

    const stored = listSharedTasks();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.title).toBe("Research mtulsa.com");
    expect(fs.existsSync(resolveSharedTaskStorePath())).toBe(true);
  });

  it("appends history when task status changes and archives instead of deleting", () => {
    tempDir = makeTempDir("shared-task-store-history");
    process.env.OPENCLAW_STATE_DIR = tempDir;

    upsertSharedTask({
      id: "task-1",
      title: "Research mtulsa.com",
      status: "todo",
      source: "claw3d_manual",
    });
    const updated = upsertSharedTask({
      id: "task-1",
      title: "Research mtulsa.com",
      status: "in_progress",
      source: "claw3d_manual",
    });
    const archived = archiveSharedTask("task-1");

    expect(updated.history.map((entry) => entry.type)).toContain("status_changed");
    expect(archived?.isArchived).toBe(true);
    expect(archived?.history.map((entry) => entry.type)).toContain("archived");
  });
});
