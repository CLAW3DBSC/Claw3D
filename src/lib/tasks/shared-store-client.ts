import type { SharedTaskRecord } from "@/lib/tasks/shared-store";

const TASK_STORE_ROUTE = "/api/task-store";

export class TaskStoreRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "TaskStoreRequestError";
    this.status = status;
  }
}

const parseResponse = async <T>(response: Response): Promise<T> => {
  const body = (await response.json().catch(() => null)) as { error?: string } & T;
  if (!response.ok) {
    throw new TaskStoreRequestError(
      body?.error || "Task store request failed.",
      response.status,
    );
  }
  return body;
};

export const listSharedTaskRecords = async (): Promise<SharedTaskRecord[]> => {
  const response = await fetch(TASK_STORE_ROUTE, {
    method: "GET",
    cache: "no-store",
  });
  const body = await parseResponse<{ tasks: SharedTaskRecord[] }>(response);
  return Array.isArray(body.tasks) ? body.tasks : [];
};

export const upsertSharedTaskRecord = async (
  task: Partial<SharedTaskRecord> & Pick<SharedTaskRecord, "id" | "title">
): Promise<SharedTaskRecord> => {
  const response = await fetch(TASK_STORE_ROUTE, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ task }),
  });
  const body = await parseResponse<{ task: SharedTaskRecord }>(response);
  return body.task;
};

export const archiveSharedTaskRecord = async (
  taskId: string
): Promise<SharedTaskRecord> => {
  const response = await fetch(TASK_STORE_ROUTE, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: taskId }),
  });
  const body = await parseResponse<{ task: SharedTaskRecord }>(response);
  return body.task;
};
