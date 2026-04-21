---
name: superpowers-core
description: Core development superpowers for TDD, debugging, code review, and structured planning. Ported from obra/superpowers Claude Code plugin. Auto-activates for all coding tasks.
---

# Superpowers Core

The foundational skill set for effective agentic development. These patterns ensure quality output on first iteration.

## Core Principle

**If a skill applies to a task, it MUST be used.** Do not skip to implementation.

## Brainstorm Skill

### When to Activate
- Starting any new feature
- Facing a complex problem
- User explicitly asks to explore options

### Pattern
```
BRAINSTORM PHASE
================
Before writing any code, I will explore multiple approaches:

1. **Option A: [Approach Name]**
   - Pros: [list]
   - Cons: [list]
   - Complexity: [LOW/MEDIUM/HIGH]
   - Risk: [LOW/MEDIUM/HIGH]

2. **Option B: [Approach Name]**
   - Pros: [list]
   - Cons: [list]
   - Complexity: [LOW/MEDIUM/HIGH]
   - Risk: [LOW/MEDIUM/HIGH]

3. **Option C: [Approach Name]**
   - Pros: [list]
   - Cons: [list]
   - Complexity: [LOW/MEDIUM/HIGH]
   - Risk: [LOW/MEDIUM/HIGH]

**Recommended Approach:** [Option X] because [reasoning]

Proceed with implementation? (Y/N or provide guidance)
```

## Write-Plan Skill

### When to Activate
- After brainstorming
- Complex multi-file changes
- User asks for a plan

### Pattern
```
IMPLEMENTATION PLAN
==================
## Goal
[One sentence objective]

## Files to Modify
1. [file1.ts] - [what changes]
2. [file2.ts] - [what changes]

## Files to Create
1. [newfile.ts] - [purpose]

## Implementation Steps
1. [ ] Step 1 - [description]
2. [ ] Step 2 - [description]
3. [ ] Step 3 - [description]

## Verification
- [ ] TypeScript compiles
- [ ] Tests pass
- [ ] Manual verification of [specific thing]

## Rollback Plan
If issues occur: [how to revert]
```

## Execute-Plan Skill

### When to Activate
- User approves plan
- User says "proceed" or "execute"

### Pattern
```
EXECUTING PLAN
=============
Current Step: [X of Y]

[Performing step description...]

CHECKPOINT: Step X complete.
- Result: [what was done]
- Files changed: [list]
- Next: [Step X+1 description]

Continue? (Auto-proceeding unless blocked)
```

## Debug Skill

### When to Activate
- Error occurs
- Tests fail
- User reports bug

### Pattern
```
DEBUG PROTOCOL
=============
## Error Analysis
- Error Type: [exact error]
- Location: [file:line]
- Stack Trace: [relevant portion]

## Hypothesis
Most likely cause: [theory]

## Investigation Steps
1. [ ] Check [thing 1]
2. [ ] Verify [thing 2]
3. [ ] Test [assumption]

## Fix Applied
[description of fix]

## Verification
- [ ] Error no longer occurs
- [ ] No regression introduced
- [ ] Related tests pass
```

## Code Review Skill

### When to Activate
- Before committing
- After major changes
- User asks for review

### Pattern
```
CODE REVIEW
==========
## Changes Summary
[High-level description]

## Quality Checklist
- [ ] No hardcoded values
- [ ] Error handling present
- [ ] Null safety checked
- [ ] No security issues
- [ ] Follows existing patterns
- [ ] Documentation updated

## Issues Found
1. [Issue] - Severity: [HIGH/MEDIUM/LOW]
2. [Issue] - Severity: [HIGH/MEDIUM/LOW]

## Recommendations
- [Improvement 1]
- [Improvement 2]

## Verdict: [APPROVE / REQUEST_CHANGES / NEEDS_DISCUSSION]
```

## TDD Skill

### When to Activate
- Creating new function/component
- Fixing a bug (regression test)

### Pattern
```
TDD CYCLE
========
## Test First
Writing test for: [functionality]

```typescript
describe('[feature]', () => {
  it('should [expected behavior]', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

## RED: Test fails (expected)
Running test... FAIL ✗

## GREEN: Implement minimum to pass
[Implementation]

Running test... PASS ✓

## REFACTOR: Clean up
[Any refactoring]

Running test... PASS ✓
```
