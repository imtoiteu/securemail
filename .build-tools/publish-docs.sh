#!/usr/bin/env bash
# Publishes build/doc to the gh-pages branch using a temporary git worktree.
# Run from the repo root after `npm run docs`.
set -euo pipefail

BRANCH=gh-pages
SRC=build/doc
WORKTREE=build/.gh-pages-publish
REMOTE=${REMOTE:-origin}
MSG=${1:-"Update client-API docs"}

if [ ! -d "$SRC" ] || [ -z "$(ls -A "$SRC" 2>/dev/null)" ]; then
  echo "$SRC is missing or empty — run \"npm run docs\" first." >&2
  exit 1
fi

cleanup() {
  if [ -d "$WORKTREE" ]; then
    git worktree remove --force "$WORKTREE" >/dev/null 2>&1 || rm -rf "$WORKTREE"
  fi
}
trap cleanup EXIT

git fetch "$REMOTE" "$BRANCH" 2>/dev/null || true

if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git worktree add "$WORKTREE" "$BRANCH"
elif git show-ref --verify --quiet "refs/remotes/$REMOTE/$BRANCH"; then
  git worktree add -B "$BRANCH" "$WORKTREE" "$REMOTE/$BRANCH"
else
  echo "Creating new orphan branch $BRANCH"
  git worktree add --detach "$WORKTREE" HEAD
  ( cd "$WORKTREE" && git checkout --orphan "$BRANCH" && git rm -rf . >/dev/null 2>&1 || true )
fi

find "$WORKTREE" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R "$SRC"/. "$WORKTREE"/

git -C "$WORKTREE" add -A
if git -C "$WORKTREE" diff --cached --quiet; then
  echo "No changes to publish."
  exit 0
fi
git -C "$WORKTREE" commit -m "$MSG"
git -C "$WORKTREE" push "$REMOTE" "$BRANCH"
echo "Published to $REMOTE/$BRANCH."
