"use client";

import * as React from "react";
import { CaretDownIcon, FloppyDiskIcon } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import type {
  NotificationChannel,
  Settings,
  ToneProfile,
} from "@careerpulse/shared-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

type FormState = {
  posting_schedule_time: string;
  timezone: string;
  tone_profile: ToneProfile;
  user_name: string;
  user_role: string;
  user_background: string;
  notification_channel: NotificationChannel;
  telegram_chat_id: string;
  excluded_repos: string;
  excluded_drive_folders: string;
  banned_phrases: string;
  auto_draft_minor: boolean;
  auto_approve_minor: boolean;
  retention_days: string;
  kill_switch: boolean;
};

const TIMEZONE_SUGGESTIONS = ["Asia/Kolkata", "Europe/London", "America/New_York", "UTC"];

const TONE_PROFILES: {
  value: ToneProfile;
  label: string;
  description: string;
  preview: string;
}[] = [
  {
    value: "professional",
    label: "Professional",
    description: "Measured and plain, the way a senior engineer writes about their work.",
    preview: "Shipped a batched export pipeline that cut report generation from 40 minutes to 3.",
  },
  {
    value: "casual_technical",
    label: "Casual technical",
    description: "Relaxed and concrete, short sentences with the real numbers in them.",
    preview: "Finally got the export pipeline batched, report time went from 40 minutes to 3.",
  },
  {
    value: "storytelling",
    label: "Storytelling",
    description: "Starts with the problem, then shows what changed.",
    preview:
      "Six months ago a single report took 40 minutes. This week we shipped batching and brought that down to 3.",
  },
];

const NOTIFICATION_CHANNELS: { value: NotificationChannel; label: string }[] = [
  { value: "telegram", label: "Telegram" },
  { value: "email", label: "Email" },
  { value: "none", label: "None" },
];

/** Splits a textarea into a clean list, one entry per line or comma. */
function parseList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function sameList(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((entry, index) => entry === right[index]);
}

function toFormState(settings: Settings): FormState {
  return {
    posting_schedule_time: settings.posting_schedule_time,
    timezone: settings.timezone,
    tone_profile: settings.tone_profile,
    user_name: settings.user_name,
    user_role: settings.user_role,
    user_background: settings.user_background,
    notification_channel: settings.notification_channel,
    telegram_chat_id: settings.telegram_chat_id,
    excluded_repos: settings.excluded_repos.join("\n"),
    excluded_drive_folders: settings.excluded_drive_folders.join("\n"),
    banned_phrases: settings.banned_phrases.join("\n"),
    auto_draft_minor: settings.auto_draft_minor,
    auto_approve_minor: settings.auto_approve_minor,
    retention_days: String(settings.retention_days),
    kill_switch: settings.kill_switch,
  };
}

function readMessage(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null) return undefined;
  const failure = (payload as Record<string, unknown>).error;
  if (typeof failure === "object" && failure !== null) {
    const message = (failure as Record<string, unknown>).message;
    if (typeof message === "string") return message;
  }
  return undefined;
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-[12px] leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function SwitchRow({
  label,
  description,
  checked,
  onCheckedChange,
  id,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  id: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <Label htmlFor={id}>{label}</Label>
        <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} className="mt-0.5" />
    </div>
  );
}

/**
 * The settings form.
 *
 * Only the fields the user actually touched are sent to the server, so a save
 * never overwrites a value that changed somewhere else.
 */
export function SettingsForm({
  settings,
  promptVersions,
}: {
  settings: Settings;
  promptVersions: Record<string, string> | null;
}) {
  const [state, setState] = React.useState<FormState>(() => toFormState(settings));
  const [baselineSettings, setBaselineSettings] = React.useState<Settings>(settings);
  const [saving, setSaving] = React.useState(false);

  const baseline = React.useMemo(() => toFormState(baselineSettings), [baselineSettings]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState((current) => ({ ...current, [key]: value }));
  };

  const dirty = JSON.stringify(state) !== JSON.stringify(baseline);
  const tone = TONE_PROFILES.find((profile) => profile.value === state.tone_profile);

  const save = async () => {
    if (!/^\d{2}:\d{2}$/.test(state.posting_schedule_time)) {
      toast.error("The posting time needs to be a valid time of day.");
      return;
    }
    if (state.user_name.trim().length === 0) {
      toast.error("Your name cannot be empty, the writer uses it in every post.");
      return;
    }
    const retention = Number.parseInt(state.retention_days, 10);
    if (!Number.isInteger(retention) || retention < 1 || retention > 3650) {
      toast.error("The retention period has to be a whole number of days between 1 and 3650.");
      return;
    }

    const patch: Partial<Settings> = {};
    if (state.posting_schedule_time !== baseline.posting_schedule_time) {
      patch.posting_schedule_time = state.posting_schedule_time;
    }
    if (state.timezone.trim() !== baseline.timezone) patch.timezone = state.timezone.trim();
    if (state.tone_profile !== baseline.tone_profile) patch.tone_profile = state.tone_profile;
    if (state.user_name.trim() !== baseline.user_name) patch.user_name = state.user_name.trim();
    if (state.user_role.trim() !== baseline.user_role) patch.user_role = state.user_role.trim();
    if (state.user_background !== baseline.user_background) {
      patch.user_background = state.user_background;
    }
    if (state.notification_channel !== baseline.notification_channel) {
      patch.notification_channel = state.notification_channel;
    }
    if (state.telegram_chat_id.trim() !== baseline.telegram_chat_id) {
      patch.telegram_chat_id = state.telegram_chat_id.trim();
    }

    const repos = parseList(state.excluded_repos);
    if (!sameList(repos, baselineSettings.excluded_repos)) patch.excluded_repos = repos;

    const folders = parseList(state.excluded_drive_folders);
    if (!sameList(folders, baselineSettings.excluded_drive_folders)) {
      patch.excluded_drive_folders = folders;
    }

    const phrases = parseList(state.banned_phrases);
    if (!sameList(phrases, baselineSettings.banned_phrases)) patch.banned_phrases = phrases;

    if (state.auto_draft_minor !== baseline.auto_draft_minor) {
      patch.auto_draft_minor = state.auto_draft_minor;
    }
    if (state.auto_approve_minor !== baseline.auto_approve_minor) {
      patch.auto_approve_minor = state.auto_approve_minor;
    }
    if (retention !== baselineSettings.retention_days) patch.retention_days = retention;
    if (state.kill_switch !== baseline.kill_switch) patch.kill_switch = state.kill_switch;

    if (Object.keys(patch).length === 0) {
      toast.info("Nothing changed, so there was nothing to save.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const payload = (await response.json()) as unknown;

      if (!response.ok) {
        toast.error(readMessage(payload) ?? "The settings could not be saved.");
        return;
      }

      const updated = payload as Settings;
      const next = toFormState(updated);
      setState(next);
      setBaselineSettings(updated);
      toast.success("Settings saved.");
    } catch {
      toast.error("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
            <CardDescription>
              When the daily cycle runs, and which clock it follows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field
              label="Posting time"
              htmlFor="posting-time"
              hint="The daily cycle prepares the draft before this time, so it is ready when you log in."
            >
              <Input
                id="posting-time"
                type="time"
                value={state.posting_schedule_time}
                onChange={(event) => update("posting_schedule_time", event.target.value)}
                className="w-[180px]"
              />
            </Field>

            <Field
              label="Timezone"
              htmlFor="timezone"
              hint="An IANA timezone name, for example Asia/Kolkata. Day grouping and the schedule both follow it."
            >
              <Input
                id="timezone"
                value={state.timezone}
                onChange={(event) => update("timezone", event.target.value)}
                placeholder="Asia/Kolkata"
                className="font-mono"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {TIMEZONE_SUGGESTIONS.map((zone) => (
                  <Button
                    key={zone}
                    variant="quiet"
                    size="sm"
                    onClick={() => update("timezone", zone)}
                    className="font-mono"
                  >
                    {zone}
                  </Button>
                ))}
              </div>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Voice</CardTitle>
            <CardDescription>The tone the writer agent uses for every draft.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Tone profile" htmlFor="tone-profile">
              <Select
                value={state.tone_profile}
                onValueChange={(value) => update("tone_profile", value as ToneProfile)}
              >
                <SelectTrigger id="tone-profile">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONE_PROFILES.map((profile) => (
                    <SelectItem key={profile.value} value={profile.value}>
                      {profile.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {tone ? (
              <>
                <p className="text-[12px] leading-relaxed text-muted-foreground">{tone.description}</p>
                <div className="rounded-md border border-border bg-surface-muted/60 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                    Preview
                  </p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-foreground">{tone.preview}</p>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your profile</CardTitle>
            <CardDescription>
              The details the writer uses so a post sounds like it came from you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Name" htmlFor="user-name">
              <Input
                id="user-name"
                value={state.user_name}
                onChange={(event) => update("user_name", event.target.value)}
                placeholder="Your name"
              />
            </Field>

            <Field label="Role" htmlFor="user-role">
              <Input
                id="user-role"
                value={state.user_role}
                onChange={(event) => update("user_role", event.target.value)}
                placeholder="Software Engineer"
              />
            </Field>

            <Field
              label="Background"
              htmlFor="user-background"
              hint="A few lines about what you work on. The writer uses it to avoid repeating topics you already covered."
            >
              <Textarea
                id="user-background"
                rows={4}
                value={state.user_background}
                onChange={(event) => update("user_background", event.target.value)}
                placeholder="Backend engineer working on data pipelines and developer tooling."
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sources to ignore</CardTitle>
            <CardDescription>
              Anything here is skipped before a draft is written. One entry per line.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field
              label="Repositories"
              htmlFor="excluded-repos"
              hint="Repository names, for example internal-docs. Commits and pull requests from these are never used."
            >
              <Textarea
                id="excluded-repos"
                rows={3}
                value={state.excluded_repos}
                onChange={(event) => update("excluded_repos", event.target.value)}
                placeholder={"internal-docs\nscratch-notebooks"}
                className="font-mono"
              />
            </Field>

            <Field
              label="Drive folders"
              htmlFor="excluded-folders"
              hint="Folder ids from the Drive URL. Documents inside these folders are skipped."
            >
              <Textarea
                id="excluded-folders"
                rows={3}
                value={state.excluded_drive_folders}
                onChange={(event) => update("excluded_drive_folders", event.target.value)}
                placeholder="1AbCdEfGhIjKlMnOpQrStUvWxYz"
                className="font-mono"
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Banned phrases</CardTitle>
            <CardDescription>
              Words or sentences the writer is not allowed to use. One entry per line.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Field
              label="Banned phrases"
              htmlFor="banned-phrases"
              hint="The reviewer flags any draft that contains one of these."
            >
              <Textarea
                id="banned-phrases"
                rows={5}
                value={state.banned_phrases}
                onChange={(event) => update("banned_phrases", event.target.value)}
                placeholder={"excited to announce\ngame changer"}
                className="font-mono"
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Where the app asks you to review a draft.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Channel" htmlFor="notification-channel">
              <Select
                value={state.notification_channel}
                onValueChange={(value) => update("notification_channel", value as NotificationChannel)}
              >
                <SelectTrigger id="notification-channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_CHANNELS.map((channel) => (
                    <SelectItem key={channel.value} value={channel.value}>
                      {channel.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="Telegram chat id"
              htmlFor="telegram-chat-id"
              hint="The numeric chat id the message goes to. It is the id in the URL of your own chat."
            >
              <Input
                id="telegram-chat-id"
                value={state.telegram_chat_id}
                onChange={(event) => update("telegram_chat_id", event.target.value)}
                placeholder="123456789"
                className="font-mono"
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Automation</CardTitle>
            <CardDescription>How much the system is allowed to do on its own.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SwitchRow
              id="auto-draft-minor"
              label="Draft minor updates too"
              description="Small changes such as a typo fix also become a draft. With this off, only work worth a post reaches you."
              checked={state.auto_draft_minor}
              onCheckedChange={(value) => update("auto_draft_minor", value)}
            />

            <Separator />

            <SwitchRow
              id="auto-approve-minor"
              label="Publish minor updates without review"
              description="Minor drafts are posted to LinkedIn as soon as they are written. You never see them first."
              checked={state.auto_approve_minor}
              onCheckedChange={(value) => update("auto_approve_minor", value)}
            />

            {state.auto_approve_minor ? (
              <div className="rounded-md border border-warning/40 bg-warning-subtle px-3 py-2.5">
                <p className="text-[12px] font-medium text-warning">Auto-approve is on</p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  Minor updates will be published on their own, with no review step. A post can reach
                  your feed before you have read it. Turn this off if you want to approve every post.
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data</CardTitle>
            <CardDescription>How long the app keeps what it collected.</CardDescription>
          </CardHeader>
          <CardContent>
            <Field
              label="Retention period in days"
              htmlFor="retention-days"
              hint="Activity, drafts and post records older than this are removed by the cleanup job."
            >
              <Input
                id="retention-days"
                type="number"
                min={1}
                max={3650}
                value={state.retention_days}
                onChange={(event) => update("retention_days", event.target.value)}
                className="w-[160px]"
              />
            </Field>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Safety</CardTitle>
            <CardDescription>The switch that stops everything at once.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SwitchRow
              id="kill-switch"
              label="Kill switch"
              description="Pauses every scan, every draft and every publish. Nothing runs until you turn it back off."
              checked={state.kill_switch}
              onCheckedChange={(value) => update("kill_switch", value)}
            />

            {state.kill_switch ? (
              <div className="rounded-md border border-danger/40 bg-danger-subtle px-3 py-2.5">
                <p className="text-[12px] font-medium text-danger">Automation is paused</p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  The kill switch is on, so no cycle runs and nothing is published. Connected accounts
                  stay connected and no data is deleted. Turn it off to resume the schedule.
                </p>
              </div>
            ) : (
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                The kill switch is off, so the daily cycle runs on its schedule. Switch it on at any
                time to pause everything immediately.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={save} disabled={saving || !dirty}>
          <FloppyDiskIcon size={13} />
          {saving ? "Saving…" : "Save settings"}
        </Button>
        <Button variant="secondary" onClick={() => setState(baseline)} disabled={saving || !dirty}>
          Discard changes
        </Button>
        {!dirty ? (
          <span className="text-[12px] text-muted-foreground">No unsaved changes.</span>
        ) : null}
      </div>

      {promptVersions ? (
        <Card>
          <CardHeader>
            <CardTitle>Prompt versions in use</CardTitle>
            <CardDescription>
              Taken from the most recent draft, so you can see which prompt produced it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {Object.entries(promptVersions).map(([key, version]) => (
                <div key={key} className="flex items-center justify-between py-2">
                  <span className="font-mono text-[12px] text-muted-foreground">{key}</span>
                  <Badge tone="outline" className="font-mono">
                    v{version}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Questions</CardTitle>
          <CardDescription>The things people usually want to know before turning anything on.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Faq question="What does the app read?">
            It reads commits, pull requests and repository metadata from the GitHub accounts you
            connect, and the names and edit history of the Drive files you grant access to. It does
            not read your email, your calendar or anything outside those two services.
          </Faq>
          <Faq question="What does auto-approve do?">
            When it is on, the system publishes drafts it classified as minor updates without asking
            you first. Nothing you did not write reaches your feed, but nothing is checked by you
            either. It is off by default.
          </Faq>
          <Faq question="What does the kill switch do?">
            It pauses the whole system. No scan runs, no draft is written and no post is published
            until you switch it off. Your connections and your data stay exactly as they are.
          </Faq>
          <Faq question="How are the tokens stored?">
            Every access token is encrypted before it is written to the database, using a key that
            lives in the environment and never in the database. The tokens are never sent to the
            browser, and every call to a provider is made from the server.
          </Faq>
          <Faq question="How do I connect more than one GitHub account?">
            Press Connect GitHub once per account and approve each one in the GitHub window. Each
            account becomes its own connection, and the activity timeline tags every item with the
            account it came from.
          </Faq>
        </CardContent>
      </Card>
    </div>
  );
}

function Faq({ question, children }: { question: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-md border border-border bg-surface [&[open]_svg]:rotate-180">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[13px] font-medium text-foreground transition-colors hover:bg-surface-muted/50 [&::-webkit-details-marker]:hidden">
        {question}
        <CaretDownIcon size={13} className="shrink-0 text-muted-foreground transition-transform" />
      </summary>
      <div className="border-t border-border px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
        {children}
      </div>
    </details>
  );
}
