# BLACK MILE — NPC RUNTIME SPECIFICATION

## Purpose

This document turns the NPC design into an implementation contract for the runtime.

NPCs are autonomous, partial-information agents. They must never read the hidden truth of the game world directly.

## State Ownership

- NPCSystem owns NPC memory, relationships, mood and NPC-local state.
- GameStore owns the serializable snapshot.
- DialogueSystem requests effects through EventBus.
- MissionSystem owns mission progress.
- AnimationController consumes high-level animation intents.

## Perception

An observed event should include an observer list when possible.

Suggested payload:

```json
{
  "type": "PLAYER_ACTION",
  "location": "black-mile",
  "observedBy": ["june"],
  "partialObservation": {
    "june": "Elias argued with an unknown man and then walked toward the garage."
  }
}
```

If no observer list exists, the current runtime may use location as a temporary fallback. This fallback should be removed when world visibility becomes authoritative.

## Memory

Memories describe the NPC's belief, not the developer's hidden truth.

Memory ranking should consider:

`importance × confidence × emotional impact`

Important memories persist longer.
Low-confidence rumors decay faster.
Conflicting memories may coexist.

## Relationships

Never collapse relationships into a single score.

Required dimensions:

- trust
- fear
- respect
- anger
- loyalty
- affection
- suspicion

An NPC can hold contradictory feelings simultaneously.

## Decision Model

Decision priority:

1. Survival and immediate fear
2. Protect loved ones and critical secrets
3. High-priority goals
4. Strong emotions
5. Relationship obligations
6. Routine
7. Curiosity

An NPC should compare feasible actions rather than blindly follow one rule.

## Intelligence Levels

Intelligence affects:
- ability to connect evidence
- confidence calibration
- planning depth
- deception detection
- goal prioritization

Intelligence does not give additional knowledge.

An intelligent NPC can make better use of limited information; it cannot magically know more.

## Rumors

Rumors are information with provenance and uncertainty.

When a rumor spreads:

source -> target -> transformed belief

Confidence should change based on:
- source trust
- target intelligence
- evidence
- contradiction
- emotional relevance

## Dialogue

Dialogue selection should inspect:
- current mood
- relationship dimensions
- recent memories
- active goals
- known facts
- rumors
- location
- time
- social context

NPCs can:
- refuse
- lie
- manipulate
- threaten
- change topic
- reveal information conditionally
- remember promises

## Runtime Output

NPC behavior should resolve into a small actionable result, for example:

```ts
{
  "action": "talk | leave | approach | avoid | call_for_help | investigate | work",
  "reason": "protect_secret",
  "targetId": "player",
  "confidence": 0.78,
  "animationIntent": "nervous"
}
```

## Safety Invariants

1. NPC cannot read hidden mission solution flags unless the NPC has legitimately learned the information.
2. NPC cannot create impossible knowledge.
3. Memory has a bounded size.
4. Relationship values remain within their documented ranges.
5. NPC decisions are deterministic from state unless a controlled random source is explicitly supplied.
6. Dialogue and mission systems cannot mutate NPC state directly.
7. Animation never changes story state.