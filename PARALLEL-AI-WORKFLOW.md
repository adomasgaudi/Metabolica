# Parallel AI Workflow — Git Worktrees

How to have **two (or more) AI assistants work on this repo at the same time**
without them stepping on each other.

---

## The problem

Git tracks the current branch **per working directory**, not per user or per
process. There is exactly **one `HEAD` per folder**. So if two AIs share the
same folder:

- AI-A runs `git switch -c feature-x`
- The files on disk swap to that branch
- AI-B, working in the same folder, is now silently on `feature-x` too — and
  its uncommitted work can get mixed in, clobbered, or lost.

Switching branches in a shared folder **moves everyone**, not just you.

---

## The solution: one worktree per AI

A **worktree** is a second folder linked to the *same* repository, with its own
independent `HEAD`. Each AI gets its own folder + its own branch. They share the
same history and object store, so commits made in one are instantly available to
the other — but the working files are fully isolated.

```
C:/.../weight-loss          [main]         ← AI-A (or you) works here
C:/.../metabolica-claude    [claude/work]  ← AI-B (Claude) works here
```

---

## Setup (once, per extra AI)

From the **main repo folder**:

```bash
# Branch from the last COMMITTED state (not anyone's uncommitted work)
git worktree add -b claude/work "../metabolica-claude" main

git worktree list   # verify both appear
```

- `-b claude/work` creates a new branch for the isolated AI.
- `../metabolica-claude` is the new folder it lives in (a sibling of the repo).
- `main` is the starting point — branch from a clean committed baseline so you
  don't inherit the other AI's half-finished work.

Then point the isolated AI at its folder: it makes **all** its edits in
`../metabolica-claude` and never touches the main folder.

---

## Daily use

| Who | Folder | Branch | Rule |
|-----|--------|--------|------|
| AI-A | `weight-loss` | `main` (or its own branch) | edits only here |
| AI-B | `metabolica-claude` | `claude/work` | edits only here |

- Each AI commits to **its own branch** using the project's version convention
  (`v<version> <2-5 word summary>`).
- Rename the placeholder branch to match the feature once it's known, e.g.
  `git branch -m claude/work claude/diet-export`.
- **Coordination tip:** if possible, give each AI different files/areas.
  Conflicts only arise when both edit the **same lines of the same file**.

---

## Combining the work

Once both branches have committed work, from the **main folder**:

```bash
git switch main
git merge claude/work     # or: git rebase claude/work for a linear history
```

Git fuses the two histories. Resolve conflicts only where the same lines were
touched. Because everything is committed in small versioned units, anything can
be reverted cleanly.

---

## Teardown

When the isolated AI is done and merged:

```bash
git worktree remove ../metabolica-claude
```

⚠️ **Don't** delete the folder by hand — that leaves a dangling worktree
reference. Always use `git worktree remove` (add `--force` if it complains about
uncommitted junk you don't want).

---

## When to use this

✅ **Use a worktree when:**
- Two or more AIs / people are editing the **same repo** at the same time.
- You want one AI to experiment on a risky/large change while another keeps the
  main line stable.
- You want isolated, parallel feature branches without re-cloning.

❌ **Don't bother when:**
- Only **one** AI is working at a time — just use a normal branch.
- The two tasks are in **completely separate repos** already.
- It's a tiny one-line change you'll commit immediately.

---

## Quick reference

```bash
git worktree add -b <branch> "../<folder>" main   # create isolated workspace
git worktree list                                  # see all worktrees
git merge <branch>                                 # bring work back into main
git worktree remove "../<folder>"                  # clean up when done
```

> Rule of thumb: **one HEAD per folder.** If two minds need to move
> independently, give each its own folder.
