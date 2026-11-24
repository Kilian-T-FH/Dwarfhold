import {describe, expect, it} from "vitest";
import {restore, serialize} from "./persistence";
import * as rules from "./rules";

describe("D5 save and restore", () => {
    it("round-trips the colony", () => {
        const state = rules.startCraft(rules.createInitialState(), "dwarf-3", "tools");
        const result = restore(serialize(state));
        expect(result.kind).toBe("restored");
        expect(result.state).toEqual(state);
    });

    it("keeps forge tasks but ends interrupted expeditions without rewards", () => {
        let state = rules.startCraft(rules.createInitialState(), "dwarf-3", "tools");
        state = rules.departExpedition(state, "dwarf-2", "crystal-cave", "j1");
        const result = restore(serialize(state));
        expect(result.state.residents.find((r) => r.id === "dwarf-3")?.task?.kind).toBe("craft");
        expect(result.state.residents.find((r) => r.id === "dwarf-2")?.task).toBeNull();
        expect(result.state.resources).toEqual(state.resources);
    });

    it.each([
        ["not JSON", "{oops"],
        ["wrong version", JSON.stringify({version: 1, state: rules.createInitialState()})],
        ["negative stone", serialize({...rules.createInitialState(), resources: {wood: 1, stone: -4, food: 1, tools: 0, weapons: 0}})],
        ["unknown species", serialize({...rules.createInitialState(), residents: [{...rules.GOBLIN, species: "orc" as never}]})],
    ])("falls back to a fresh colony when the save is %s", (_label, raw) => {
        const result = restore(raw);
        expect(result.kind).toBe("rejected");
        expect(result.state.residents).toHaveLength(3);
        expect(result.state.chronicle[0].tone).toBe("warning");
    });

    it("starts fresh with no save", () => {
        expect(restore(null).kind).toBe("empty");
    });
});
