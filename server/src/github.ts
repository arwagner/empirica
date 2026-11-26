/** The few GitHub calls filing needs, behind an interface so tests don't touch the network. */
export interface IssueTracker {
  openSuggestions(label: string): Promise<{ number: number; title: string; url: string }[]>
  create(issue: { title: string; body: string; labels: string[] }): Promise<{ number: number; url: string }>
  comment(issueNumber: number, body: string): Promise<{ url: string }>
}

/** GitHub's REST API with a fine-grained token (this repo only, Issues read/write). */
export function githubTracker(repo: string, token: string, fetchFn: typeof fetch = fetch): IssueTracker {
  const call = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const res = await fetchFn(`https://api.github.com/repos/${repo}${path}`, {
      ...init,
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'x-github-api-version': '2022-11-28',
        'user-agent': 'empirica-api',
        ...(init?.body ? { 'content-type': 'application/json' } : {}),
      },
    })
    if (!res.ok) throw new Error(`GitHub ${init?.method ?? 'GET'} ${path}: ${res.status}`)
    return (await res.json()) as T
  }
  return {
    async openSuggestions(label) {
      const issues = await call<{ number: number; title: string; html_url: string; pull_request?: unknown }[]>(
        `/issues?state=open&labels=${encodeURIComponent(label)}&per_page=100`,
      )
      return issues.filter((i) => !i.pull_request).map((i) => ({ number: i.number, title: i.title, url: i.html_url }))
    },
    async create(issue) {
      const r = await call<{ number: number; html_url: string }>('/issues', { method: 'POST', body: JSON.stringify(issue) })
      return { number: r.number, url: r.html_url }
    },
    async comment(n, body) {
      const r = await call<{ html_url: string }>(`/issues/${n}/comments`, { method: 'POST', body: JSON.stringify({ body }) })
      return { url: r.html_url }
    },
  }
}
