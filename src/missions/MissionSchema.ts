/**
 * BLACK MILE - Mission Data & Runtime Schema
 * Phase 1 Lock
 */

import type { GameEffect } from "../core/Effects";

export type MissionEffect = GameEffect;

export interface MissionDefinition {
  missionId: string;
  act: number;
  title: string;
  description: string;
  prerequisites: {
    flags?: string[];
    missionsCompleted?: string[];
    minRelationship?: {
      npcId: string;
      dimension: string;
      value: number;
    }[];
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
  completed?: boolean; // runtime
}

export interface MissionRuntimeState {
  active: string[];
  completed: string[];
  failed: string[];
  objectiveProgress: Record<string, Record<string, boolean>>;
}
