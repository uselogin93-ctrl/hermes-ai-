import { Octokit } from "@octokit/rest";
import type { Connector, ConnectorContext, RawActivity } from "@/lib/connectors/types";

/**
 * Resolves which of the touched repositories are private.
 *
 * Visibility is only available through an extra call per repository, so the
 * lookup happens once per repository per scan.
 */
async function filterPrivateRepos(
  octokit: Octokit,
  activities: RawActivity[],
): Promise<Set<string>> {
  const repos = [...new Set(activities.map((a) => String(a.detail.repo ?? "")).filter(Boolean))];
  const privateRepos = new Set<string>();

  await Promise.all(
    repos.map(async (repo) => {
      const [owner, name] = repo.split("/");
      if (!owner || !name) return;
      try {
        const { data } = await octokit.rest.repos.get({ owner, repo: name });
        if (data.private) privateRepos.add(repo);
      } catch {
        // If visibility cannot be resolved the event is kept: the token scope
        // may simply be too narrow, and dropping real work would be worse.
      }
    }),
  );

  return privateRepos;
}

/**
 * GitHub connector (read-only).
 *
 * Uses the authenticated user's event feed: it already merges pushes, new
 * repositories and pull requests for every repository the account can see,
 * which keeps the scan to a handful of API calls per account.
 */
export const githubConnector: Connector = {
  provider: "github",

  async fetchActivity(ctx: ConnectorContext, since: Date): Promise<RawActivity[]> {
    const octokit = new Octokit({ auth: ctx.accessToken });

    const { data: profile } = await octokit.rest.users.getAuthenticated();
    const events = await octokit.rest.activity.listEventsForAuthenticatedUser({
      username: profile.login,
      per_page: 100,
    });

    const sinceMs = since.getTime();
    const activities: RawActivity[] = [];

    for (const event of events.data) {
      if (!event.created_at) continue;
      const occurredAt = new Date(event.created_at);
      if (occurredAt.getTime() < sinceMs) continue;

      const repoName = event.repo?.name ?? "unknown/repo";
      const repoUrl = `https://github.com/${repoName}`;

      if (event.type === "PushEvent") {
        const payload = event.payload as {
          commits?: { sha: string; message: string; distinct_size: number }[];
          size?: number;
          ref?: string;
        };
        const commits = payload.commits ?? [];
        const branch = (payload.ref ?? "").replace("refs/heads/", "");

        if (commits.length === 0) {
          activities.push({
            externalId: `push:${event.id}`,
            eventType: "commit",
            title: `Pushed ${payload.size ?? 0} change(s) to ${repoName}`,
            detail: { repo: repoName, branch, commits: payload.size ?? 0, files: [] },
            url: repoUrl,
            occurredAt,
          });
          continue;
        }

        for (const commit of commits) {
          const message = commit.message.split("\n")[0] ?? "";
          activities.push({
            externalId: `commit:${commit.sha}`,
            eventType: "commit",
            title: `${repoName}: ${message}`,
            detail: {
              repo: repoName,
              branch,
              sha: commit.sha,
              message,
              filesChanged: commit.distinct_size,
            },
            url: `${repoUrl}/commit/${commit.sha}`,
            occurredAt,
          });
        }
        continue;
      }

      if (event.type === "CreateEvent") {
        const payload = event.payload as {
          ref?: string;
          ref_type?: string;
          master_branch?: string;
        };
        if (payload.ref_type !== "repository") continue;
        activities.push({
          externalId: `repo:${event.id}`,
          eventType: "new_repo",
          title: `Created repository ${repoName}`,
          detail: { repo: repoName, defaultBranch: payload.master_branch ?? "main" },
          url: repoUrl,
          occurredAt,
        });
        continue;
      }

      if (event.type === "PullRequestEvent") {
        const payload = event.payload as {
          action?: string;
          number?: number;
          pull_request?: {
            title?: string;
            html_url?: string;
            merged?: boolean;
            additions?: number;
            deletions?: number;
            changed_files?: number;
            body?: string | null;
          };
        };
        const pr = payload.pull_request ?? {};
        activities.push({
          externalId: `pr:${event.id}`,
          eventType: "pr",
          title: `Pull request #${payload.number ?? 0} on ${repoName}: ${pr.title ?? "Untitled"}`,
          detail: {
            repo: repoName,
            number: payload.number ?? 0,
            action: payload.action ?? "opened",
            merged: Boolean(pr.merged),
            additions: pr.additions ?? 0,
            deletions: pr.deletions ?? 0,
            changedFiles: pr.changed_files ?? 0,
            body: pr.body ?? null,
          },
          url: pr.html_url ?? repoUrl,
          occurredAt,
        });
      }
    }

    // Private repositories are never analyzed (docs/01-architecture.md §4).
    const privateRepos = await filterPrivateRepos(octokit, activities);

    return activities.filter((activity) => {
      const repo = String(activity.detail.repo ?? "");
      return repo !== "" && !privateRepos.has(repo);
    });
  },

  async healthCheck(ctx: ConnectorContext) {
    try {
      const octokit = new Octokit({ auth: ctx.accessToken });
      const { data } = await octokit.rest.users.getAuthenticated();
      return { ok: true, detail: data.login };
    } catch (error) {
      return { ok: false, detail: error instanceof Error ? error.message : "Token rejected" };
    }
  },
};
