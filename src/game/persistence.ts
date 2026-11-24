/**
 * D5 save and restore. The whole ColonyState is saved to localStorage after
 * every change, wrapped in a versioned envelope. Loading validates every field;
 * anything corrupt or from another version falls back to a fresh colony.
 *
 * Refresh policy:
 * - Forge tasks are day-based, so they simply continue after a reload.
 * - An expedition request cannot survive a reload (the HTTP response is lost),
 *   so the traveller returns home empty-handed and no reward is applied.
 */
import type {ColonyState, Resident, Task} from "../types";
import {DESTINATIONS, JOBS, SPECIES} from "./config";
import {createInitialState, note} from "./rules";

export const SAVE_KEY = "dwarfhold.save";
export const SAVE_VERSION = 2;

interface SaveEnvelope {
    version: number;
    savedAt: string;
    state: ColonyState;
}

export function serialize(state: ColonyState, now = new Date()): string {
    const envelope: SaveEnvelope = {version: SAVE_VERSION, savedAt: now.toISOString(), state};
    return JSON.stringify(envelope);
}

export type LoadResult =
    | { kind: "empty"; state: ColonyState }
    | { kind: "restored"; state: ColonyState }
    | { kind: "rejected"; state: ColonyState; reason: string };

/** Turns raw saved text into a safe, playable state. Never throws. */
export function restore(raw: string | null): LoadResult {
    if (raw === null) return {kind: "empty", state: createInitialState()};

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return rejected("the save could not be read");
    }
    if (!isRecord(parsed) || parsed.version !== SAVE_VERSION) {
        return rejected("the save comes from an incompatible version");
    }
    if (!isColonyState(parsed.state)) return rejected("the save is damaged");

    return {kind: "restored", state: settleInterruptedTasks(parsed.state)};
}

/** Applies the refresh policy to tasks that were running when the page closed. */
export function settleInterruptedTasks(state: ColonyState): ColonyState {
    let next = state;
    state.residents.forEach((resident) => {
        if (resident.task?.kind !== "expedition") return;
        next = {
            ...next,
            residents: next.residents.map((item) => (item.id === resident.id ? {...item, task: null} : item)),
        };
        next = note(next, `${resident.name}'s expedition was interrupted by the reload; they returned empty-handed.`, "warning");
    });
    return next;
}

export function loadFromStorage(): LoadResult {
    try {
        return restore(window.localStorage.getItem(SAVE_KEY));
    } catch {
        return rejected("browser storage is unavailable");
    }
}

export function saveToStorage(state: ColonyState) {
    try {
        window.localStorage.setItem(SAVE_KEY, serialize(state));
    } catch {
        // Storage full or blocked: the game keeps running without saving.
    }
}

export function clearStorage() {
    try {
        window.localStorage.removeItem(SAVE_KEY);
    } catch {
        // Nothing to clear.
    }
}

function rejected(reason: string): LoadResult {
    const state = note(createInitialState(), `A new hold was founded because ${reason}.`, "warning");
    return {kind: "rejected", state, reason};
}

// ---------------------------------------------------------------- validation

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);
const isCount = (value: unknown): value is number =>
    typeof value === "number" && Number.isInteger(value) && value >= 0;
const isText = (value: unknown): value is string => typeof value === "string";

function isTask(value: unknown): value is Task {
    if (value === null) return true;
    if (!isRecord(value)) return false;
    if (value.kind === "craft") {
        return (value.item === "tools" || value.item === "weapons") && isCount(value.startedDay) && isCount(value.readyDay);
    }
    if (value.kind === "expedition") {
        return isText(value.journeyId) && isCount(value.departedDay)
            && DESTINATIONS.some((destination) => destination.id === value.destination);
    }
    return false;
}

function isResident(value: unknown): value is Resident {
    if (!isRecord(value)) return false;
    const jobOk = (job: unknown) => job === null || JOBS.includes(job as never);
    return isText(value.id) && isText(value.name) && isText(value.title) && isText(value.icon)
        && typeof value.species === "string" && value.species in SPECIES
        && jobOk(value.assignment)
        && (value.specialty === undefined || jobOk(value.specialty))
        && typeof value.tool === "boolean"
        && isTask(value.task);
}

export function isColonyState(value: unknown): value is ColonyState {
    if (!isRecord(value)) return false;
    const {resources, residents, chronicle, flags, lastRaid} = value;
    if (!isCount(value.day) || !isCount(value.nextId)) return false;
    if (!isRecord(resources) || !["wood", "stone", "food", "tools", "weapons"].every((key) => isCount(resources[key]))) return false;
    if (!Array.isArray(residents) || !residents.every(isResident)) return false;
    if (new Set(residents.map((resident) => resident.id)).size !== residents.length) return false;
    if (!Array.isArray(chronicle) || !chronicle.every((entry) => isRecord(entry) && isText(entry.id) && isText(entry.message) && isCount(entry.day))) return false;
    if (!isRecord(flags) || typeof flags.goblinJoined !== "boolean") return false;
    if (lastRaid !== null && !(isRecord(lastRaid) && (lastRaid.outcome === "defended" || lastRaid.outcome === "looted"))) return false;
    return true;
}
