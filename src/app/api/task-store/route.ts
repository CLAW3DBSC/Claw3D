import { archiveSharedTask, listSharedTasks, upsertSharedTask } from "@/lib/tasks/shared-store";

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

export async function GET() {
  return json({
    tasks: listSharedTasks(),
  });
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON payload." }, 400);
  }
  if (!isRecord(body) || !isRecord(body.task)) {
    return json({ error: "Task payload is required." }, 400);
  }
  const task = body.task;
  const id = typeof task.id === "string" ? task.id.trim() : "";
  const title = typeof task.title === "string" ? task.title.trim() : "";
  if (!id || !title) {
    return json({ error: "Task id and title are required." }, 400);
  }
  return json({
    task: upsertSharedTask({
      ...task,
      id,
      title,
    }),
  });
}

export async function DELETE(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON payload." }, 400);
  }
  if (!isRecord(body)) {
    return json({ error: "Task id is required." }, 400);
  }
  const taskId = typeof body.id === "string" ? body.id.trim() : "";
  if (!taskId) {
    return json({ error: "Task id is required." }, 400);
  }
  const task = archiveSharedTask(taskId);
  if (!task) {
    return json({ error: "Task not found." }, 404);
  }
  return json({ task });
}
