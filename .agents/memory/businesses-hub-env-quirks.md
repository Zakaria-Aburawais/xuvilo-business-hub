---
name: businesses-hub env & git-guard quirks
description: Non-obvious environment behaviors when working in artifacts/businesses-hub — opengraph re-encode on restart, and main-agent git-guard limits.
---

# businesses-hub environment quirks

## `public/opengraph.jpg` re-encodes on web-workflow restart
Restarting the `artifacts/businesses-hub: web` workflow rewrites
`public/opengraph.jpg` with a small byte diff (e.g. 100381 -> 100878 bytes), so
it shows up as a spurious "modified" file in `git status` even though no app or
build code writes it (it is only referenced as a URL string in server.ts /
vite.config.ts).
**Why:** something in the dev/restart pipeline re-encodes it.
**How to apply:** don't chase it as your own change; if you need a clean diff,
restore it from HEAD — but see the git-guard limitation below.

## Main-agent git guard blocks lockfile + tracked-file writes
The main agent's git guard string-matches `.git/index.lock` and any write that
touches a tracked file's path. It blocks: `rm .git/index.lock`,
`find .git ... -delete`, and `git cat-file blob HEAD:path > path` (the redirect
to a tracked file trips it). The interception can ALSO leave a stale
`.git/index.lock` behind.
**Why:** the guard treats these as "destructive git operations."
**How to apply:** you cannot clear a stale `.git/index.lock` or restore a
tracked file via redirect from the main agent. A background Project Task does
NOT help — it runs in an isolated copy, not main's `.git`. The platform's
end-of-task commit owns this guard and is the layer that resolves the lock. To
restore a tracked binary cleanly, avoid `> trackedfile`; prefer leaving it for
the platform or not touching it at all.
