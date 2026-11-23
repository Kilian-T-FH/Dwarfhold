import {useState} from "react";
import {Chronicle} from "../components/Chronicle";
import {ITEM_LABEL, JOB_LABEL, RAID_DEFENSE_THRESHOLD, RECIPES, SPECIES} from "../game/config";
import {craftBlocker, isAvailable, statusOf} from "../game/rules";
import {useColony} from "../state/ColonyContext";
import type {CraftItem} from "../types";

const ITEM_ICON: Record<CraftItem, string> = {tools: "⚒️", weapons: "⚔️"};
const RESOURCE_ICON: Record<string, string> = {wood: "🌲", stone: "⛏️"};

const RECIPE_TEXT: Record<CraftItem, { title: string; purpose: string }> = {
    tools: {title: "Craft a tool", purpose: "Equip a resident for +1 output in their job."},
    weapons: {
        title: "Craft a weapon",
        purpose: `Stored for the colony. ${RAID_DEFENSE_THRESHOLD} or more weapons repel a raid.`,
    },
};

export function ForgePage() {
    const {colony, startCraft} = useColony();
    const {residents} = colony;
    // Page-local: the selection resets when leaving the forge.
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const selected = residents.find((resident) => resident.id === selectedId && isAvailable(resident));
    const smiths = residents.filter((resident) => resident.task?.kind === "craft");

    return (
        <div className="forge-layout">
            <div className="dwarf-list forge-dwarves">
                {residents.map((resident) => {
                    const busy = !isAvailable(resident);
                    const species = SPECIES[resident.species];
                    const skill = resident.specialty ? `Skilled in ${JOB_LABEL[resident.specialty]}` : species.label;
                    return (
                        <label
                            className={`dwarf ${resident.species}${busy ? " away" : ""}${resident.id === selected?.id ? " selected" : ""}`}
                            key={resident.id}
                        >
                            <input
                                type="radio"
                                name="forge-smith"
                                checked={resident.id === selected?.id}
                                disabled={busy}
                                onChange={() => setSelectedId(resident.id)}
                            />
                            <div className="portrait">
                                {resident.icon}
                                <i className={statusOf(resident)}/>
                            </div>
                            <div className="dwarf-details">
                                <h3>
                                    {resident.name}
                                    <em className={`species-badge ${resident.species}`}>{species.label}</em>
                                </h3>
                                <p>{resident.title} · {skill}</p>
                                <p className="forge-ability">{species.summary}</p>
                            </div>
                            <span className="status">{statusOf(resident)}</span>
                        </label>
                    );
                })}
            </div>

            <section className="panel forge">
                <div className="forge-head">
                    <small>EMBER FORGE</small>
                    <h2>Smith: {selected?.name ?? "choose a free resident"}</h2>
                    <p>Materials are taken when forging starts. The smith stops their job until the item is ready.</p>
                    {smiths.map((smith) => smith.task?.kind === "craft" && (
                        <p className="forge-smith" key={smith.id}>
                            {smith.name} is forging a {ITEM_LABEL[smith.task.item]}: ready at dusk of day {smith.task.readyDay}
                            {" "}({smith.task.readyDay - colony.day} day(s) left)
                        </p>
                    ))}
                </div>

                {(["tools", "weapons"] as CraftItem[]).map((item) => {
                    const blocker = craftBlocker(colony, selected, item);
                    const days = selected ? SPECIES[selected.species].craftDays[item] : undefined;
                    return (
                        <div className="recipe-card" key={item}>
                            <div>
                                <h3>{RECIPE_TEXT[item].title}</h3>
                                <p>{RECIPE_TEXT[item].purpose}</p>
                            </div>
                            <div className="recipe">
                                {Object.entries(RECIPES[item]).map(([key, amount], index) => (
                                    <span key={key}>{index > 0 && <i>+ </i>}{amount} {RESOURCE_ICON[key]}</span>
                                ))}
                                <i>→</i>
                                <span>1 {ITEM_ICON[item]}</span>
                                <button onClick={() => selected && startCraft(selected.id, item)} disabled={blocker !== null}>
                                    Forge {ITEM_LABEL[item]}{days ? ` (${days} days)` : ""}
                                </button>
                            </div>
                            {selected && blocker && <p className="forge-hint">{blocker}</p>}
                        </div>
                    );
                })}
            </section>

            <Chronicle activities={colony.chronicle}/>
        </div>
    );
}
