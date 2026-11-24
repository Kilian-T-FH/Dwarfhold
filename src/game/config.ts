import type {CraftItem, DestinationId, Job, ResourceKey, Resources, Species} from "../types";

/** Seconds of real time per simulation day. */
export const DAY_MS = 8_000;

/** Which resource each local job produces. */
export const JOB_RESOURCE: Record<Job, ResourceKey> = {
    woodcutting: "wood",
    mining: "stone",
    farming: "food",
};

export const JOB_LABEL: Record<Job, string> = {
    woodcutting: "Woodcutting",
    mining: "Deep Mining",
    farming: "Mushroom Farm",
};

export const JOBS: Job[] = ["woodcutting", "mining", "farming"];

/** An equipped tool adds this much to a compatible job's daily output (D2). */
export const TOOL_BONUS = 1;

/** Every resident at home eats this much at the end of each day (D1). */
export const FOOD_PER_RESIDENT = 1;

export interface SpeciesRules {
    label: string;
    /** Daily output per job. A missing job means the species cannot do it. */
    production: Partial<Record<Job, number>>;
    /** Forge days per item. A missing item means the species cannot forge it. */
    craftDays: Partial<Record<CraftItem, number>>;
    summary: string;
}

export const SPECIES: Record<Species, SpeciesRules> = {
    dwarf: {
        label: "Dwarf",
        production: {woodcutting: 3, mining: 2, farming: 4},
        craftDays: {tools: 2, weapons: 3},
        summary: "Steady at every job. Forges tools (2 days) and weapons (3 days).",
    },
    goblin: {
        label: "Goblin",
        production: {woodcutting: 2, farming: 6},
        craftDays: {weapons: 2},
        summary: "Refuses the deep tunnels. Grows 6 food a day. Forges crude weapons in 2 days, but no tools.",
    },
};

export const RECIPES: Record<CraftItem, Partial<Resources>> = {
    tools: {wood: 3, stone: 2},
    weapons: {wood: 2, stone: 3},
};

export const ITEM_LABEL: Record<CraftItem, string> = {tools: "tool", weapons: "weapon"};

export interface Destination {
    id: DestinationId;
    label: string;
    hint: string;
}

export const DESTINATIONS: Destination[] = [
    {id: "crystal-cave", label: "Crystal Cave", hint: "8 stone and 1 tool."},
    {
        id: "old-mine",
        label: "The Old Mine",
        hint: "12 stone and 2 wood. Rumour says a stranger camps in the tunnels.",
    },
    {id: "blocked-pass", label: "Blocked Pass", hint: "Sealed by rockfall. The trip always fails."},
    {
        id: "howling-gulch",
        label: "Howling Gulch",
        hint: "6 wood and 6 food, but a gnoll war-band will follow the scout home.",
    },
];

export const destinationLabel = (id: DestinationId) =>
    DESTINATIONS.find((destination) => destination.id === id)?.label ?? id;

/** First successful trip here brings the goblin to Stonehome (D6). */
export const RECRUIT_DESTINATION: DestinationId = "old-mine";

/** D7: at least this many stored weapons repel a raid. */
export const RAID_DEFENSE_THRESHOLD = 3;
/** D7: a successful defense breaks this many weapons. */
export const RAID_DEFENSE_COST = 1;
/** D7: undefended raiders carry off this share (rounded down) of each listed resource. */
export const RAID_LOOT_SHARE = 0.5;
export const RAID_LOOT_KEYS: ResourceKey[] = ["wood", "stone", "food", "tools"];

export const CHRONICLE_LENGTH = 8;
export const EXPEDITION_TIMEOUT_MS = 10_000;
