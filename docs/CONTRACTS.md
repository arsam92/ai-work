# BLACK MILE — Locked Contracts (Phase 1)

These contracts are the stable interfaces between systems.
Implementations may change. The shapes of these contracts should not change without a version bump and migration plan.

---

## 1. Event Bus

```ts
// src/core/EventBus.ts

export type EventHandler<T = unknown> = (payload: T) => void;

export interface IEventBus {
  on<T = unknown>(event: string, handler: EventHandler<T>): () => void; // returns unsubscribe
  once<T = unknown>(event: string, handler: EventHandler<T>): void;
  emit<T = unknown>(event: string, payload?: T): void;
  off(event: string, handler: EventHandler): void;
  clear(): void;
}

// Standard event names (extend as needed, never remove without migration)
export const Events = {
  PLAYER_ACTION_OBSERVED: 'player.action.observed',
  NPC_MEMORY_ADDED: 'npc.memory.added',
  RELATIONSHIP_CHANGED: 'npc.relationship.changed',
  DIALOGUE_STARTED: 'dialogue.started',
  DIALOGUE_ENDED: 'dialogue.ended',
  MISSION_OBJECTIVE_UPDATED: 'mission.objective.updated',
  MISSION_COMPLETED: 'mission.completed',
  RUMOR_STARTED: 'rumor.started',
  RUMOR_MUTATED: 'rumor.mutated',
  WORLD_FLAG_CHANGED: 'world.flag.changed',
  GAME_TIME_TICK: 'time.tick',
  SAVE_REQUESTED: 'save.requested',
  LOAD_COMPLETED: 'load.completed',
} as const;
```

**Rule:** Systems communicate state changes primarily through the Event Bus. Direct method calls between systems are allowed only through public interfaces defined here.

---

## 2. Serializable Game State

```ts
// src/state/GameState.ts

export interface GameState {
  version: number;                    // schema version for migration
  gameTime: number;                   // continuous game time (hours or seconds)
  player: PlayerState;
  npcs: Record<string, NPCState>;     // key = npc_id
  missions: MissionRuntimeState;
  world: WorldState;
  rumors: RumorNetworkState;
  flags: Record<string, boolean | number | string>;
}

export interface PlayerState {
  id: 'player';
  locationId: string;
  knownFacts: string[];               // fact ids the player has discovered
  inventory: string[];
  reputation: Record<string, number>; // coarse public reputation per faction
}

export interface WorldState {
  locations: Record<string, LocationState>;
  activeEvents: string[];
}

export interface LocationState {
  id: string;
  name: string;
  tags: string[];
}

export interface RumorNetworkState {
  activeRumors: Rumor[];
}

export interface Rumor {
  id: string;
  content: string;
  originEventId: string;
  currentConfidence: number;
  mutationHistory: string[];
  knownBy: string[];                  // npc ids
}
```

All fields that need to survive a save must be plain JSON-serializable.

---

## 3. NPC State Interface

This interface is the technical realization of `docs/NPC_DESIGN.md`.
Do not simplify the multi-dimensional relationships or memory model.

```ts
// src/npc/NPCState.ts

export interface NPCState {
  npcId: string;
  name: string;
  archetype: string;

  personality: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
    traits: string[];
  };

  currentMood: {
    primary: 'calm' | 'anxious' | 'angry' | 'fearful' | 'hopeful' | 'bitter' | string;
    intensity: number;
    decayRate: number;
  };

  goals: NPCGoal[];
  fears: string[];
  secrets: NPCSecret[];

  memories: NPCMemory[];
  relationships: Record<string, Relationship>;  // key = targetId ("player" | npcId | factionId)

  routine: {
    currentActivity: string;
    locationId: string;
    schedule: Record<string, string>;           // simple time → activity map
  };

  trustThreshold: number;
  suspicionThreshold: number;
  intelligenceLevel: number;

  lastUpdated: number;
}

export interface NPCGoal {
  goalId: string;
  description: string;
  priority: number;
  deadline: number | null;
  status: 'active' | 'suspended' | 'completed' | 'failed';
}

export interface NPCSecret {
  secretId: string;
  content: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  knownBy: string[];
}

export interface NPCMemory {
  memoryId: string;
  timestamp: number;
  eventType: string;
  subject: string;
  description: string;                // what the NPC believes happened
  emotionalImpact: {
    emotion: string;
    intensity: number;
  };
  confidence: number;
  source: 'direct_observation' | 'conversation' | 'rumor' | 'newspaper' | 'faction' | 'evidence' | 'surveillance' | string;
  importance: number;
  relevanceTags: string[];
  decay: {
    type: 'none' | 'linear' | 'exponential';
    rate: number;
    minConfidence: number;
  };
  linkedMemories: string[];
}

export interface Relationship {
  targetId: string;
  dimensions: {
    trust: number;      // -1 .. 1
    fear: number;       //  0 .. 1
    respect: number;    // -1 .. 1
    anger: number;      //  0 .. 1
    loyalty: number;    // -1 .. 1
    affection: number;  // -1 .. 1
    suspicion: number;  //  0 .. 1
  };
  historySummary: string;
  lastSignificantEvent: string | null;  // memoryId
  relationshipType: 'family' | 'friend' | 'rival' | 'enemy' | 'neutral' | 'subordinate' | 'superior' | string;
}
```

---

## 4. Mission Data Schema

```ts
// src/missions/MissionSchema.ts

export interface MissionDefinition {
  missionId: string;
  act: number;
  title: string;
  description: string;
  prerequisites: {
    flags?: string[];
    missionsCompleted?: string[];
    minRelationship?: { npcId: string; dimension: string; value: number }[];
  };
  objectives: MissionObjective[];
  onComplete: MissionEffect[];
  onFail?: MissionEffect[];
  alternativeSolutions?: string[];    // free-text notes for designers
}

export interface MissionObjective {
  objectiveId: string;
  type: 'reach_location' | 'talk_to' | 'obtain_item' | 'witness_event' | 'custom';
  target?: string;
  description: string;
  optional: boolean;
  completed: boolean;                 // runtime only
}

export interface MissionEffect {
  type: 'set_flag' | 'change_relationship' | 'add_memory' | 'unlock_mission' | 'start_rumor' | 'custom';
  payload: Record<string, unknown>;
}

export interface MissionRuntimeState {
  active: string[];                   // missionIds
  completed: string[];
  failed: string[];
  objectiveProgress: Record<string, Record<string, boolean>>; // missionId → objectiveId → done
}
```

---

## 5. Dialogue State Schema

```ts
// src/dialogue/DialogueState.ts

export interface DialogueState {
  conversationId: string;
  participants: string[];             // npcIds + "player"
  locationId: string;
  startTime: number;
  moodAtStart: Record<string, NPCState['currentMood']>;
  activeTopics: string[];
  promises: DialoguePromise[];
  liesDetected: number;
  playerReputationInContext: Record<string, number>;
  canRefuse: boolean;
  willLie: boolean;
  willManipulate: boolean;
  exitConditions: string[];
}

export interface DialoguePromise {
  promiseId: string;
  content: string;
  deadline: number | null;
  status: 'pending' | 'fulfilled' | 'broken';
  madeBy: string;
  madeTo: string;
}

export interface DialogueLine {
  speakerId: string;
  text: string;
  tone: string;                       // e.g. "suspicious", "warm", "cold", "fearful"
  animationIntent?: string;           // high-level intent for animation system
  effects?: MissionEffect[];          // optional side effects of saying this line
}
```

---

## 6. Save / Load Versioning

```ts
// src/save/SaveSystem.ts

export interface SaveFile {
  meta: {
    version: number;                  // GameState.version
    timestamp: number;                // real-world time
    playTime: number;
    slotName: string;
  };
  state: GameState;
}

export interface ISaveSystem {
  save(slot: string, state: GameState): Promise<void>;
  load(slot: string): Promise<GameState>;
  listSlots(): Promise<{ slot: string; meta: SaveFile['meta'] }[]>;
  migrate(oldState: any, fromVersion: number, toVersion: number): GameState;
}

// Current schema version
export const CURRENT_SAVE_VERSION = 1;
```

**Rule:** Any change to `GameState` shape requires bumping `CURRENT_SAVE_VERSION` and implementing a migration path.

---

## Integration Safety Rules

1. Never import a module's private files from another module.
2. Prefer emitting an event over calling a method on another system when the relationship is "notification".
3. All persistent data must live inside `GameState` or be reconstructible from it.
4. NPC system owns memory and relationship mutations. Other systems request changes via events or public methods, never by mutating NPCState directly.
5. Animation system only receives high-level intents; it never decides story or dialogue.
