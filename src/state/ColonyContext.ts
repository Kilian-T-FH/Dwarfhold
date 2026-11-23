import {createContext, useContext} from "react";
import type {Forecast} from "../game/rules";
import type {ColonyState, CraftItem, DestinationId, JobType} from "../types";

export interface ColonyContextValue {
    colony: ColonyState;
    paused: boolean;
    gameOver: boolean;
    forecast: Forecast;
    togglePaused: () => void;
    restart: () => void;
    assign: (id: string, job: JobType) => void;
    toggleTool: (id: string) => void;
    startCraft: (smithId: string, item: CraftItem) => void;
    sendExpedition: (residentId: string, destination: DestinationId) => Promise<void>;
    dismissRaid: () => void;
}

export const ColonyContext = createContext<ColonyContextValue | null>(null);

export function useColony(): ColonyContextValue {
    const context = useContext(ColonyContext);
    if (!context) throw new Error("useColony must be used inside <ColonyProvider>");
    return context;
}
