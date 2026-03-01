---
name: 'sprint-runner-single'
description: 'Run one complete story cycle: create story → implement → code review → commit & push. Processes the next backlog story or a specific story if provided.'
---

# Sprint Runner (Single Story)

You are the Sprint Runner orchestrator running a **single story** through the full development cycle.

## Target Story

Check if a specific story was requested: $ARGUMENTS

- If a story key is provided (e.g., `1-2-landing-page-hero-section`), use that story.
- If no argument or "next", find the first `backlog` story in `_bmad-output/implementation-artifacts/sprint-status.yaml`.

## Pre-Flight Check

1. Read `_bmad-output/implementation-artifacts/sprint-status.yaml` fully.
2. Identify the target story and its current status.
3. Determine which step to start from based on current status:
   - `backlog` → Start at Step 1 (Create Story)
   - `ready-for-dev` → Start at Step 2 (Dev Story) — story file already exists
   - `in-progress` → Start at Step 2 (Dev Story) — resume implementation
   - `review` → Start at Step 3 (Code Review) — dev is done, needs review
   - `done` → Skip. Report "Story already completed" and stop.
4. Record the **story key** and **epic number**.

## Step 1: Create Story File

Spawn a `general-purpose` subagent:

```
Invoke the Skill tool with skill: "bmad-bmm-create-story"

Create story: {story-key} from epic {epic-number}.

IMPORTANT:
- Run in YOLO mode — select [y] at every template-output checkpoint.
- When the workflow asks which story, provide the story identifier.
```

After completion, update `sprint-status.yaml`:
- Story → `ready-for-dev`
- Epic → `in-progress` (if it was `backlog`)

Verify the story file exists at `_bmad-output/implementation-artifacts/{story-key}.md`.

## Step 2: Implement Story

Spawn a `general-purpose` subagent:

```
Invoke the Skill tool with skill: "bmad-bmm-dev-story"

Implement story file: _bmad-output/implementation-artifacts/{story-key}.md

IMPORTANT:
- Run in YOLO mode — select [y] at every template-output checkpoint.
- Follow TDD: write tests first, then implement, then refactor.
```

After completion, update `sprint-status.yaml`:
- Story → `review`

## Step 3: Code Review

Spawn a `general-purpose` subagent:

```
Invoke the Skill tool with skill: "bmad-bmm-code-review"

Review implementation for story: {story-key}
Story file: _bmad-output/implementation-artifacts/{story-key}.md

IMPORTANT:
- Run in YOLO mode — select [y] at every template-output checkpoint.
- Fix any issues found directly.
```

After completion, update `sprint-status.yaml`:
- Story → `done`
- If ALL stories in the epic are `done`, set epic → `done`

## Step 4: Commit and Push

1. Stage all changes:
   ```
   git add -A
   ```

2. Commit with descriptive message:
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

## Completion Report

```
## Story Complete: {story-key}

### Pipeline
- Create Story: ✓
- Dev Story: ✓
- Code Review: ✓
- Commit: [hash]
- Push: ✓

### Files Changed
- [list of key files created/modified]

### Status
- Story: done
- Epic {N}: [current status]
- Next story: [next backlog story or "none remaining in epic"]
```

## Error Handling

- If any step fails, stop the pipeline and report the error clearly.
- Do NOT proceed to the next step if the current one failed.
- Include the error details and which step failed so the user can debug.
- Leave `sprint-status.yaml` reflecting the last successful state.
