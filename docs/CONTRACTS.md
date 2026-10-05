# BLACK MILE — Locked Contracts

These contracts are the stable interfaces between runtime systems. Implementations may change, but persistent data shapes and event names must remain compatible or be versioned and migrated.

---

## 1. Event Bus

Canonical event names:

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

```ts
export type EventHandler<T = unknown> = (payload: T) => void;

export interface IEventBus {
  on<T = unknown>(event: string, handler: EventHandler<T>): () => void;
  once<T = unknown>(event: string, handler: EventHandler<T>): void;
  emit<T = unknown>(event: string, payload?: T): void;
  off(event: string, handler: EventHandler): void;
  clear(): void;
}
```

`src/core/EventBus.ts` is the canonical runtime implementation.

Use events for notifications and explicit public interfaces for commands. Do not bypass module boundaries by importing private implementation details.

---

## 2. Serializable GameState

```ts
export interface GameState {
  version: number;
  gameTime: number;
  player: PlayerState;
  npcs: Record<string, NPCState>;
  missions: MissionRuntimeState;
  world: WorldState;
  rumors: RumorNetworkState;
  flags: Record<string, boolean | number | string>;
}

export interface PlayerState {
  id: 'player';
  locationId: string;
  knownFacts: string[];
  inventory: string[];
  reputation: Record<string, number>;
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
  knownBy: string[];
}
```

All persistent fields must be plain JSON-serializable values.

`CURRENT_GAME_STATE_VERSION` is currently 1.

---

## 3. NPC State

```ts
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
    primary: string;
    intensity: number;
    decayRate: number;
  };
  goals: NPCGoal[];
  fears: string[];
  secrets: NPCSecret[];
  memories: NPCMemory[];
  relationships: Record<string, Relationship>;
  routine: {
    currentActivity: string;
    locationId: string;
    schedule: Record<string, string>;
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
  description: string;
  emotionalImpact: {
    emotion: string;
    intensity: number;
  };
  confidence: number;
  source: string;
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
    trust: number;
    fear: number;
    respect: number;
    anger: number;
    loyalty: number;
    affection: number;
    suspicion: number;
  };
  historySummary: string;
  lastSignificantEvent: string | null;
  relationshipType: string;
}
```

NPC memory and relationship mutation is owned by the NPC runtime.

---

## 4. Mission Data

```ts
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
  alternativeSolutions?: string[];
}

export interface MissionObjective {
  objectiveId: string;
  type: 'reach_location' | 'talk_to' | 'obtain_item' | 'witness_event' | 'custom';
  target?: string;
  description: string;
  optional: boolean;
  completed?: boolean;
}

export interface MissionEffect {
  type: 'set_flag' | 'change_relationship' | 'add_memory' | 'unlock_mission' | 'start_rumor' | 'custom';
  payload: Record<string, unknown>;
}

export interface MissionRuntimeState {
  active: string[];
  completed: string[];
  failed: string[];
  objectiveProgress: Record<string, Record<string, boolean>>;
}
```

Mission content is data-driven. Story changes should not require rewriting engine code.

---

## 5. Dialogue State

```ts
export interface DialogueState {
  conversationId: string;
  participants: string[];
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
  tone: string;
  animationIntent?: string;
  effects?: MissionEffect[];
}

export interface DialogueChoice {
  id: string;
  text: string;
  nextNodeId: string | null;
  effects?: MissionEffect[];
}

export interface DialogueNode {
  id: string;
  speakerId: string;
  text: string;
  tone: string;
  animationIntent?: string;
  choices: DialogueChoice[];
}

export interface DialogueDefinition {
  dialogueId: string;
  npcId: string;
  startNodeId: string;
  nodes: Record<string, DialogueNode>;
}
```

---

## 6. Save / Load

```ts
export interface SaveFile {
  meta: {
    version: number;
    timestamp: number;
    playTime: number;
    slotName: string;
  };
  state: GameState;
}

export interface ISaveSystem {
  save(slot: string, state: GameState): Promise<void>;
  load(slot: string): Promise<GameState>;
  listSlots(): Promise<{ slot: string; meta: SaveFile['meta'] }[]>;
  migrate(oldState: unknown, fromVersion: number, toVersion: number): GameState;
}

export const CURRENT_SAVE_VERSION = 1;
```

Any persistent GameState shape change requires a version bump and migration path.

---

## 7. Versioning Rule

Contracts are API boundaries, not suggestions.

Before changing a contract:
1. identify the compatibility impact;
2. update the consuming systems;
3. add migration/tests where persistent state is affected;
4. document the change.