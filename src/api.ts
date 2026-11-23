import {EXPEDITION_TIMEOUT_MS} from "./game/config";
import type {DestinationId, ExpeditionResult} from "./types";

/**
 * Sends one expedition request. Rejects with a readable Error on HTTP errors,
 * network errors, or when no answer arrives within EXPEDITION_TIMEOUT_MS, so a
 * hanging request can never leave a traveller away forever.
 */
export async function beginExpedition(dwarfId: string, destination: DestinationId): Promise<ExpeditionResult> {
    let response: Response;
    try {
        response = await fetch("/api/expeditions", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({dwarfId, destination}),
            signal: AbortSignal.timeout(EXPEDITION_TIMEOUT_MS),
        });
    } catch (error) {
        if (error instanceof DOMException && error.name === "TimeoutError") {
            throw new Error("No word came back from beyond the gate.");
        }
        throw new Error("The road to the gate is unreachable.");
    }
    if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Expedition failed (${response.status}).`);
    }
    return response.json() as Promise<ExpeditionResult>;
}
