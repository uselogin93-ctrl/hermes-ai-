import { google } from "googleapis";
import type { Connector, ConnectorContext, RawActivity } from "@/lib/connectors/types";

/** Files the picker can expose, limited to documents the app can actually read. */
const DOCUMENT_MIME = "application/vnd.google-apps.document";
const FOLDER_MIME = "application/vnd.google-apps.folder";

const NOTEBOOK_EXTENSIONS = [".ipynb", ".colab"];

function buildClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID ?? "",
    process.env.GOOGLE_CLIENT_SECRET ?? "",
    process.env.GOOGLE_OAUTH_REDIRECT_URI ?? "",
  );
}

export type DriveFolder = { id: string; name: string };

/**
 * Google Drive connector (read-only).
 *
 * Scope strategy follows `docs/03-auth-integrations.md`: `drive.file` plus the
 * Picker API is preferred, so the app only ever sees the folders the user
 * explicitly selected.
 */
export const googleDriveConnector: Connector = {
  provider: "google_drive",

  async fetchActivity(ctx: ConnectorContext, since: Date): Promise<RawActivity[]> {
    const auth = buildClient();
    auth.setCredentials({
      access_token: ctx.accessToken,
      refresh_token: ctx.refreshToken ?? undefined,
    });

    const drive = google.drive({ version: "v3", auth });
    const modifiedAfter = since.toISOString();

    const response = await drive.files.list({
      q: `modifiedTime > '${modifiedAfter}' and trashed = false`,
      orderBy: "modifiedTime desc",
      pageSize: 100,
      fields: "files(id,name,mimeType,modifiedTime,createdTime,webViewLink,size,owners,parents,trashed)",
    });

    const activities: RawActivity[] = [];

    for (const file of response.data.files ?? []) {
      if (!file.id || !file.modifiedTime) continue;
      if (file.mimeType === FOLDER_MIME) continue;

      const isNotebook = NOTEBOOK_EXTENSIONS.some((ext) => file.name?.toLowerCase().endsWith(ext));
      const createdAt = file.createdTime ? new Date(file.createdTime) : null;
      const modifiedAt = new Date(file.modifiedTime);
      const isNew =
        createdAt !== null && Math.abs(createdAt.getTime() - modifiedAt.getTime()) < 60_000;

      const eventType = isNotebook ? "notebook_updated" : isNew ? "doc_created" : "doc_edited";

      activities.push({
        externalId: `drive:${file.id}:${file.modifiedTime}`,
        eventType,
        title: `${isNew ? "Created" : "Edited"} ${file.name ?? "Untitled"}`,
        detail: {
          driveFileId: file.id,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size ?? null,
          owner: file.owners?.[0]?.emailAddress ?? null,
          isNotebook,
          parentIds: file.parents ?? [],
        },
        url: file.webViewLink ?? `https://drive.google.com/file/d/${file.id}`,
        occurredAt: modifiedAt,
      });
    }

    return activities;
  },

  async healthCheck(ctx: ConnectorContext) {
    try {
      const auth = buildClient();
      auth.setCredentials({
        access_token: ctx.accessToken,
        refresh_token: ctx.refreshToken ?? undefined,
      });
      const drive = google.drive({ version: "v3", auth });
      await drive.files.list({ pageSize: 1, fields: "files(id)" });
      return { ok: true, detail: ctx.label };
    } catch (error) {
      return { ok: false, detail: error instanceof Error ? error.message : "Token rejected" };
    }
  },
};

/** Lists Drive folders so the settings screen can offer a picker. */
export async function listDriveFolders(accessToken: string, refreshToken: string | null): Promise<DriveFolder[]> {
  const auth = buildClient();
  auth.setCredentials({ access_token: accessToken, refresh_token: refreshToken ?? undefined });
  const drive = google.drive({ version: "v3", auth });
  const response = await drive.files.list({
    q: `mimeType = '${FOLDER_MIME}' and trashed = false`,
    pageSize: 100,
    fields: "files(id,name)",
  });
  return (response.data.files ?? [])
    .filter((file): file is { id: string; name: string } => Boolean(file.id && file.name))
    .map((file) => ({ id: file.id!, name: file.name! }));
}

/** Documents are surfaced through the Drive API export endpoint. */
export async function exportDocumentText(
  accessToken: string,
  refreshToken: string | null,
  fileId: string,
): Promise<string> {
  const auth = buildClient();
  auth.setCredentials({ access_token: accessToken, refresh_token: refreshToken ?? undefined });
  const drive = google.drive({ version: "v3", auth });
  const response = await drive.files.export({ fileId, mimeType: "text/plain" });
  return typeof response.data === "string" ? response.data : "";
}

export { DOCUMENT_MIME };
