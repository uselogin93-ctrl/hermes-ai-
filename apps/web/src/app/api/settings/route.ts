import { settingsPatchSchema } from "@careerpulse/shared-types";
import { getDb } from "@/lib/db";
import { getSettings, updateSettings } from "@/lib/services/settings";
import { writeAudit, AUDIT_EVENTS } from "@/lib/services/audit";
import { requireSession } from "@/lib/api/guard";
import { ok, toErrorResponse, parseBody } from "@/lib/api/response";

export async function GET() {
  try {
    await requireSession();
    const db = await getDb();
    return ok(await getSettings(db));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireSession();
    const patch = await parseBody(request, settingsPatchSchema);
    const db = await getDb();
    const updated = await updateSettings(db, patch);
    await writeAudit(db, AUDIT_EVENTS.settingsUpdated, { fields: Object.keys(patch) });
    return ok(updated);
  } catch (error) {
    return toErrorResponse(error);
  }
}
