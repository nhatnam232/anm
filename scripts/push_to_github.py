"""
Push every file under the project root to GitHub via the REST API in a single
commit. Useful when `git` is not installed locally.

Usage:
    set GITHUB_TOKEN=ghp_xxx
    set GITHUB_REPO=owner/name
    python scripts/push_to_github.py [--branch main] [--message "Big update"]

Or pass via CLI:
    python scripts/push_to_github.py --token ghp_xxx --repo owner/name
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Files / dirs we never want to push.
IGNORE_DIRS = {
    "node_modules",
    "dist",
    "dist-ssr",
    ".git",
    ".vercel",
    ".vscode",
    ".idea",
    ".trae",
    ".claude",
    ".cache",
    ".turbo",
    "build",
}
IGNORE_EXTS = {
    ".log",
    ".tsbuildinfo",
}
IGNORE_FILES = {
    ".DS_Store",
    "Thumbs.db",
    "push.ps1",
    "find-and-replace.ps1",
}


def should_ignore(p: Path) -> bool:
    if p.name in IGNORE_FILES:
        return True
    if p.suffix.lower() in IGNORE_EXTS:
        return True
    for part in p.parts:
        if part in IGNORE_DIRS:
            return True
        if part.startswith(".env"):
            return True
    return False


def collect_files() -> list[Path]:
    files: list[Path] = []
    for p in ROOT.rglob("*"):
        if not p.is_file():
            continue
        rel = p.relative_to(ROOT)
        if should_ignore(rel):
            continue
        files.append(p)
    return files


# ─── GitHub REST helpers ────────────────────────────────────────────────────


def gh_request(
    method: str,
    url: str,
    token: str,
    body: dict | None = None,
) -> dict:
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "anime-wiki-pusher",
    }
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read()
            if not raw:
                return {}
            return json.loads(raw)
    except urllib.error.HTTPError as e:
        msg = e.read().decode("utf-8", errors="replace")
        raise SystemExit(f"GitHub API {method} {url} failed: {e.code}\n{msg}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--token", default=os.environ.get("GITHUB_TOKEN"))
    parser.add_argument("--repo", default=os.environ.get("GITHUB_REPO"))
    parser.add_argument("--branch", default=os.environ.get("GITHUB_BRANCH", "main"))
    parser.add_argument(
        "--message",
        default="feat: massive UX/SEO/security overhaul (themes, collections, compare, admin, edit-suggestions, optimistic mutations, prerender, hCaptcha-everywhere)",
    )
    args = parser.parse_args()

    if not args.token:
        print("ERROR: pass --token or set GITHUB_TOKEN env var")
        return 2
    if not args.repo or "/" not in args.repo:
        print("ERROR: pass --repo owner/name or set GITHUB_REPO env var")
        return 2

    repo = args.repo
    base = f"https://api.github.com/repos/{repo}"

    # 1. Resolve current branch ref
    print(f"[1/5] Resolving ref refs/heads/{args.branch}...")
    ref = gh_request("GET", f"{base}/git/refs/heads/{args.branch}", args.token)
    base_commit_sha = ref["object"]["sha"]
    base_commit = gh_request("GET", f"{base}/git/commits/{base_commit_sha}", args.token)
    base_tree_sha = base_commit["tree"]["sha"]
    print(f"  base commit  = {base_commit_sha[:7]}")
    print(f"  base tree    = {base_tree_sha[:7]}")

    # 2. For every local file, create a blob and collect tree entries.
    files = collect_files()
    print(f"[2/5] Uploading {len(files)} files as blobs...")
    tree_entries: list[dict] = []
    for i, fp in enumerate(files, start=1):
        rel = fp.relative_to(ROOT).as_posix()
        content_bytes = fp.read_bytes()
        blob = gh_request(
            "POST",
            f"{base}/git/blobs",
            args.token,
            {
                "content": base64.b64encode(content_bytes).decode("ascii"),
                "encoding": "base64",
            },
        )
        tree_entries.append(
            {
                "path": rel,
                "mode": "100644",
                "type": "blob",
                "sha": blob["sha"],
            }
        )
        if i % 25 == 0 or i == len(files):
            print(f"  {i}/{len(files)} blobs uploaded")

    # 3. Build a NEW tree based on base_tree, overlaying our entries.
    print("[3/5] Creating tree...")
    tree = gh_request(
        "POST",
        f"{base}/git/trees",
        args.token,
        {"base_tree": base_tree_sha, "tree": tree_entries},
    )
    print(f"  new tree     = {tree['sha'][:7]}")

    # 4. Commit
    print("[4/5] Creating commit...")
    commit = gh_request(
        "POST",
        f"{base}/git/commits",
        args.token,
        {
            "message": args.message,
            "tree": tree["sha"],
            "parents": [base_commit_sha],
        },
    )
    print(f"  new commit   = {commit['sha'][:7]}")

    # 5. Move the branch ref forward.
    print(f"[5/5] Updating refs/heads/{args.branch}...")
    gh_request(
        "PATCH",
        f"{base}/git/refs/heads/{args.branch}",
        args.token,
        {"sha": commit["sha"], "force": False},
    )
    print("[OK] Done")
    print(f"  Commit URL: https://github.com/{repo}/commit/{commit['sha']}")
    return 0



if __name__ == "__main__":
    sys.exit(main())
