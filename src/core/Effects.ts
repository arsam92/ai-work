export type GameEffect =
  | {
      type: "set_flag";
      payload: { key: string; value: boolean | number | string };
    }
  | {
      type: "change_relationship";
      payload: Record<string, unknown>;
    }
  | {
      type: "add_memory";
      payload: Record<string, unknown>;
    }
  | {
      type: "unlock_mission";
      payload: Record<string, unknown>;
    }
  | {
      type: "start_rumor";
      payload: Record<string, unknown>;
    }
  | {
      type: "custom";
      payload: Record<string, unknown>;
    };
