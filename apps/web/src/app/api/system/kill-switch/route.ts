import { killSwitchSchema } from "@careerpulse/shared-types";
import { getDb } from "@/lib/db";
import { getSettings, updateSettings } from "@/lib/services/settings";
import { writeAudit, AUDIT_EVENTS } from "@/lib/services/audit";
import { requireSession } from "@/lib/api/guard";
import { ok, toErrorResponse, parseBody } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    await requireSession();
    const body = await parseBody(request, killSwitchSchema);
    const db = await getDb();
    const updated = await updateSettings(db, { kill_switch: body.enabled });
    await writeAudit(db, AUDIT_EVENTS.killSwitchToggled, { enabled: body.enabled });
    return ok({ kill_switch: updated.kill_switch });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function GET() {
  try {
    await requireSession();
    const db = await getDb();
    const settings = await getSettings(db);
    return ok({ kill_switch: settings.kill_switch });
  } catch (error) {
    return toErrorResponse(error);
  }
}
