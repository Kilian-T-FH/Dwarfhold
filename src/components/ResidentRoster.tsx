import {destinationLabel, ITEM_LABEL, JOB_LABEL, JOB_RESOURCE, JOBS, SPECIES, TOOL_BONUS} from "../game/config";
import {isAvailable, isHome, statusOf} from "../game/rules";
import type {JobType, Resident} from "../types";

interface Props {
    residents: Resident[];
    toolsAvailable: number;
    onAssign: (id: string, job: JobType) => void;
    onToggleTool: (id: string) => void;
}

function busyNote(resident: Resident): string | null {
    if (resident.task?.kind === "craft") {
        return `Forging a ${ITEM_LABEL[resident.task.item]} until day ${resident.task.readyDay}. Job paused.`;
    }
    if (resident.task?.kind === "expedition") {
        return `Travelling to ${destinationLabel(resident.task.destination)}. Tool stays with them.`;
    }
    return null;
}

export function ResidentRoster({residents, toolsAvailable, onAssign, onToggleTool}: Props) {
    const present = residents.filter(isHome).length;

    return (
        <section className="panel roster">
            <header>
                <div>
                    <small>THE COMPANY</small>
                    <h2>Holdfolk</h2>
                </div>
                <span>{present} / {residents.length} present</span>
            </header>

            <div className="dwarf-list">
                {residents.map((resident) => {
                    const species = SPECIES[resident.species];
                    const status = statusOf(resident);
                    const busy = busyNote(resident);
                    const specialty = resident.specialty ? `Skilled in ${JOB_LABEL[resident.specialty]}` : species.label;

                    return (
                        <article className={`dwarf ${resident.species}${isHome(resident) ? "" : " away"}`} key={resident.id}>
                            <div className="portrait">
                                {resident.icon}
                                <i className={status}/>
                            </div>

                            <div className="dwarf-details">
                                <h3>
                                    {resident.name}
                                    <em className={`species-badge ${resident.species}`}>{species.label}</em>
                                </h3>
                                <p>{resident.title} · {specialty}</p>

                                <select
                                    value={resident.assignment ?? ""}
                                    disabled={!isAvailable(resident)}
                                    aria-label={`Job for ${resident.name}`}
                                    onChange={(event) => onAssign(resident.id, (event.target.value || null) as JobType)}
                                >
                                    <option value="">Unassigned</option>
                                    {JOBS.map((job) => {
                                        const base = species.production[job];
                                        const bonus = resident.tool ? TOOL_BONUS : 0;
                                        return (
                                            <option value={job} key={job} disabled={base === undefined}>
                                                {base === undefined
                                                    ? `${JOB_LABEL[job]} (refuses)`
                                                    : `${JOB_LABEL[job]} (+${base + bonus} ${JOB_RESOURCE[job]}/day)`}
                                            </option>
                                        );
                                    })}
                                </select>
                                <label className="tool-toggle">
                                    <input
                                        type="checkbox"
                                        checked={resident.tool}
                                        disabled={!isHome(resident) || (!resident.tool && toolsAvailable === 0)}
                                        onChange={() => onToggleTool(resident.id)}
                                    />
                                    <span>{resident.tool ? `Carrying tool (+${TOOL_BONUS}/day)` : "Equip tool"}</span>
                                </label>
                                {busy && <p className="busy-note">{busy}</p>}
                            </div>

                            <span className="status">{status}</span>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}
