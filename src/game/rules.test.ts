import {describe, expect, it} from "vitest";
import type {ColonyState, ExpeditionResult, Resident} from "../types";
import {RAID_DEFENSE_THRESHOLD} from "./config";
import * as rules from "./rules";

function colony(overrides: Partial<ColonyState> = {}, residents?: Partial<Resident>[]): ColonyState {
    const base = rules.createInitialState();
    return {
        ...base,
        chronicle: [],
        ...overrides,
        residents: residents
            ? residents.map((resident, index) => ({
                id: `r${index + 1}`, name: `R${index + 1}`, title: "", icon: "", species: "dwarf",
                assignment: null, tool: false, task: null, ...resident,
            }))
            : base.residents,
    };
}

const resources = (values: Partial<ColonyState["resources"]>) => ({wood: 0, stone: 0, food: 0, tools: 0, weapons: 0, ...values});
const success = (rewards: ExpeditionResult["rewards"], hostile?: ExpeditionResult["hostile"]): ExpeditionResult =>
    ({expeditionId: "exp-1", status: "completed", rewards, message: "ok", hostile});

describe("D1 daily simulation", () => {
    it("produces assigned resources and feeds the company", () => {
        const state = colony({resources: resources({food: 5})}, [{assignment: "woodcutting"}]);
        const next = rules.advanceDay(state);
        expect(next.day).toBe(state.day + 1);
        expect(next.resources).toMatchObject({wood: 3, food: 4});
        expect(state.resources.wood).toBe(0);
    });

    it("unfed residents leave in roster order and return their tools", () => {
        const state = colony({resources: resources({food: 1})}, [{}, {tool: true}, {}]);
        const next = rules.advanceDay(state);
        expect(next.residents.map((resident) => resident.id)).toEqual(["r1"]);
        expect(next.resources).toMatchObject({food: 0, tools: 1});
    });

    it("never produces negative food", () => {
        const next = rules.advanceDay(colony({resources: resources({food: 0})}, [{}, {}]));
        expect(next.resources.food).toBe(0);
        expect(rules.isGameOver(next)).toBe(true);
    });

    it("a busy resident cannot be reassigned, so they never do two things", () => {
        const state = colony({}, [{assignment: "mining", task: {kind: "craft", item: "tools", startedDay: 12, readyDay: 14}}]);
        const next = rules.assign(state, "r1", "woodcutting");
        expect(next.residents).toEqual(state.residents);
        expect(rules.dailyOutput(next.residents[0])).toEqual({});
    });

    it("forecast matches what advanceDay actually does", () => {
        const state = colony({resources: resources({food: 10})}, [{assignment: "farming", tool: true}, {assignment: "mining"}]);
        const forecast = rules.forecast(state);
        const next = rules.advanceDay(state);
        expect(next.resources.food - state.resources.food).toBe(forecast.netFood);
        expect(next.resources.stone).toBe(forecast.production.stone);
    });
});

describe("D2 tools", () => {
    it("an equipped tool adds one unit per day", () => {
        const state = colony({resources: resources({food: 9})}, [{assignment: "woodcutting", tool: true}, {assignment: "mining", tool: true}]);
        expect(rules.advanceDay(state).resources).toMatchObject({wood: 4, stone: 3});
    });

    it("equipping and returning keeps the tool count constant", () => {
        const state = colony({resources: resources({tools: 1})}, [{}, {}]);
        const equipped = rules.toggleTool(state, "r1");
        expect(equipped.resources.tools).toBe(0);
        expect(rules.toggleTool(equipped, "r2")).toBe(equipped); // none left for r2
        const returned = rules.toggleTool(equipped, "r1");
        expect(returned.resources.tools).toBe(1);
        expect(returned.residents[0].tool).toBe(false);
    });
});

describe("D3 crafting as work", () => {
    it("takes materials and time, then delivers once", () => {
        const state = colony({resources: resources({wood: 5, stone: 5, food: 10})}, [{assignment: "woodcutting"}]);
        const started = rules.startCraft(state, "r1", "tools");
        expect(started.resources).toMatchObject({wood: 2, stone: 3});
        expect(rules.statusOf(started.residents[0])).toBe("crafting");

        const dayOne = rules.advanceDay(started);
        expect(dayOne.resources.tools).toBe(0);
        expect(dayOne.resources.wood).toBe(2); // no woodcutting while forging
        const dayTwo = rules.advanceDay(dayOne);
        expect(dayTwo.resources.tools).toBe(1);
        expect(rules.statusOf(dayTwo.residents[0])).toBe("working");
    });

    it("an invalid attempt changes neither workers nor resources", () => {
        const state = colony({resources: resources({wood: 1, stone: 9})}, [{}]);
        const next = rules.startCraft(state, "r1", "tools");
        expect(next.resources).toEqual(state.resources);
        expect(next.residents).toEqual(state.residents);
    });

    it("a smith cannot start a second item", () => {
        const state = colony({resources: resources({wood: 20, stone: 20})}, [{}]);
        const once = rules.startCraft(state, "r1", "weapons");
        const twice = rules.startCraft(once, "r1", "tools");
        expect(twice.resources).toEqual(once.resources);
        expect(twice.residents).toEqual(once.residents);
    });
});

describe("D4 expeditions", () => {
    it("rewards are applied exactly once", () => {
        const state = rules.departExpedition(colony({}, [{}]), "r1", "crystal-cave", "j1");
        expect(rules.statusOf(state.residents[0])).toBe("expedition");
        const done = rules.completeExpedition(state, "j1", success({stone: 8}));
        expect(done.resources.stone).toBe(state.resources.stone + 8);
        expect(rules.completeExpedition(done, "j1", success({stone: 8}))).toBe(done);
    });

    it("a failed trip awards nothing and frees the traveller", () => {
        const state = rules.departExpedition(colony({}, [{}]), "r1", "blocked-pass", "j1");
        const failed = rules.failExpedition(state, "j1", "Rockfall.");
        expect(failed.resources).toEqual(state.resources);
        expect(rules.isAvailable(failed.residents[0])).toBe(true);
    });

    it("a busy resident cannot depart twice, and the day tick does not end a trip", () => {
        const away = rules.departExpedition(colony({}, [{}]), "r1", "old-mine", "j1");
        const again = rules.departExpedition(away, "r1", "old-mine", "j2");
        expect(rules.isJourneyActive(again, "j2")).toBe(false);
        expect(rules.isJourneyActive(rules.advanceDay(again), "j1")).toBe(true);
    });

    it("the tool stays with the traveller", () => {
        const away = rules.departExpedition(colony({}, [{tool: true}]), "r1", "old-mine", "j1");
        expect(rules.toggleTool(away, "r1")).toBe(away);
    });
});

describe("D6 the goblin", () => {
    it("joins once after the first successful Old Mine trip", () => {
        let state = rules.departExpedition(colony({}, [{}]), "r1", "old-mine", "j1");
        state = rules.completeExpedition(state, "j1", success({stone: 12}));
        expect(state.residents.filter((resident) => resident.species === "goblin")).toHaveLength(1);
        state = rules.departExpedition(state, "r1", "old-mine", "j2");
        state = rules.completeExpedition(state, "j2", success({stone: 12}));
        expect(state.residents.filter((resident) => resident.species === "goblin")).toHaveLength(1);
    });

    it("does not join after a failed trip", () => {
        const state = rules.departExpedition(colony({}, [{}]), "r1", "old-mine", "j1");
        expect(rules.failExpedition(state, "j1", "x").flags.goblinJoined).toBe(false);
    });

    it("farms 6, refuses mining, and cannot forge tools", () => {
        const state = colony({resources: resources({wood: 9, stone: 9, food: 9})}, [{species: "goblin", assignment: "farming"}]);
        expect(rules.dailyOutput(state.residents[0])).toEqual({food: 6});
        expect(rules.assign(state, "r1", "mining").residents[0].assignment).toBe("farming");
        expect(rules.startCraft(state, "r1", "tools").resources).toEqual(state.resources);
        expect(rules.statusOf(rules.startCraft(state, "r1", "weapons").residents[0])).toBe("crafting");
    });
});

describe("D7 raids", () => {
    const raided = (weapons: number) => {
        const state = rules.departExpedition(colony({resources: resources({wood: 10, stone: 7, food: 5, tools: 3, weapons})}, [{}]), "r1", "howling-gulch", "j1");
        return rules.completeExpedition(state, "j1", success({wood: 6, food: 6}, {name: "gnoll war-band"}));
    };

    it("enough weapons defend, and one weapon breaks", () => {
        const next = raided(RAID_DEFENSE_THRESHOLD);
        expect(next.lastRaid?.outcome).toBe("defended");
        expect(next.resources).toMatchObject({wood: 16, food: 11, weapons: RAID_DEFENSE_THRESHOLD - 1});
    });

    it("too few weapons: half of wood, stone, food and tools is looted (rounded down)", () => {
        const next = raided(1);
        expect(next.lastRaid?.outcome).toBe("looted");
        expect(next.lastRaid?.loot).toEqual({wood: 8, stone: 3, food: 5, tools: 1});
        expect(next.resources).toMatchObject({wood: 8, stone: 4, food: 6, tools: 2, weapons: 1});
    });

    it("a failed request never triggers a raid", () => {
        const state = rules.departExpedition(colony({}, [{}]), "r1", "howling-gulch", "j1");
        expect(rules.failExpedition(state, "j1", "x").lastRaid).toBeNull();
    });
});
