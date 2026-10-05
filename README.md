# BLACK MILE

3D open-world narrative crime drama set in the city of Veyra.

**Priority order:**
1. Story (50%)
2. NPC interaction & intelligent behavior (29%)
3. Animation (19%)
4. Graphics (1%)
5. Stability (1%)

## Current Phase

**Phase 1 — ARCHITECTURE LOCK**

This repository currently contains design documents and the technical architecture foundation.

## Tech Stack (Locked)

- **Runtime**: Browser-first (no native engine dependency)
- **Renderer**: Three.js (lightweight, mature, low graphics priority)
- **Language**: TypeScript
- **Module style**: Clear interfaces + Event Bus (no deep internal imports between systems)
- **Build**: Vite (planned)

## Directory Structure

```
src/
  core/           # EventBus, Time, Logger, Types
  state/          # Serializable Game State
  world/          # Locations, city simulation hooks
  npc/            # NPC runtime (implements NPC_DESIGN.md)
  dialogue/       # Dialogue system
  missions/       # Mission system
  animation/      # Animation contract + simple controller
  save/           # Save / Load + versioning
  render/         # Three.js renderer (minimal)
data/
  missions/
  dialogue/
  npcs/
docs/
  STORY_BIBLE.md
  CHARACTERS.md
  MISSIONS.md
  NPC_DESIGN.md
  ARCHITECTURE.md
  CONTRACTS.md
```

## Roles

- **Grok**: NPC Intelligence, Dialogue & Behavior Director + Lead Architect / Code Reviewer
- **Claude / GLM**: Implementation of systems according to locked contracts

## Source of Truth

All story, character, mission and NPC philosophy documents in `/docs` are authoritative.
Do not rewrite them.
