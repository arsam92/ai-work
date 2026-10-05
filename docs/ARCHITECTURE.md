# BLACK MILE — Technical Architecture (Phase 1 Lock)

## 1. Goals of this document

- Provide a stable technical foundation for GLM / Claude implementation.
- Prevent systems from tightly coupling to each other.
- Make NPC intelligence (Grok design) integrable without rewriting story or behavior philosophy.
- Keep the project browser-first and lightweight (graphics priority = 1%).

## 2. High-level decisions

| Decision              | Choice                          | Reason |
|-----------------------|----------------------------------|--------|
| Platform              | Browser-first                    | Easy collaboration, no native builds, fits low graphics priority |
| 3D Renderer           | Three.js                         | Mature, lightweight, excellent for narrative games, easy to keep visuals simple |
| Language              | TypeScript                       | Clear interfaces, good for contracts between systems |
| Communication         | Event Bus + explicit interfaces  | Systems must not import each other's internals |
| State                 | Single serializable GameState    | Enables reliable save/load and debugging |
| NPC system            | Implements `docs/NPC_DESIGN.md`  | Grok owns the intelligence philosophy; architecture only provides the contract |

## 3. Module boundaries

```
src/
  core/          EventBus, GameTime, Logger, shared types
  state/         GameState root + serialization helpers
  world/         Locations, simple city simulation hooks, visibility queries
  npc/           NPC runtime that follows NPC_DESIGN.md contracts
  dialogue/      Dialogue manager (stateful, memory-aware)
  missions/      Mission runtime + objective tracking
  animation/     Animation contract + thin controller (no heavy animation system yet)
  save/          Save/Load with versioning
  render/        Minimal Three.js scene, camera, basic models
```

**Rule:** A module may only depend on:
- `core`
- its own public interfaces
- the public contracts defined in `docs/CONTRACTS.md`

It must never import private implementation details of another module.

## 4. Core systems overview

### 4.1 Event Bus
Central pub/sub for loose coupling.

Events are the primary way systems notify each other of changes (player action observed, relationship changed, mission completed, rumor started, etc.).

### 4.2 Game State
Single source of truth that can be serialized.
Contains:
- player
- all important NPCs (full state)
- active missions
- world flags
- rumor network snapshot
- time
- relationship matrix (or references)

### 4.3 NPC System
Implements the design in `NPC_DESIGN.md` and the schemas previously defined by Grok.
Receives events → updates memory, relationships, mood, goals → emits behavior decisions and dialogue requests.

### 4.4 Dialogue System
Consumes NPC state + conversation context → produces dialogue lines, tone, exit conditions, new memories/promises.

### 4.5 Mission System
Data-driven. Missions change relationships, knowledge, world flags and unlock future content.
Never treat missions as disposable errands.

### 4.6 Animation System
Thin layer. Receives high-level intents ("nervous", "avoid_eye_contact", "step_back") and maps them to available clips or procedural signals. Full animation authorship is out of scope for Phase 1.

### 4.7 Save / Load
Versioned snapshots of GameState. Must support migration between versions.

## 5. Data flow (simplified)

```
Player Action / World Event
        ↓
   Event Bus
        ↓
┌───────┴────────┐
│                │
NPC System   Mission System
│                │
↓                ↓
Memory / Rel.   Objectives / Flags
│                │
└───────┬────────┘
        ↓
  Dialogue System  ←→  Animation intents
        ↓
   Render (visual feedback)
```

## 6. Renderer choice justification

No existing engine code was found in the repository.

**Chosen: Three.js**

Reasons:
- Extremely well supported in browsers
- Low overhead for a story-first game (we can use simple geometry + basic lighting)
- Easy to replace later if needed
- Excellent TypeScript support
- Does not force high graphics fidelity (matches 1% priority)

Alternatives considered (Babylon.js, PlayCanvas) are also valid but Three.js has the largest ecosystem and simplest integration for this phase.

## 7. Phase 1 deliverables (this commit)

- Architecture document (this file)
- Locked contracts (`docs/CONTRACTS.md`)
- Basic TypeScript interfaces for the six critical contracts
- Folder scaffolding

## 8. Current implementation status

### Implemented
- Vite + TypeScript project boot
- Three.js renderer and simple Veyra scene
- third-person player movement and camera
- interaction range and input
- dialogue runtime and UI
- one NPC runtime with memory and multi-dimensional relationships
- first data-driven mission: OLD KEYS
- browser save/load contract implementation
- procedural animation hook
- EventBus and GameStore implementation
- unit tests for EventBus, GameState, GameStore and MissionSystem
- GitHub Actions CI for typecheck, tests and production build

### Not yet complete
- autonomous NPC schedules and full goal planner
- robust knowledge graph and rumor propagation
- full city simulation and interiors
- complete campaign and side missions
- advanced character animation and facial/body performance
- combat, vehicles and police systems
- browser end-to-end regression suite

The repository is intentionally being built as a story-first vertical slice before expanding the world.