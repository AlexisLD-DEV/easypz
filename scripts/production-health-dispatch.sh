#!/usr/bin/env bash
set -u

REPO="${REPO:-AlexisLD-DEV/quiz-english}"
REF="${REF:-master}"
WORKFLOW="${WORKFLOW:-Production Health}"
TAIL_SECONDS="${TAIL_SECONDS:-90}"
LOCK_FILE="${LOCK_FILE:-/tmp/quiz-english-production-health-dispatch.lock}"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] production health dispatch already running"
  exit 0
fi

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] dispatch $WORKFLOW on $REPO@$REF tail_seconds=$TAIL_SECONDS"
timeout --kill-after=5s 60s gh workflow run "$WORKFLOW" --repo "$REPO" --ref "$REF" -f "tail_seconds=$TAIL_SECONDS"
