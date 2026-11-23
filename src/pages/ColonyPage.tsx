import {useState} from "react";
import {Chronicle} from "../components/Chronicle";
import {ResidentRoster} from "../components/ResidentRoster";
import {
    DESTINATIONS,
    destinationLabel,
    FOOD_PER_RESIDENT,
    JOB_LABEL,
    JOB_RESOURCE,
    JOBS,
    RAID_DEFENSE_COST,
    RAID_DEFENSE_THRESHOLD,
    RECRUIT_DESTINATION,
} from "../game/config";
import {describe, isAvailable} from "../game/rules";
import {useColony} from "../state/ColonyContext";
import type {DestinationId} from "../types";

const JOB_ICON = {woodcutting: "🌲", mining: "⛏️", farming: "🍄"} as const;

export function ColonyPage() {
    const {colony, forecast, gameOver, assign, toggleTool, sendExpedition, dismissRaid} = useColony();
    const [destination, setDestination] = useState<DestinationId>("crystal-cave");
    const [scoutId, setScoutId] = useState<string>("");

    const availableScouts = colony.residents.filter(isAvailable);
    // Fall back to the first available resident if the chosen one became busy.
    const scout = availableScouts.find((resident) => resident.id === scoutId) ?? availableScouts.at(0);
    const travellers = colony.residents.filter((resident) => resident.task?.kind === "expedition");
    const selectedDestination = DESTINATIONS.find((item) => item.id === destination);
    const raid = colony.lastRaid;

    return (
        <div className="dashboard">
            <ResidentRoster
                residents={colony.residents}
                toolsAvailable={colony.resources.tools}
                onAssign={assign}
                onToggleTool={toggleTool}
            />

            <section className="center-stack">
                {raid && (
                    <section className={`panel raid-report ${raid.outcome}`} role="status">
                        <header>
                            <div>
                                <small>RAID ON DAY {raid.day}</small>
                                <h2>{raid.outcome === "defended" ? "Stonehome held the gate" : "Stonehome was looted"}</h2>
                            </div>
                            <button onClick={dismissRaid}>Dismiss</button>
                        </header>
                        <p>
                            A {raid.attackers} followed the scout home. Stonehome had {raid.weaponsBefore} weapon(s);
                            {" "}{RAID_DEFENSE_THRESHOLD} are needed to defend.
                        </p>
                        <p>
                            {raid.outcome === "defended"
                                ? `The attackers were driven off. ${raid.weaponsLost} weapon broke in the fight.`
                                : `They carried off ${describe(raid.loot) || "nothing worth taking"}.`}
                        </p>
                    </section>
                )}

                <section className="panel production">
                    <header>
                        <div>
                            <small>SHIFT LEDGER</small>
                            <h2>Tonight's Production</h2>
                        </div>
                        <span>busy residents and tools included</span>
                    </header>

                    <div className="job-grid">
                        {JOBS.map((job) => (
                            <article key={job}>
                                <b>{JOB_ICON[job]}</b>
                                <h3>{JOB_LABEL[job]}</h3>
                                <p>
                                    {colony.residents.filter((resident) => resident.assignment === job && isAvailable(resident)).length}
                                    {" "}working
                                </p>
                                <strong>+{forecast.production[JOB_RESOURCE[job]]} {JOB_RESOURCE[job]}</strong>
                            </article>
                        ))}
                    </div>

                    <div className="net-line">
                        <span>NET FOOD AFTER MEALS ({forecast.meals} eaten)</span>
                        <strong className={forecast.netFood >= 0 ? "gain" : "loss"}>
                            {forecast.netFood >= 0 ? "+" : ""}{forecast.netFood}
                        </strong>
                    </div>
                    <p className="rule-note">
                        Each resident at home eats {FOOD_PER_RESIDENT} food at dusk; travellers live off their packs.
                        If the stores run dry, unfed residents leave Stonehome, last in the roster first,
                        and return their tool to the stores.
                    </p>
                    {forecast.hungry.length > 0 && !gameOver && (
                        <p className="rule-note danger" role="alert">
                            Not enough food tonight: {forecast.hungry.map((resident) => resident.name).join(", ")} will leave
                            at dusk unless more food is farmed.
                        </p>
                    )}
                </section>
            </section>

            <aside className="side-stack">
                <section className="panel expedition">
                    <header>
                        <div>
                            <small>BEYOND THE GATE</small>
                            <h2>Expedition</h2>
                        </div>
                        <b>🗺️</b>
                    </header>

                    <label>
                        Scout
                        <select
                            value={scout?.id ?? ""}
                            disabled={!scout}
                            onChange={(event) => setScoutId(event.target.value)}
                        >
                            {availableScouts.length === 0 && <option value="">Nobody is free</option>}
                            {availableScouts.map((resident) => (
                                <option key={resident.id} value={resident.id}>{resident.name}</option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Destination
                        <select value={destination} onChange={(event) => setDestination(event.target.value as DestinationId)}>
                            {DESTINATIONS.map((item) => (
                                <option key={item.id} value={item.id}>{item.label}</option>
                            ))}
                        </select>
                    </label>
                    {selectedDestination && <p className="destination-hint">{selectedDestination.hint}</p>}

                    <button disabled={!scout || gameOver} onClick={() => scout && sendExpedition(scout.id, destination)}>
                        {scout ? `Send ${scout.name.split(" ")[0]}` : "Nobody is free"}
                    </button>

                    {travellers.length > 0 && (
                        <ul className="travellers">
                            {travellers.map((resident) => resident.task?.kind === "expedition" && (
                                <li key={resident.id}>
                                    {resident.name} → {destinationLabel(resident.task.destination)} (left day {resident.task.departedDay})
                                </li>
                            ))}
                        </ul>
                    )}
                    <p>
                        Travellers cannot work, forge or change tools until they return, and they keep their tool on the road.
                        A failed trip brings them home with nothing. If the page is reloaded mid-trip, they return empty-handed.
                    </p>
                    <p>
                        {colony.flags.goblinJoined
                            ? "A goblin has already joined from the Old Mine."
                            : `The first successful trip to ${destinationLabel(RECRUIT_DESTINATION)} may bring a new resident.`}
                        {" "}Raids: {RAID_DEFENSE_THRESHOLD}+ weapons defend (costs {RAID_DEFENSE_COST}), otherwise raiders take half of the stores.
                    </p>
                </section>

                <Chronicle activities={colony.chronicle}/>
            </aside>
        </div>
    );
}
