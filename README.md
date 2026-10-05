# BLACK MILE

**A 3D, story-first open-world crime drama set in Veyra.**

> The graphics are the stage. The people are the game.

## Creative Priority

| Area | Priority |
|---|---:|
| Story | 50% |
| NPC interaction & intelligent behavior | 29% |
| Animation | 19% |
| Graphics | 1% |
| Stability | 1% |

## Team

- **Arsam** — Game Director and final decision maker
- **ChatGPT** — story, world, missions and game design
- **Claude** — architecture, contracts and code review
- **GLM** — main implementation and playable build
- **Grok** — NPC intelligence, memory, dialogue behavior and social simulation
- **DeepSeek V4.1** — optional adversarial QA

## Current State

### Phase 1 — Architecture
- TypeScript + Vite
- Three.js
- Event Bus
- Serializable GameState
- NPC / Mission / Dialogue / Save contracts

### Vertical Slice — Playable Foundation
- 3D Veyra night-road environment
- third-person player movement
- camera orbit and pointer lock
- interaction range
- June Mercer as first NPC
- branching dialogue
- first mission: OLD KEYS
- NPC memory + multi-dimensional relationship runtime
- browser save/load
- procedural animation hook
- EventBus, GameStore and Mission tests

## Run

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal.

Checks:

```bash
npm run typecheck
npm test
npm run build
```

## Architecture

```text
src/
  core/          EventBus, GameLoop, GameTime, Logger, Input
  state/         GameState + GameStore
  world/         Veyra world construction
  render/        Three.js renderer
  player/        player controller
  camera/        camera rig
  interaction/   interaction probe/registry
  npc/           NPC runtime
  dialogue/      state + dialogue runner
  missions/      mission runtime
  animation/     animation intents
  save/          browser save/load
src/ui/          HUD + dialogue UI
data/
  npcs/
  dialogue/
  missions/
docs/
  STORY_BIBLE.md
  CHARACTERS.md
  MISSIONS.md
  NPC_DESIGN.md
  ARCHITECTURE.md
  CONTRACTS.md
  ROADMAP.md
```

## Story

BLACK MILE begins when Elias Ward returns to Veyra after his brother Jonah disappears. Jonah's last message points toward an eight-year-old incident on Black Mile that was officially closed but never truly understood.

The story is built around incomplete knowledge, relationships, memory, rumors and consequences.

## Rules

1. NPCs are not omniscient.
2. Important NPCs remember important player actions.
3. Rumors can mutate and be wrong.
4. Major choices create trade-offs.
5. Missions should change relationships, information or world state.
6. Visual fidelity is secondary to narrative and character behavior.

## License

MIT