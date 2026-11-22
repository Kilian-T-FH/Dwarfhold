export type ResourceKey = "wood" | "stone" | "food" | "tools";
export type JobType = "woodcutting" | "mining" | "farming" | null;
export type DwarfStatus = "idle" | "working" | "expedition"| "crafting";
// Matches the Resources keys the forge delivers into.
export type CraftItem = "tools" | "weapons";
export interface Resources { wood: number; stone: number; food: number; tools: number; weapons: number}

export interface Dwarf { 
    id: string;
     name: string; 
     title: string; 
     icon: string; 
     assignment: JobType; 
     status: DwarfStatus; 
     specialty?: Exclude<JobType, null>;
     tool: boolean;
     crafting?: CraftItem
}

export interface ColonyState { 
    day: number; 
    resources: Resources; 
    dwarves: Dwarf[] 
}

export interface ExpeditionResult { 
    expeditionId: string; 
    status: "completed"; 
    rewards: Partial<Resources>; 
    message: string 
}

export interface Activity { 
    id: string; 
    day: number; 
    message: string; 
    tone?: "good" | "warning" 
}
