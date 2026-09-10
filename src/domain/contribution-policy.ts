// Explicit, reviewed exclusions only. An absent entry does not imply that a
// repository accepts PRs; contributors must still read its contribution policy.
const recentIssueExclusions: Readonly<
  Record<string, { reason: string; source: string }>
> = {
  "openai/codex": {
    reason: "external_pull_requests_not_accepted",
    source: "https://github.com/openai/codex/blob/main/docs/contributing.md",
  },
};

export function allowsRecentIssueDiscovery(repository: string): boolean {
  return !Object.hasOwn(recentIssueExclusions, repository.toLowerCase());
}
