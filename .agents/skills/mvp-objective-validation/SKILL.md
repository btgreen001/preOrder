---
name: mvp-objective-validation
description: 'Validate whether preOrder MVP objectives are met. Use for release-readiness checks, objective gate reviews, regression pass/fail decisions, and producing a GO/NO-GO report with blocker severity and evidence links.'
argument-hint: 'MVP objective set to validate (for example: storefront + onboarding + invites)'
user-invocable: true
disable-model-invocation: false
---

# MVP Objective Validation (preOrder)

## What This Skill Produces
A structured MVP validation result for the preOrder application with:
- Objective-by-objective status: PASS, PARTIAL, FAIL, or NOT TESTED
- Build/test evidence and regression outcomes
- Blockers sorted by severity (Critical, High, Medium)
- Outstanding items list for any unmet objective (PARTIAL/FAIL/NOT TESTED)
- Final release recommendation: GO, GO WITH RISKS, or NO-GO
- Required updates to project tracking notes

## When To Use
Use this skill when you need to answer:
- Are current MVP goals complete enough to ship?
- Which objective failed and why?
- What exact evidence supports release readiness?

Typical triggers:
- "validate MVP"
- "release readiness check"
- "do we meet MVP objectives"
- "stack-rank blockers before deploy"

## Inputs
- Objective scope from user prompt (required): exact MVP slice to validate
- Source-of-truth docs (default):
  - `MASTER_TODO_LIST.md`
  - `NOTES_DEFECTS_USER_TODO`
  - `REGRESSION_TEST_PLAN.md`
- Current code state in:
  - `api/`
  - `web/`

## Validation Procedure
1. Confirm objective scope and acceptance criteria.
2. Read objective docs and extract measurable checks.
3. Map each objective to one or more verification actions.
4. Run narrow compile/build checks for touched areas.
5. Run targeted tests for the objective slice.
6. Validate critical user flows manually when automation is missing.
7. Record evidence for each objective (command/test/result).
8. Classify gaps by severity and business impact.
9. Produce outstanding items for every unmet objective with owner/action, dependency, and closure criteria.
10. Produce final GO/NO-GO verdict with next actions.
11. Update tracking docs with timestamped validation summary.

## Decision Logic
- PASS:
  - Acceptance criteria met.
  - No Critical defects.
  - Required build/tests pass.
- PARTIAL:
  - Core criteria met but non-critical gaps remain.
  - Release possible only with explicit risk acknowledgment.
- FAIL:
  - Any Critical objective unmet.
  - Blocking regressions or broken core flow.
  - Build/test failures in MVP-critical paths.
- NOT TESTED:
  - Missing data, unavailable environment, or unresolved dependency.

Final recommendation:
- GO: all MVP-critical objectives are PASS.
- GO WITH RISKS: no Critical failures, but one or more PARTIAL objectives.
- NO-GO: any FAIL on MVP-critical objective.

## Minimum Quality Gates
- Backend compiles for modified slice.
- Frontend compiles for modified slice.
- Objective-relevant automated tests run and pass, or clear gap is documented.
- Critical manual paths executed when no automated tests exist.
- All unresolved issues listed with severity and owner/action.

## preOrder MVP Focus Areas
Use these as default objective groups unless overridden by the user:
1. Public preorder flow:
- event/menu/slot visibility
- order placement success/failure handling
- pickup window and capacity guards

2. Admin operations:
- event/menu/slot create-edit lifecycle
- preorder status transitions
- CSV export behavior

3. Onboarding and access:
- company registration and landing route
- invite create/resend/use lifecycle
- role-based route guards and sign-in paths

4. Storefront shell separation:
- public route excludes admin shell/navigation controls
- admin route retains management controls

## Evidence Format
Use this table structure in the final output:

| Objective | Criteria | Evidence | Status | Risks/Notes |
|---|---|---|---|---|
| Public preorder flow | Pickup capacity guard works | test name + result | PASS | n/a |

Then add:
- Blockers (ordered Critical to Medium)
- Outstanding Items (required when any objective is PARTIAL/FAIL/NOT TESTED)
- Decision (GO / GO WITH RISKS / NO-GO)
- Required follow-up actions

Outstanding Items must include:
- Objective
- Gap description
- Severity
- Action to close
- Owner (or "Unassigned")
- Dependency (if any)
- Exit criteria

Use this copy-ready table template:

| Objective | Gap Description | Severity | Action To Close | Owner | Dependency | Exit Criteria |
|---|---|---|---|---|---|---|
| Example: Onboarding and access | Invite resend throttling not enforced in API | High | Add resend rate-limit guard and regression test | Unassigned | API merge + deploy | 4th resend within 1 hour is blocked in test and manual check |
|  |  |  |  |  |  |  |

## Completion Checklist
- Objective scope confirmed.
- Acceptance criteria explicitly listed.
- Build and tests executed for relevant slices.
- Manual validation done where needed.
- Blockers severity-ranked.
- Outstanding items documented for every unmet objective.
- Verdict issued.
- `MASTER_TODO_LIST.md` and `NOTES_DEFECTS_USER_TODO` updated with summary.

## Guardrails
- Keep validation targeted to requested objective scope.
- Do not claim PASS without direct evidence.
- If evidence is unavailable, mark NOT TESTED (never assume).
- If objective is not PASS, always include at least one concrete outstanding item.
- Ask clarifying questions if scope or acceptance criteria are ambiguous.
