# BLACK MILE — NPC DESIGN CONTRACT

## Principle
NPCs are autonomous agents with incomplete information.
They respond to what they know, believe, feel and prioritize, not to the hidden game state.

## NPC State
Each important NPC should support:
- identity
- personality traits
- mood
- goals and priorities
- fears
- secrets
- knowledge
- relationships
- routine
- trust threshold
- suspicion threshold
- intelligence level
- memories

## Memory
Memory entries should record what the NPC believes happened, not an objective developer truth.

Each memory should conceptually contain:
- timestamp
- event type
- description
- emotional impact
- confidence
- source
- importance
- relevance

High-impact, important memories should persist longer. Low-confidence rumors should decay faster.

Conflicting memories are allowed.

## Relationship Model
Do not use a single favorability number.
Track at least trust, fear, respect, anger, loyalty, affection and suspicion.

Example:
An NPC may trust Elias but fear him.
An NPC may respect Elias but hate him.

## Information Rules
NPC knowledge can originate from:
- direct observation
- conversation
- evidence
- rumors
- media
- surveillance
- faction communication
- inference

NPCs can be mistaken.
NPCs can lie.
NPCs can be manipulated.
NPCs can seek confirmation.

## Rumor Propagation
Player action -> witness -> conversation -> rumor -> other NPC -> faction reaction.

Rumors can mutate while spreading.

## Dialogue
Dialogue should react to:
- relationship state
- previous conversations
- promises
- lies
- reputation
- current mood
- location
- time
- nearby witnesses
- NPC knowledge

An NPC may refuse to answer or intentionally mislead the player.

## Behavior Priorities
Default priority order:
1. Immediate survival or fear
2. Protect loved ones and critical secrets
3. High-priority goals
4. Strong emotional states
5. Relationship obligations
6. Routine
7. Curiosity

## Adversarial Cases
Test at minimum:
1. Player lies repeatedly.
2. Player betrays a trusted NPC.
3. Two NPCs receive conflicting information.
4. An NPC witnesses only part of an event.
5. A promise is many hours old.
6. False information is deliberately planted.
7. A conversation starts while an NPC is distracted.
8. Two NPCs have conflicting goals.
9. A major NPC disappears.
10. A rumor mutates as it spreads.