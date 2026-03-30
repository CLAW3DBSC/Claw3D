import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { DELETE, GET, PUT } from "@/app/api/task-store/route";

const makeTempDir = (name: string) => fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));

describe("task store route", () => {
  const priorStateDir = process.env.OPENCLAW_STATE_DIR;
  let tempDir: string | null = null;

  afterEach(() => {
    process.env.OPENCLAW_STATE_DIR = priorStateDir;
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it("GET returns an empty task list by default", async () => {
    tempDir = makeTempDir("task-store-route-get");
    process.env.OPENCLAW_STATE_DIR = tempDir;

    const response = await GET();
    const body = (await response.json()) as { tasks?: unknown[] };

    expect(response.status).toBe(200);
    expect(body.tasks).toEqual([]);
  });

  it("PUT upserts a task and DELETE archives it", async () => {
    tempDir = makeTempDir("task-store-route-put");
    process.env.OPENCLAW_STATE_DIR = tempDir;

    const putResponse = await PUT(
      new Request("http://localhost/api/task-store", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          task: {
            id: "task-1",
            title: "Research mtulsa.com",
            status: "todo",
            source: "claw3d_manual",
          },
        }),
      })
    );
    const putBody = (await putResponse.json()) as {
      task?: { id?: string; isArchived?: boolean; history?: Array<{ type?: string }> };
    };

    expect(putResponse.status).toBe(200);
    expect(putBody.task?.id).toBe("task-1");
    expect(putBody.task?.history?.[0]?.type).toBe("created");

    const deleteResponse = await DELETE(
      new Request("http://localhost/api/task-store", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: "task-1" }),
      })
    );
    const deleteBody = (await deleteResponse.json()) as {
      task?: { isArchived?: boolean; history?: Array<{ type?: string }> };
    };

    expect(deleteResponse.status).toBe(200);
    expect(deleteBody.task?.isArchived).toBe(true);
    expect(deleteBody.task?.history?.some((entry) => entry.type === "archived")).toBe(true);
  });
});
