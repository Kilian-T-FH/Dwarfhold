/**
 * All game rules as pure functions: (state, input) -> new state.
 * No React, no timers, no network, no randomness. Every rule rejects an invalid
 * input by returning a state whose workers and resources are unchanged
 * (at most a chronicle notice is added), so the UI can never create an
 * inconsistent colony, and every rule can be unit-tested directly.
 */
import type {
    Activity,
    ColonyState,
    CraftItem,
    DestinationId,
    ExpeditionResult,
    JobType,
    RaidReport,
    Resident,
    ResidentStatus,
    ResourceKey,
    Resources,
} from "../types";
import {
    CHRONICLE_LENGTH,
    destinationLabel,
    FOOD_PER_RESIDENT,
    ITEM_LABEL,
    JOB_LABEL,
    JOB_RESOURCE,
    RAID_DEFENSE_COST,
    RAID_DEFENSE_THRESHOLD,
    RAID_LOOT_KEYS,
    RAID_LOOT_SHARE,
    RECIPES,
    RECRUIT_DESTINATION,
    SPECIES,
    TOOL_BONUS,
} from "./config";

// ---------------------------------------------------------------- initial state

export const GOBLIN: Resident = {
    id: "goblin-1",
    name: "Grisk Mossfinger",
    title: "Fungus Whisperer",
    icon: "👺",
    species: "goblin",
    assignment: null,
    tool: false,
    task: null,
};

export function createInitialState(): ColonyState {
    return {
        day: 12,
        resources: {wood: 14, stone: 9, food: 18, tools: 1, weapons: 0},
        residents: [
            {
                id: "dwarf-1", name: "Bromli Copperkeg", title: "Hold Warden", icon: "🧔🏻", species: "dwarf",
                assignment: "mining", specialty: "mining", tool: false, task: null,
            },
            {
                id: "dwarf-2", name: "Yrsa Flintbraid", title: "Trail Scout", icon: "🧔🏼‍♀️", species: "dwarf",
                assignment: "woodcutting", specialty: "woodcutting", tool: false, task: null,
            },
            {
                id: "dwarf-3", name: "Dori Ashmantle", title: "Stone Singer", icon: "🧔🏽", species: "dwarf",
                assignment: null, tool: false, task: null,
            },
        ],
        chronicle: [{id: "welcome", day: 12, message: "The forge fires are lit. Stonehome wakes."}],
        flags: {goblinJoined: false},
        lastRaid: null,
        nextId: 1,
    };
}

// ---------------------------------------------------------------- derived values

export function statusOf(resident: Resident): ResidentStatus {
    if (resident.task?.kind === "craft") return "crafting";
    if (resident.task?.kind === "expedition") return "expedition";
    return resident.assignment ? "working" : "idle";
}

export const isAvailable = (resident: Resident) => resident.task === null;
export const isHome = (resident: Resident) => resident.task?.kind !== "expedition";
export const isGameOver = (state: ColonyState) => state.residents.length === 0;

export function canDoJob(resident: Resident, job: JobType): boolean {
    return job === null || SPECIES[resident.species].production[job] !== undefined;
}

/** What a resident adds to the stores tonight (empty when busy or unassigned). */
export function dailyOutput(resident: Resident): Partial<Resources> {
    if (!isAvailable(resident) || !resident.assignment) return {};
    const base = SPECIES[resident.species].production[resident.assignment];
    if (base === undefined) return {};
    return {[JOB_RESOURCE[resident.assignment]]: base + (resident.tool ? TOOL_BONUS : 0)};
}

export interface Forecast {
    production: Resources;
    meals: number;
    netFood: number;
    /** Residents who would go unfed tonight, in the order they would leave. */
    hungry: Resident[];
}

/** Tonight's expected result, computed with the same rules advanceDay uses. */
export function forecast(state: ColonyState): Forecast {
    const production = emptyResources();
    state.residents.forEach((resident) => addInto(production, dailyOutput(resident)));
    const eaters = state.residents.filter(isHome);
    const meals = eaters.length * FOOD_PER_RESIDENT;
    const available = state.resources.food + production.food;
    const fed = Math.min(eaters.length, Math.floor(available / FOOD_PER_RESIDENT));
    return {production, meals, netFood: production.food - meals, hungry: eaters.slice(fed)};
}

export function craftBlocker(state: ColonyState, smith: Resident | undefined, item: CraftItem): string | null {
    if (!smith) return "Choose a smith first.";
    if (!isAvailable(smith)) return `${smith.name} is busy.`;
    if (SPECIES[smith.species].craftDays[item] === undefined) {
        return `${SPECIES[smith.species].label}s cannot forge ${ITEM_LABEL[item]}s.`;
    }
    const missing = Object.entries(RECIPES[item]).find(
        ([key, amount]) => state.resources[key as ResourceKey] < (amount ?? 0),
    );
    if (missing) return `Not enough ${missing[0]} (needs ${missing[1]}).`;
    return null;
}

// ---------------------------------------------------------------- player actions

export function assign(state: ColonyState, id: string, job: JobType): ColonyState {
    const resident = state.residents.find((item) => item.id === id);
    if (!resident || resident.assignment === job) return state;
    if (!isAvailable(resident)) {
        return note(state, `${resident.name} is busy and cannot change jobs right now.`, "warning");
    }
    if (!canDoJob(resident, job)) {
        return note(state, `${resident.name} refuses to work in ${job ? JOB_LABEL[job] : "that job"}.`, "warning");
    }
    return note(
        updateResident(state, id, {assignment: job}),
        `${resident.name} assigned to ${job ? JOB_LABEL[job] : "nothing"}.`,
    );
}

/** Equip a stored tool, or return the carried one to the stores. */
export function toggleTool(state: ColonyState, id: string): ColonyState {
    const resident = state.residents.find((item) => item.id === id);
    // D4 policy: a traveller keeps their tool until they are back.
    if (!resident || !isHome(resident)) return state;
    if (!resident.tool && state.resources.tools < 1) return state;
    return {
        ...updateResident(state, id, {tool: !resident.tool}),
        resources: {...state.resources, tools: state.resources.tools + (resident.tool ? 1 : -1)},
    };
}

export function startCraft(state: ColonyState, smithId: string, item: CraftItem): ColonyState {
    const smith = state.residents.find((resident) => resident.id === smithId);
    const blocker = craftBlocker(state, smith, item);
    if (blocker || !smith) return note(state, blocker ?? "No such smith.", "warning");

    const days = SPECIES[smith.species].craftDays[item]!;
    const resources = {...state.resources};
    Object.entries(RECIPES[item]).forEach(([key, amount]) => {
        resources[key as ResourceKey] -= amount ?? 0;
    });
    const next = updateResident({...state, resources}, smithId, {
        task: {kind: "craft", item, startedDay: state.day, readyDay: state.day + days},
    });
    return note(next, `${smith.name} starts forging a ${ITEM_LABEL[item]}. Ready on day ${state.day + days}.`);
}

export function departExpedition(
    state: ColonyState,
    id: string,
    destination: DestinationId,
    journeyId: string,
): ColonyState {
    const scout = state.residents.find((item) => item.id === id);
    if (!scout || isGameOver(state)) return state;
    if (!isAvailable(scout)) return note(state, `${scout.name} is busy and cannot leave.`, "warning");
    const next = updateResident(state, id, {
        task: {kind: "expedition", journeyId, destination, departedDay: state.day},
    });
    return note(next, `${scout.name} departed for ${destinationLabel(destination)}.`);
}

/** True while the given journey is still waiting for its result. */
export function isJourneyActive(state: ColonyState, journeyId: string): boolean {
    return state.residents.some((resident) => resident.task?.kind === "expedition" && resident.task.journeyId === journeyId);
}

/**
 * Applies a successful result exactly once: only the resident still holding
 * this journey id is resolved. A late, duplicate or stale (pre-refresh) result
 * finds no matching journey and changes nothing.
 */
export function completeExpedition(state: ColonyState, journeyId: string, result: ExpeditionResult): ColonyState {
    const scout = findTraveller(state, journeyId);
    if (!scout || scout.task?.kind !== "expedition") return state;
    const destination = scout.task.destination;

    const resources = {...state.resources};
    addInto(resources, result.rewards);
    let next = note(
        {...updateResident(state, scout.id, {task: null}), resources},
        `${scout.name} returned: ${result.message} (${describe(result.rewards)})`,
        "good",
    );

    if (destination === RECRUIT_DESTINATION && !next.flags.goblinJoined) {
        next = note(
            {...next, residents: [...next.residents, {...GOBLIN}], flags: {...next.flags, goblinJoined: true}},
            `${GOBLIN.name}, a goblin squatting in the Old Mine, followed ${scout.name} home and joins Stonehome.`,
            "good",
        );
    }
    if (result.hostile) next = resolveRaid(next, result.hostile.name);
    return next;
}

/** A failed or timed-out trip: the scout comes home, nothing is awarded, no raid. */
export function failExpedition(state: ColonyState, journeyId: string, reason: string): ColonyState {
    const scout = findTraveller(state, journeyId);
    if (!scout) return state;
    return note(updateResident(state, scout.id, {task: null}), `${scout.name} came back empty-handed. ${reason}`, "warning");
}

export function dismissRaid(state: ColonyState): ColonyState {
    return {...state, lastRaid: null};
}

// ---------------------------------------------------------------- D7 raid

export function resolveRaid(state: ColonyState, attackers: string): ColonyState {
    const weaponsBefore = state.resources.weapons;
    const resources = {...state.resources};
    let report: RaidReport;

    if (weaponsBefore >= RAID_DEFENSE_THRESHOLD) {
        resources.weapons -= RAID_DEFENSE_COST;
        report = {day: state.day, attackers, outcome: "defended", weaponsBefore, weaponsLost: RAID_DEFENSE_COST, loot: {}};
    } else {
        const loot: Partial<Resources> = {};
        RAID_LOOT_KEYS.forEach((key) => {
            const taken = Math.floor(resources[key] * RAID_LOOT_SHARE);
            if (taken > 0) {
                loot[key] = taken;
                resources[key] -= taken;
            }
        });
        report = {day: state.day, attackers, outcome: "looted", weaponsBefore, weaponsLost: 0, loot};
    }

    const message = report.outcome === "defended"
        ? `A ${attackers} followed the scout home. ${weaponsBefore} weapons drove them off; ${RAID_DEFENSE_COST} broke in the fight.`
        : `A ${attackers} followed the scout home and looted the stores: ${describe(report.loot) || "nothing worth taking"}.`;
    return note({...state, resources, lastRaid: report}, message, report.outcome === "defended" ? "good" : "warning");
}

// ---------------------------------------------------------------- the daily tick

/**
 * One simulation day, in a fixed order:
 * 1. residents with a job and no task produce (species rate + tool bonus);
 * 2. forge tasks whose ready day has come deliver their item;
 * 3. everyone at home eats; unfed residents leave, last in the roster first,
 *    and give back any tool they carry. Travellers live off their own packs.
 */
export function advanceDay(state: ColonyState): ColonyState {
    if (isGameOver(state)) return state;
    const day = state.day + 1;
    const resources = {...state.resources};
    const messages: Omit<Activity, "id">[] = [];

    state.residents.forEach((resident) => addInto(resources, dailyOutput(resident)));

    let residents = state.residents.map((resident) => {
        if (resident.task?.kind !== "craft" || resident.task.readyDay > day) return resident;
        resources[resident.task.item] += 1;
        messages.push({day, message: `${resident.name} finished forging a ${ITEM_LABEL[resident.task.item]}.`, tone: "good"});
        return {...resident, task: null};
    });

    const eaters = residents.filter(isHome);
    const fed = Math.min(eaters.length, Math.floor(resources.food / FOOD_PER_RESIDENT));
    resources.food -= fed * FOOD_PER_RESIDENT;
    const unfed = new Set(eaters.slice(fed).map((resident) => resident.id));

    residents = residents.filter((resident) => {
        if (!unfed.has(resident.id)) return true;
        if (resident.tool) resources.tools += 1;
        const lostWork = resident.task?.kind === "craft" ? ` Their unfinished ${ITEM_LABEL[resident.task.item]} is lost.` : "";
        const returnedTool = resident.tool ? " Their tool was returned to the stores." : "";
        messages.push({day, message: `${resident.name} went hungry and left Stonehome.${returnedTool}${lostWork}`, tone: "warning"});
        return false;
    });

    let next: ColonyState = {...state, day, resources, residents};
    messages.forEach((entry) => {
        next = note(next, entry.message, entry.tone);
    });
    return next;
}

// ---------------------------------------------------------------- helpers

export function emptyResources(): Resources {
    return {wood: 0, stone: 0, food: 0, tools: 0, weapons: 0};
}

function addInto(target: Resources, delta: Partial<Resources>) {
    Object.entries(delta).forEach(([key, amount]) => {
        if (key in target) target[key as ResourceKey] += amount ?? 0;
    });
}

export function describe(amounts: Partial<Resources>): string {
    return Object.entries(amounts)
        .filter(([, amount]) => amount)
        .map(([key, amount]) => `${amount} ${key}`)
        .join(", ");
}

function findTraveller(state: ColonyState, journeyId: string) {
    return state.residents.find(
        (resident) => resident.task?.kind === "expedition" && resident.task.journeyId === journeyId,
    );
}

function updateResident(state: ColonyState, id: string, patch: Partial<Resident>): ColonyState {
    return {
        ...state,
        residents: state.residents.map((resident) => (resident.id === id ? {...resident, ...patch} : resident)),
    };
}

/** Adds a chronicle entry. Never touches workers or resources. */
export function note(state: ColonyState, message: string, tone?: Activity["tone"]): ColonyState {
    const entry: Activity = {id: `log-${state.nextId}`, day: state.day, message, ...(tone ? {tone} : {})};
    return {...state, nextId: state.nextId + 1, chronicle: [entry, ...state.chronicle].slice(0, CHRONICLE_LENGTH)};
}
