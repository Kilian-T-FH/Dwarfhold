export type ResourceKey = "wood" | "stone" | "food" | "tools" | "weapons";
export type Resources = Record<ResourceKey, number>;

export type Job = "woodcutting" | "mining" | "farming";
export type JobType = Job | null;

export type Species = "dwarf" | "goblin";
export type ResidentStatus = "idle" | "working" | "expedition" | "crafting";

/** Matches the Resources keys the forge delivers into. */
export type CraftItem = "tools" | "weapons";

export type DestinationId = "crystal-cave" | "old-mine" | "blocked-pass" | "howling-gulch";

/**
 * What a resident is busy with. A resident has at most one task, and a task
 * always wins over their job assignment: that is what keeps "one activity at a
 * time" true by construction (status is derived, never stored separately).
 */
export type Task =
    | { kind: "craft"; item: CraftItem; startedDay: number; readyDay: number }
    | { kind: "expedition"; journeyId: string; destination: DestinationId; departedDay: number };

export interface Resident {
    id: string;
    name: string;
    title: string;
    icon: string;
    species: Species;
    assignment: JobType;
    specialty?: Job;
    /** Carries one tool from the stores. Stored tools live in resources.tools. */
    tool: boolean;
    task: Task | null;
}

export interface Activity {
    id: string;
    day: number;
    message: string;
    tone?: "good" | "warning";
}

export interface RaidReport {
    day: number;
    attackers: string;
    outcome: "defended" | "looted";
    weaponsBefore: number;
    weaponsLost: number;
    loot: Partial<Resources>;
}

export interface ColonyState {
    day: number;
    resources: Resources;
    residents: Resident[];
    chronicle: Activity[];
    flags: { goblinJoined: boolean };
    lastRaid: RaidReport | null;
    /** Counter for deterministic chronicle ids (keeps rules pure). */
    nextId: number;
}

export interface ExpeditionResult {
    expeditionId: string;
    status: "completed";
    rewards: Partial<Resources>;
    message: string;
    /** Present when something followed the traveller home (D7). */
    hostile?: { name: string };
}
