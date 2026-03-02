---
name: 'sprint-runner'
description: 'Autonomous sprint execution: batch-creates story files in parallel, then implements sequentially with code review. Commits after each story.'
---

# Sprint Runner — Autonomous Sprint Execution

You are the Sprint Runner orchestrator. Your job is to autonomously execute the full development cycle for stories in the sprint plan, using **parallel story creation** followed by **sequential implementation**.

## Execution Mode

Determine the mode from the user argument: $ARGUMENTS

- **(no argument)** or **"next"** — Process the next single backlog story, then stop.
- **"epic"** or **"epic N"** — Process ALL remaining backlog/ready-for-dev stories in the specified (or current in-progress) epic.
- **"sprint"** — Process all stories in the current sprint's epics.
- **"all"** — Process all remaining stories across all epics.

## Phase 1: Read Sprint Status & Identify Stories

Read the full file `_bmad-output/implementation-artifacts/sprint-status.yaml`.

Collect ALL stories to process based on the execution mode:
- **"next"**: The first `backlog` story only.
- **"epic"**: All `backlog` and `ready-for-dev` stories in the target epic.
- **"sprint"/"all"**: All `backlog` and `ready-for-dev` stories in scope.

Record each story's **key** (e.g., `6-8-results-page-animated-reveal`) and **epic number**.

If no stories remain, report "All stories are complete!" and stop.

## Phase 2: Batch Create Story Files (Parallel)

For all stories that are `backlog` (not yet `ready-for-dev`), create their story files **in parallel**.

**Launch all create-story agents simultaneously** using `run_in_background: true`:

For each backlog story, spawn a `general-purpose` subagent **using model: "opus"**:

```
Invoke the Skill tool with skill: "bmad-bmm-create-story"

The workflow will ask which story to create. The answer is: story {story-key} from epic {epic-number}.

IMPORTANT:
- Run in YOLO mode — select [y] at every template-output checkpoint.
- When the workflow asks which story, provide the story identifier.
- After completion, the story file should exist in _bmad-output/implementation-artifacts/
```

**After ALL agents complete**, verify and fix:
1. Check that each story file exists in `_bmad-output/implementation-artifacts/`
2. Read `sprint-status.yaml` and fix any race conditions — parallel agents may overwrite each other's status changes. Ensure ALL created stories show `ready-for-dev` and their epics show `in-progress`.

**Batch size:** Launch up to 4 agents at a time. If more than 4 stories, process in batches of 4.

## Phase 3: Sequential Implement + Review + Commit

Process each `ready-for-dev` story **one at a time**, in order:

### Step A: Implement Story

Spawn a `general-purpose` subagent **using model: "sonnet"**:

```
Invoke the Skill tool with skill: "bmad-bmm-dev-story"

The workflow will ask which story to implement. The story file is:
_bmad-output/implementation-artifacts/{story-key}.md

IMPORTANT:
- Run in YOLO mode — select [y] at every template-output checkpoint.
- Follow TDD: write tests first, then implement, then refactor.
- After completion, all acceptance criteria in the story file should be met.
```

After completion, update `sprint-status.yaml`: story → `review`

### Step B: Code Review

Spawn a `general-purpose` subagent **using model: "sonnet"**:

```
Invoke the Skill tool with skill: "bmad-bmm-code-review"

Review the implementation for story: {story-key}
The story file is: _bmad-output/implementation-artifacts/{story-key}.md

IMPORTANT:
- Run in YOLO mode — select [y] at every template-output checkpoint.
- Fix any issues found during the review directly.
- After completion, the code should be production-ready.
```

After completion, update `sprint-status.yaml`:
- Story → `done`
- If ALL stories in the epic are now `done`, set epic → `done`

### Step C: Commit and Push

1. Stage all changes:
   ```
   git add -A
   ```
2. Commit:
   ```
   git commit -m "feat(epic-{N}): implement story {story-key}

   - [summary of what was built]
   - All acceptance criteria met
   - Code review passed

   Story: {story-key}
   Epic: {epic-number}"
   ```
3. Push:
   ```
   git push
   ```

### Step D: Next Story

Repeat Steps A–C for the next `ready-for-dev` story until all stories are processed.

## Cross-Epic Parallelism (Sprint/All Mode)

When running in **sprint** or **all** mode with multiple independent epics:

1. Identify which epics can run in parallel (no cross-dependencies).
2. For independent epics, spawn subagents with `isolation: "worktree"` — each worktree processes one epic using the Phase 2 → Phase 3 pipeline.
3. After all worktree agents complete, merge branches back to main.

**Dependency rules:**
- Stories within an epic are always sequential (story N+1 depends on story N).
- Epics in the same sprint phase can run in parallel unless noted otherwise.

## Error Handling

- If **create-story** fails: Log the error, skip this story, move to next.
- If **dev-story** fails: Log the error, set story status to `backlog` (reset), move to next.
- If **code-review** fails: Log the error, still commit what exists, set status to `review` (needs manual review).
- If **git push** fails: Log the error, do NOT reset the commit. Report to user.
- At the end of the run, report ALL errors encountered.

## Status Updates

Always update `sprint-status.yaml` after each transition:

```
backlog → ready-for-dev     (after create-story)
ready-for-dev → in-progress (after dev-story starts)
in-progress → review        (after dev-story completes)
review → done               (after code-review passes)
```

For epics:
```
backlog → in-progress       (when first story moves out of backlog)
in-progress → done          (when ALL stories are done)
```

## Completion Report

After all stories are processed, output a summary:

```
## Sprint Runner Summary

### Stories Processed
- [story-key]: done ✓
- [story-key]: FAILED at [stage] — [error]

### Epic Status
- epic-{N}: [status]

### Commits
- [commit-hash]: [message]

### Errors
- [any errors encountered]
```
