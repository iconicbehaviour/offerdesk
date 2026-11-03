type ObjectValue = Record<string, unknown>;

// This dataset belongs to a sole-owner private Site, not a multi-user product.
// Platform owner-private access must be preserved for the service updater.
export const OWNER_WORKSPACE_KEY = "owner";

export function initialOwnerState() { return {jobs:[],referrals:[],news:[],review:"",logs:[]}; }

function object(value: unknown): ObjectValue | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as ObjectValue : null;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const record = object(value);
  if (record) return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}

export function immutableSnapshotError(previous: unknown, next: unknown): string | null {
  const oldState = object(previous) ?? {};
  const nextState = object(next) ?? {};
  for (const collection of ["jobs", "applications"]) {
    const oldRecords = Array.isArray(oldState[collection]) ? oldState[collection] as unknown[] : [];
    const newRecords = Array.isArray(nextState[collection]) ? nextState[collection] as unknown[] : [];
    for (const entry of oldRecords) {
      const oldRecord = object(entry);
      if (!oldRecord) continue;
      const matching = newRecords.map(object).find(record => record?.id === oldRecord.id);
      for (const field of ["snapshot", "submittedSnapshot", "submissionSnapshot"]) {
        if (oldRecord[field] != null && canonical(oldRecord[field]) !== canonical(matching?.[field])) return "Submitted snapshots cannot be changed or removed. Create a new draft version instead.";
      }
      const error = preserveArray(oldRecord.snapshots, matching?.snapshots);
      if (error) return error;
      const submissionsError = preserveArray(oldRecord.submissions, matching?.submissions);
      if (submissionsError) return submissionsError;
    }
  }
  for (const field of ["submissions", "submissionSnapshots"]) {
    const error = preserveArray(oldState[field], nextState[field]);
    if (error) return error;
  }
  return null;
}

function preserveArray(previous: unknown, next: unknown): string | null {
  if (!Array.isArray(previous) || !previous.length) return null;
  if (!Array.isArray(next)) return "Submitted snapshots cannot be removed.";
  const nextItems = next.map(object);
  for (const item of previous) {
    const old = object(item);
    const match = old?.id != null ? nextItems.find(record => record?.id === old.id) : next.find(record => canonical(record) === canonical(item));
    if (!match || canonical(match) !== canonical(item)) return "Submitted snapshots cannot be changed or removed. Create a new draft version instead.";
  }
  return null;
}
