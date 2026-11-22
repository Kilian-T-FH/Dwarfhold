import {useState} from "react";
import {Chronicle} from "../components/Chronicle";
import {useColony} from "../state/ColonyContext";
import {jobLabel} from "../simulation";
import type {JobType} from "../types";

export function ForgePage() {
    const {activities, craftTool, craftWeapon, colony} = useColony();
    const {dwarves} = colony;
    const presentDwarves = dwarves.filter(
        (dwarf) => dwarf.status !== "expedition",
    ).length;
    // Page-local: the selection resets when leaving the forge.
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const selectedDwarf = dwarves.find((dwarf) => dwarf.id === selectedId);

    return (


    <div className="forge-layout">

      <div className="dwarf-list forge-dwarves">
        {dwarves.map((dwarf) => {
          const isAway = dwarf.status === "expedition" || dwarf.status === "crafting";
          const specialty = dwarf.specialty
              ? `Skilled in ${jobLabel(dwarf.specialty)}`
              : "Generalist";

          const isSelected = dwarf.id === selectedDwarf?.id;

          return (
              <label
                  className={`dwarf${isAway ? " away" : ""}${isSelected ? " selected" : ""}`}
                  key={dwarf.id}
              >
                <input
                    type="radio"
                    name="forge-dwarf"
                    checked={isSelected}
                    disabled={isAway}
                    onChange={() => setSelectedId(dwarf.id)}
                />
                <div className="portrait">
                  {dwarf.icon}
                  <i className={dwarf.status} />
                </div>

                <div className="dwarf-details">
                  <h3>{dwarf.name}</h3>
                  <p>
                    {dwarf.title} · {specialty}
                  </p>
                </div>

                <span className="status">{dwarf.status}</span>
              </label>
          );
        })}
      </div>


        <section className="panel forge">
            <div>
                <small>EMBER FORGE</small>
                <h2>Craft a tool</h2>
                <p>Equip the hold for future work.</p>
                <p className="forge-smith">
                    Smith: {selectedDwarf?.name ?? "choose a dwarf"}
                </p>
                {dwarves.filter((dwarf) => dwarf.crafting).map((dwarf) => (
                    <p className="forge-smith" key={dwarf.id}>
                        {dwarf.name} is forging a {dwarf.crafting === "tools" ? "tool" : "weapon"}, ready on day {colony.day + 1}
                    </p>
                ))}
            </div>
            <div className="recipe">
                <span>3 🌲</span>
                <i>+</i>
                <span>2 ⛏️</span>
                <i>→</i>
                <span>1 ⚒️</span>
                <button
                    onClick={() => selectedDwarf && craftTool(selectedDwarf.id)}
                    disabled={!selectedDwarf || selectedDwarf.status === "crafting"}
                >
                    Forge tool
                </button>
            </div>
            <div>
                <small>EMBER FORGE</small>
                <h2>Craft a Weapon</h2>
                <p>Equip the hold for future work.</p>
            </div>
            <div className="recipe">
                <span>2 🌲</span>
                <i>+</i>
                <span>3 ⛏️</span>
                <i>→</i>
                <span>1 ⚔️</span>
                <button
                    onClick={() => selectedDwarf && craftWeapon(selectedDwarf.id)}
                    disabled={!selectedDwarf || selectedDwarf.status === "crafting"}
                >
                    Forge weapon
                </button>
            </div>
        </section>

        <Chronicle activities={activities}/>

    </div>
)
    ;
}
