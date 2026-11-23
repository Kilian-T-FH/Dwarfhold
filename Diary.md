# Dwarfhold (AWE-Exam) Development Diary

## Team 12: Kilian Teufl. Robert Resch
## Repo: https://github.com/Kilian-T-FH/Dwarfhold

### Organization
 - Git branch for each Task (D1 - D7)
 - Time-deferred development
 - 
### Parts

| Task |    Developer |
|------|-------------:|
| D1   | Kilian Teufl |
| D2   | Kilian Teufl |
| D3   |          TBA |
| D4   |          TBA |
| D5   |          TBA |
| D6   |          TBA |
| D7   |          TBA |

## Important Decisions
### D1
Food shortage consequences were open to be defined by the team. Added a function of Dwarfs starving if no food is
available. Added a GameOver function for a situation where no dwarves remain.

### D1 (follow-up fixes)
Status is derived from a resident's task, so a forging or travelling resident can never also work their job.
The Shift Ledger uses the same forecast function as the daily tick. The starvation rule is explained under the
ledger, and a warning names who will leave tonight. A resident who leaves returns their tool to the stores.

### D2
Weapon recipe: 2 wood + 3 stone. Weapons are a colony resource used for raid defense (D7).

### D3
Forging takes days: dwarves need 2 days for a tool and 3 for a weapon. Materials are taken at the start and the
smith pauses their job. Invalid attempts are rejected by a pure rule and add only a chronicle notice.

### D4
Each traveller holds a unique journey id. A result is applied only if a resident still holds that id, so rewards
apply exactly once. Failures and the 10-second client timeout bring the traveller home with nothing.
**Tool policy:** the tool stays with the traveller and cannot be swapped until they return.

### D5
The full state is saved to localStorage under a versioned envelope and validated on load; corrupt or
incompatible saves start a fresh colony with a chronicle notice. **Refresh policy:** forge tasks continue
(they are day-based); interrupted expeditions end empty-handed.

### D6
Grisk Mossfinger, a goblin, joins once after the first successful trip to The Old Mine. Goblins farm 6 food,
cut 2 wood, refuse Deep Mining, and forge weapons in 2 days but cannot forge tools. They eat, equip tools,
travel and are saved like everyone else.

### D7
Howling Gulch rewards 6 wood + 6 food, then a gnoll war-band attacks. With 3+ weapons Stonehome defends and
1 weapon breaks. Otherwise raiders take half (rounded down) of stored wood, stone, food and tools. Failed
requests never trigger a raid. The result shows in a raid report panel and the chronicle.

### Qualitative goals
1. **Consistency:** all rules are pure functions in `src/game/rules.ts`; the UI cannot write state directly.
   Evaluated by the Vitest suite (27 tests).
2. **Robustness:** network failures, timeouts, duplicate results and corrupt saves all end in a valid state.
3. **Transparency:** every rule that affects a decision (rates, costs, durations, thresholds) is shown in the UI.
4. **Maintainability:** tunable numbers live in one file, `src/game/config.ts`.

## AI Usage
Used Claude plan mode to help analyze the structure of the software, to find possible solutions not priorly
known or thought of. Bug-fixing and finding inconsistencies in the code.
Also used it for visual design.

## Final Reflection
### TODO
