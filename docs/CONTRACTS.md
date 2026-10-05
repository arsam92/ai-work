# BLACK MILE — Locked Contracts

The Event Bus is the stable notification channel between runtime systems.

## Event names

- player.action.observed
- player.moved
- npc.memory.added
- npc.relationship.changed
- dialogue.started
- dialogue.ended
- dialogue.effect
- mission.objective.updated
- mission.completed
- rumor.started
- rumor.mutated
- world.flag.changed
- time.tick
- save.requested
- load.completed
- state.changed
- input.interact
- input.pointerlock
- input.look
- input.wheel
- interaction.available
- interaction.used

src/core/EventBus.ts contains the canonical event vocabulary and runtime implementation.

## Runtime rule

Use events for notifications and explicit public interfaces for commands. Do not import another module's private implementation to bypass the contract.

Payloads are owned by the consuming system and must remain serializable when they enter persistent state.

## State

GameState is the single serializable source of truth. Changes to its shape require a version bump and migration.

## NPC

NPC memory and relationship mutations are owned by the NPC system. Other systems request effects through public interfaces or events.

## Missions and dialogue

Mission definitions and dialogue definitions are data-driven. Content changes should not require engine rewrites.

See docs/ARCHITECTURE.md for module boundaries.