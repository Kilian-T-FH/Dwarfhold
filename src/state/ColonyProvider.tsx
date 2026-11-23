import {useCallback, useEffect, useMemo, useRef, useState, type ReactNode} from "react";
import {beginExpedition} from "../api";
import {DAY_MS} from "../game/config";
import {clearStorage, loadFromStorage, saveToStorage} from "../game/persistence";
import * as rules from "../game/rules";
import type {ColonyState, CraftItem, DestinationId, JobType} from "../types";
import {ColonyContext, type ColonyContextValue} from "./ColonyContext";

/**
 * Owns the single colony state. Every change goes through `commit`, which runs
 * a pure rule against the *latest* state synchronously (via a ref). That means
 * a double click, a late network response and the day timer all see the same
 * up-to-date colony, with no stale closures.
 */
export function ColonyProvider({children}: { children: ReactNode }) {
    const [colony, setColony] = useState<ColonyState>(() => loadFromStorage().state);
    const [paused, setPaused] = useState(false);
    const latest = useRef(colony);

    const commit = useCallback((rule: (state: ColonyState) => ColonyState) => {
        const next = rule(latest.current);
        if (next !== latest.current) {
            latest.current = next;
            setColony(next);
        }
        return next;
    }, []);

    const gameOver = rules.isGameOver(colony);

    // Simulation clock: one day per DAY_MS while running.
    useEffect(() => {
        if (paused || gameOver) return;
        const timer = window.setInterval(() => commit(rules.advanceDay), DAY_MS);
        return () => window.clearInterval(timer);
    }, [paused, gameOver, commit]);

    // D5: persist every change.
    useEffect(() => saveToStorage(colony), [colony]);

    const sendExpedition = useCallback(async (residentId: string, destination: DestinationId) => {
        const journeyId = crypto.randomUUID();
        const after = commit((state) => rules.departExpedition(state, residentId, destination, journeyId));
        // Rejected departure (busy, unknown, game over): no request is sent.
        if (!rules.isJourneyActive(after, journeyId)) return;
        try {
            const result = await beginExpedition(residentId, destination);
            commit((state) => rules.completeExpedition(state, journeyId, result));
        } catch (error) {
            const reason = error instanceof Error ? error.message : "The expedition was lost from view.";
            commit((state) => rules.failExpedition(state, journeyId, reason));
        }
    }, [commit]);

    const value: ColonyContextValue = useMemo(() => ({
        colony,
        paused,
        gameOver,
        forecast: rules.forecast(colony),
        togglePaused: () => setPaused((current) => !current),
        restart: () => {
            clearStorage();
            commit(() => rules.createInitialState());
            setPaused(false);
        },
        assign: (id: string, job: JobType) => commit((state) => rules.assign(state, id, job)),
        toggleTool: (id: string) => commit((state) => rules.toggleTool(state, id)),
        startCraft: (smithId: string, item: CraftItem) => commit((state) => rules.startCraft(state, smithId, item)),
        sendExpedition,
        dismissRaid: () => commit(rules.dismissRaid),
    }), [colony, paused, gameOver, commit, sendExpedition]);

    return <ColonyContext value={value}>{children}</ColonyContext>;
}
