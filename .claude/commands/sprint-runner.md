---
name: 'sprint-runner'
description: 'Autonomous sprint execution: picks next backlog story, creates story file, implements it, reviews code, commits and pushes. Runs continuously processing stories one by one.'
---

# Sprint Runner — Autonomous Sprint Execution

You are the Sprint Runner orchestrator. Your job is to autonomously execute the full development cycle for stories in the sprint plan.

## Execution Mode

Determine the mode from the user argument: $ARGUMENTS

- **(no argument)** or **"next"** — Process the next single backlog story, then stop.
- **"epic"** — Process ALL remaining backlog stories in the current in-progress epic, sequentially.
- **"sprint"** — Process all stories in the current sprint, parallelizing independent epics using worktree-isolated subagents.
- **"all"** — Process all remaining stories across all epics.

## Core Loop

For each story to process, execute these steps **in order**:

### Step 1: Read Sprint Status

Read the full file `_bmad-output/implementation-artifacts/sprint-status.yaml`.

Identify the next story to work on:
- Find the first story with status `backlog` (scanning top to bottom).
- If the story's epic is `backlog`, it will transition to `in-progress` during create-story.
- If no backlog stories remain, report "All stories are complete!" and stop.

Record the **story key** (e.g., `1-2-landing-page-hero-section`) and its **epic number**.

### Step 2: Create Story File

Spawn a `general-purpose` subagent to create the story file:

```
Invoke the Skill tool with skill: "bmad-bmm-create-story"

The workflow will ask which story to create. The answer is: story {story-key} from epic {epic-number}.

IMPORTANT:
- Run in YOLO mode — select [y] at every template-output checkpoint.
- When the workflow asks which story, provide the story identifier.
- After completion, the story file should exist in _bmad-output/implementation-artifacts/
- The sprint-status.yaml should show the story as "ready-for-dev" and the epic as "in-progress"
```

After the subagent completes, verify:
- The story file exists in `_bmad-output/implementation-artifacts/`
- The status in `sprint-status.yaml` updated to `ready-for-dev`

If the status wasn't updated by the workflow, update it yourself:
- Set the story to `ready-for-dev`
- Set the epic to `in-progress` (if it was `backlog`)

### Step 3: Implement Story (Dev)

Spawn a `general-purpose` subagent to implement the story:

```
Invoke the Skill tool with skill: "bmad-bmm-dev-story"

The workflow will ask which story to implement. The story file is:
_bmad-output/implementation-artifacts/{story-key}.md

IMPORTANT:
- Run in YOLO mode — select [y] at every template-output checkpoint.
- Follow TDD: write tests first, then implement, then refactor.
- After completion, all acceptance criteria in the story file should be met.
```

After the subagent completes, update `sprint-status.yaml`:
- Set the story status to `review`

### Step 4: Code Review

Spawn a `general-purpose` subagent to perform adversarial code review:

```
Invoke the Skill tool with skill: "bmad-bmm-code-review"

Review the implementation for story: {story-key}
The story file is: _bmad-output/implementation-artifacts/{story-key}.md

IMPORTANT:
- Run in YOLO mode — select [y] at every template-output checkpoint.
- Fix any issues found during the review directly.
- After completion, the code should be production-ready.
```

After the subagent completes, update `sprint-status.yaml`:
- Set the story status to `done`
- If ALL stories in the epic are now `done`, set the epic status to `done`

### Step 5: Commit and Push

1. Stage all changes related to this story:
   ```
   git add -A
   ```
2. Create a descriptive commit:
   ```
   git commit -m "feat(epic-{N}): implement story {story-key}

   - [summary of what was built]
   - All acceptance criteria met
   - Code review passed

   Story: {story-key}
   Epic: {epic-number}"
   ```
3. Push to remote:
   ```
   git push
   ```

### Step 6: Loop or Stop

- **"next" mode:** Stop. Report completion summary.
- **"epic" mode:** Check if more backlog stories exist in this epic. If yes, go to Step 1. If no, stop.
- **"sprint" mode:** Check if more stories exist in the current sprint's epics. If yes, go to Step 1. If no, stop.
- **"all" mode:** Check if any backlog stories remain anywhere. If yes, go to Step 1. If no, stop.

## Parallel Execution (Sprint Mode)

When running in **sprint** or **all** mode, check for parallelization opportunities:

1. Read the sprint plan to identify which epics can run in parallel.
2. For independent epics (no cross-dependencies), spawn subagents with `isolation: "worktree"`:
   - Each worktree-isolated subagent processes its own epic's stories sequentially.
   - After a worktree subagent completes a story, its changes are on a separate branch.
3. After all parallel stories complete, merge worktree branches back to main.

**Dependency rules:**
- Stories within an epic are sequential (story N+1 depends on story N).
- Epics listed in the same sprint phase can run in parallel unless noted otherwise.
- Always check `sprint-status.yaml` before spawning parallel work.

## Error Handling

- If **create-story** fails: Log the error, skip this story, move to next.
- If **dev-story** fails: Log the error, set story status to `backlog` (reset), move to next.
- If **code-review** fails: Log the error, still commit what exists, set status to `review` (needs manual review).
- If **git push** fails: Log the error, do NOT reset the commit. Report to user.
- At the end of the run, report ALL errors encountered.

## Status Updates

Always update `sprint-status.yaml` after each transition. The valid transitions are:

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
- [story-key]: done ✓
- [story-key]: FAILED at [stage] — [error]

### Epic Status
- epic-{N}: [status]

### Commits
- [commit-hash]: [message]

### Errors
- [any errors encountered]
```
