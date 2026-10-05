/**
 * BLACK MILE - NPC State Interface
 * Implements the design in docs/NPC_DESIGN.md
 * Phase 1 Lock — do not simplify multi-dimensional relationships or memory model
 */

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
