import type {ColonyState, JobType, Resources} from "./types";

export const production: Record<Exclude<JobType, null>, Partial<Resources>> = {
    woodcutting: {wood: 3}, mining: {stone: 2}, farming: {food: 4},
};

export function advanceDay(state: ColonyState): ColonyState {
    const resources = {...state.resources};

    state.dwarves.forEach((dwarf) => {
        if (!dwarf.assignment || dwarf.status === "expedition") return;
        const output = production[dwarf.assignment];

        Object.entries(output).forEach(([resource, amount]) => {
            resources[resource as keyof Resources] += amount ?? 0;
        });

    });

    // Meals: every dwarf eats one food. Anyone who can't be fed leaves Stonehome.
    const shortfall = Math.max(0, state.dwarves.length - resources.food);
    resources.food = Math.max(0, resources.food - state.dwarves.length);

    // Deterministic: meals go out in roster order, so the last `shortfall` dwarves go unfed.
    const remaining = state.dwarves.slice(0, state.dwarves.length - shortfall);

    // Travellers return at the end of the day and resume their assignment.
    const dwarves = remaining.map((dwarf) =>
        dwarf.status === "expedition"
            ? {...dwarf, status: dwarf.assignment ? "working" as const : "idle" as const}
            : dwarf,
    );

    return {...state, day: state.day + 1, resources, dwarves};
}

export const jobLabel = (job: JobType) => job ? ({
    woodcutting: "Woodcutting",
    mining: "Deep Mining",
    farming: "Mushroom Farm"
}[job]) : "Unassigned";
