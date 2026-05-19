# Harrsh25 — GitHub Profile README

## Project Overview
This repository contains the GitHub profile README for [@Harrsh25](https://github.com/Harrsh25).  
The only deliverable file is `README.md` — it renders automatically on the GitHub profile page.

## Repository Structure
```
Harrsh25/
├── README.md          # GitHub profile page content (the main file)
└── .claude/
    └── settings.json  # Shared Claude Code permissions for all accounts
```

## Branch Strategy (Multi-Account Workflow)
To avoid conflicts when multiple Claude Code accounts work on this repo:

1. **Never commit directly to `main`** — always work on a feature branch.
2. **Branch naming**: `claude/<short-description>-<id>` (e.g. `claude/update-bio-abc12`).
3. **Pull before you start**: always run `git pull origin main` at the start of a session.
4. **One concern per branch**: keep each branch focused on a single change so merges stay clean.
5. **Merge via PR**: open a pull request into `main` and merge after review — don't force-push main.

## Common Commands
```bash
# Start a new session — sync first
git fetch origin
git pull origin main

# Create a working branch
git checkout -b claude/<description>-<short-id>

# Stage and commit
git add README.md
git commit -m "your message"

# Push
git push -u origin HEAD
```

## Editing Guidelines
- Edit only `README.md` unless explicitly adding new files.
- Keep markdown valid — no broken links or unclosed tags.
- Preserve the existing emoji + section structure unless redesigning intentionally.
- Test link URLs before committing.
