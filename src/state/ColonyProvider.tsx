import {useEffect, useRef, useState, type ReactNode} from "react";
import {beginExpedition} from "../api";
import {advanceDay, jobLabel} from "../simulation";
import type {
    Activity,
    ColonyState,
    JobType,
    ResourceKey,
} from "../types";
import {ColonyContext, type ColonyContextValue} from "./ColonyContext";

const initialState: ColonyState = {
    day: 12,
    resources: {
        wood: 14,
        stone: 9,
        food: 18,
        tools: 1,
        weapons: 0
    },
    dwarves: [
        {
            id: "dwarf-1",
            name: "Bromli Copperkeg",
            title: "Hold Warden",
            icon: "🧔🏻",
            assignment: "mining",
            status: "working",
            specialty: "mining",
            tool: false
        },
        {
            id: "dwarf-2",
            name: "Yrsa Flintbraid",
            title: "Trail Scout",
            icon: "🧔🏼‍♀️",
            assignment: "woodcutting",
            status: "working",
            specialty: "woodcutting",
            tool: false
        },
        {
            id: "dwarf-3",
            name: "Dori Ashmantle",
            title: "Stone Singer",
            icon: "🧔🏽",
            assignment: null,
            status: "idle",
            tool: false
        },
    ],
};

const initialActivities: Activity[] = [
    {
        id: "welcome",
        day: 12,
        message: "The forge fires are lit. Stonehome wakes.",
    },
];

export function ColonyProvider({children}: { children: ReactNode }) {
    const [colony, setColony] = useState(initialState);
    const [paused, setPaused] = useState(false);
    const [expeditionPending, setExpeditionPending] = useState(false);
    const [activities, setActivities] = useState<Activity[]>(initialActivities);

    // The hold falls once every dwarf has starved; the clock stays stopped until restart.
    const gameOver = colony.dwarves.length === 0;

    useEffect(() => {
        if (paused || gameOver) return;

        const timer = window.setInterval(
            () => {
                setColony((current) => advanceDay(current));
                setExpeditionPending(false);
            },
            8_000,
        );

        return () => window.clearInterval(timer);
    }, [paused, gameOver]);

    function restart() {
        setColony(initialState);
        setActivities(initialActivities);
        setPaused(false);
        setExpeditionPending(false);
    }

    // Dwarves only leave the roster by starving, so report anyone who disappeared.
    const previousDwarves = useRef(colony.dwarves);
    useEffect(() => {
        const starved = previousDwarves.current.filter(
            (dwarf) => !colony.dwarves.some((item) => item.id === dwarf.id),
        );
        previousDwarves.current = colony.dwarves;
        if (starved.length === 0) return;

        setActivities((current) =>
            [
                ...starved.map((dwarf) => ({
                    id: crypto.randomUUID(),
                    day: colony.day,
                    message: `${dwarf.name} starved and left Stonehome.`,
                    tone: "warning" as const,
                })),
                ...current,
            ].slice(0, 6),
        );
    }, [colony.dwarves, colony.day]);

    function assignDwarf(id: string, assignment: JobType) {
        setColony((current) => ({
            ...current,
            dwarves: current.dwarves.map((dwarf) =>
                dwarf.id === id
                    ? {
                        ...dwarf,
                        assignment,
                        status: assignment ? "working" : "idle",
                    }
                    : dwarf,
            ),
        }));

        const dwarf = colony.dwarves.find((item) => item.id === id);
        setActivities((current) =>
            [
                {
                    id: crypto.randomUUID(),
                    day: colony.day,
                    message: `${dwarf?.name ?? "A dwarf"} assigned to ${jobLabel(assignment)}.`,
                },
                ...current,
            ].slice(0, 6),
        );
    }

    function toggleTool(id: string) {
        setColony((current) => {
            const dwarf = current.dwarves.find((item) => item.id === id);
            if (!dwarf || dwarf.status === "expedition") return current;
            // Taking a tool needs one in the stores; returning one always works.
            if (!dwarf.tool && current.resources.tools === 0) return current;

            return {
                ...current,
                resources: {
                    ...current.resources,
                    tools: current.resources.tools + (dwarf.tool ? 1 : -1),
                },
                dwarves: current.dwarves.map((item) =>
                    item.id === id ? {...item, tool: !item.tool} : item,
                ),
            };
        });
    }

    function craftTool() {
        if (colony.resources.wood < 3) {
            setActivities((current) => [
                {
                    id: crypto.randomUUID(),
                    day: colony.day,
                    message: "The forge needs more timber.",
                    tone: "warning" as const,
                },
                ...current,
            ]);
            return;
        }

        if (colony.resources.stone < 2) {
            setActivities((current) => [
                {
                    id: crypto.randomUUID(),
                    day: colony.day,
                    message: "The forge needs more stone.",
                    tone: "warning" as const,
                },
                ...current,
            ]);
            return;
        }

        setColony((current) => ({
            ...current,
            resources: {
                ...current.resources,
                wood: current.resources.wood - 3,
                stone: current.resources.stone - 2,
                tools: current.resources.tools + 1,
            },
        }));
        setActivities((current) =>
            [
                {
                    id: crypto.randomUUID(),
                    day: colony.day,
                    message: "A sturdy iron tool joins the stores.",
                    tone: "good" as const,
                },
                ...current,
            ].slice(0, 6),
        );
    }

    function craftWeapon(){
        if (colony.resources.wood < 2) {
            setActivities((current) => [
                {
                    id: crypto.randomUUID(),
                    day: colony.day,
                    message: "The forge needs more timber.",
                    tone: "warning" as const,
                },
                ...current,
            ]);
            return;
        }
        if (colony.resources.stone < 3) {
            setActivities((current) => [
                {
                    id: crypto.randomUUID(),
                    day: colony.day,
                    message: "The forge needs more stone.",
                    tone: "warning" as const,
                },
                ...current,
            ]);
            return;
        }

        setColony((current) => ({
            ...current,
            resources: {
                ...current.resources,
                wood: current.resources.wood - 2,
                stone: current.resources.stone - 3,
                weapons: current.resources.weapons + 1,
            },
        }));
        setActivities((current) =>
            [
                {
                    id: crypto.randomUUID(),
                    day: colony.day,
                    message: "A sturdy iron weapon joins the stores.",
                    tone: "good" as const,
                },
                ...current,
            ].slice(0, 6),
        );
        console.log(colony.resources.weapons);
    }

    async function sendExpedition(dwarfId: string, destination: string) {
        const dwarf = colony.dwarves.find((item) => item.id === dwarfId);
        if (!dwarf) return;
        setExpeditionPending(true);
        setColony((current) => ({
            ...current,
            dwarves: current.dwarves.map((item) =>
                item.id === dwarf.id ? {...item, status: "expedition"} : item,
            ),
        }));
        setActivities((current) => [
            {
                id: crypto.randomUUID(),
                day: colony.day,
                message: `${dwarf.name} departed for ${destination.replace("-", " ")}.`,
            },
            ...current,
        ]);

        try {
            const result = await beginExpedition(dwarf.id, destination);

            setColony((current) => ({
                ...current,
                resources: Object.entries(result.rewards).reduce(
                    (all, [key, amount]) => ({
                        ...all,
                        [key]: all[key as ResourceKey] + (amount ?? 0),
                    }),
                    current.resources,
                ),
                /*        dwarves: current.dwarves.map((item) =>
                          item.id === dwarf.id
                            ? {
                                ...item,
                                status: item.assignment ? "working" : "idle",
                              }
                            : item,
                        ),*/
            }));
            setActivities((current) =>
                [
                    {
                        id: result.expeditionId,
                        day: colony.day,
                        message: result.message,
                        tone: "good" as const,
                    },
                    ...current,
                ].slice(0, 6),
            );
        } catch (error) {
            setActivities((current) =>
                [
                    {
                        id: crypto.randomUUID(),
                        day: colony.day,
                        message:
                            error instanceof Error
                                ? error.message
                                : "The expedition was lost from view.",
                        tone: "warning" as const,
                    },
                    ...current,
                ].slice(0, 6),
            );
        }
        //setExpeditionPending(false);
    }


    const value: ColonyContextValue = {
        colony,
        paused,
        activities,
        expeditionPending,
        gameOver,
        togglePaused: () => setPaused((value) => !value),
        restart,
        assignDwarf,
        toggleTool,
        craftTool,
        craftWeapon,
        sendExpedition,
    };

    return <ColonyContext value={value}>{children}</ColonyContext>;
}
