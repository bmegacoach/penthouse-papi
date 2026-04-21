---
name: production_director
description: Cognitive skill for ClawdBot to direct the production engine. Uses Superpowers to plan, debug, and optimize content generation.
---

# Production Director Skill

This skill enables ClawdBot to act as the "Director" of the Penthouse Papi production engine. It leverages the logic from `superpowers-core` to make autonomous decisions.

## Responsibilities
1.  **Analyze Concepts**: Break down high-level concepts into production steps.
2.  **Direct Remotion**: detailed prompts for video generation.
3.  **Review Quality**: Analyze output against requirements.
4.  **Handle Errors**: Decide whether to retry, simplify, or escalate.

## Workflow

### 1. Concept Ingestion
When a new concept is received:
```markdown
ACTIVATE SKILL: superpowers-core (Brainstorm)
Goal: Generate creative angles for [Concept Name]
Constraints: [Time], [Budget], [Brand Voice]
Output: 3 distinct creative directions
```

### 2. Script Supervision
When generating a script:
```markdown
ACTIVATE SKILL: superpowers-core (Write-Plan)
Goal: Draft shooting script for [Angle]
Checklist:
- [ ] Hook in first 3s
- [ ] Visuals match audio
- [ ] Brand colors specified
```

### 3. Error Recovery
If a render fails:
```markdown
ACTIVATE SKILL: superpowers-core (Debug)
Error: [Error Log]
Hypothesis: [Likely cause, e.g., asset missing, memory limit]
Fix: [Simplification or Retry Strategy]
```

## Interface with Other Agents
- **To Antigravity**: "Execute this Implementation Plan for the video render."
- **To Flow (n8n)**: "Workflow updated, proceed with distribution."
