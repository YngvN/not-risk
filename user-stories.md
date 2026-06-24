# Risk — Game Development User Story Backlog
 
**Scope:** Digital implementation of the Risk base game with three play modes:
**Mode 1 — Classic Conquest**, **Mode 2 — Secret Mission**, **Mode 3 — Capital Risk**.
 
This backlog is written to be implementation-agnostic (works for a web, mobile, or desktop client with any engine). Stories are grouped into epics. The **Engine Foundation** epics (E0–E6) are shared by all three modes; the mode-specific epics (E7–E9) layer on top of them. A suggested build order is given at the end.
 
---
 
## How to read these stories
 
Each story uses the format:
 
> **As a** \<role\>, **I want** \<capability\>, **so that** \<benefit\>.
 
Followed by **Acceptance Criteria** (AC) in Given/When/Then form where useful, plus **Priority** (MoSCoW: Must / Should / Could), a rough **Estimate** (Fibonacci story points), and **Depends on**.
 
**Roles used:**
- **Player** — a human playing the game.
- **System** — the game engine/rules enforcement (used for technical stories with no direct player-facing surface).
- **Host** — the player who configures and starts a match.
---
 
## Epic E0 — Core Data Model & Board
 
Foundational structures every mode relies on. No mode is playable until these exist.
 
### E0.1 — Board topology
**As the** System, **I want** the 42 territories, 6 continents, and the adjacency graph represented as data, **so that** movement, attack legality, and continent bonuses can be computed.
 
**AC:**
- Given the board data is loaded, there are exactly 42 territories assigned across 6 continents (North America, South America, Europe, Africa, Asia, Australia).
- Adjacency is bidirectional and includes the canonical sea connections (e.g., Alaska–Kamchatka, Brazil–North Africa).
- Each continent exposes its army bonus value (NA 5, SA 2, EU 5, AF 3, AS 7, AU 2).
- The model is data-driven (loadable from a config file), not hardcoded in logic.
**Priority:** Must · **Estimate:** 5 · **Depends on:** —
 
### E0.2 — Player model
**As the** System, **I want** a player entity holding identity, color, owned territories, hand of cards, and elimination state, **so that** turn logic and win checks can query it.
 
**AC:**
- A player has: id, display name, color, alive/eliminated flag, list of owned territories, hand of cards, and a mode-specific data bag (mission card, captured HQ cards, etc.).
- Supports 2–6 players.
- Owned-territory count is derivable in O(1) or cheaply cached.
**Priority:** Must · **Estimate:** 3 · **Depends on:** E0.1
 
### E0.3 — Game state & turn/phase state machine
**As the** System, **I want** an explicit state machine for game phases, **so that** only legal actions are accepted at each point in a turn.
 
**AC:**
- Phases modeled: `SETUP → (per turn: REINFORCE → ATTACK → FORTIFY) → GAME_OVER`.
- The active player and current phase are always queryable.
- Any action submitted for the wrong phase or wrong player is rejected with a clear error, with no state mutation.
- Phase transitions are logged for replay/debugging.
**Priority:** Must · **Estimate:** 5 · **Depends on:** E0.2
 
### E0.4 — Action log / event sourcing
**As a** developer, **I want** every state change emitted as a discrete event, **so that** I can support undo (where allowed), replays, debugging, and networked sync.
 
**AC:**
- Every mutating action produces an immutable event with timestamp, actor, and payload.
- Game state can be rebuilt by replaying events from the initial state.
- Dice results are captured in events (so replays are deterministic).
**Priority:** Should · **Estimate:** 5 · **Depends on:** E0.3
 
---
 
## Epic E1 — Game Setup
 
Shared across all modes; mode-specific setup steps are added in E7–E9.
 
### E1.1 — Match configuration
**As a** Host, **I want** to choose the number of players, assign colors, and select the game mode, **so that** a match starts with the right rules and participants.
 
**AC:**
- Host selects 2–6 players and one mode (Classic / Secret Mission / Capital).
- Each player has a unique color.
- Invalid configs (e.g., 2 players on a mode that requires 3+) are blocked with an explanation. (Note: classic 2-player uses the neutral-army variant, which is out of scope here — see backlog notes.)
**Priority:** Must · **Estimate:** 3 · **Depends on:** E0.3
 
### E1.2 — Starting army allocation
**As the** System, **I want** to grant each player the correct number of starting armies based on player count, **so that** setup is balanced per the rules.
 
**AC:**
- Starting infantry: 3 players → 35 each; 4 → 30; 5 → 25; 6 → 20.
- The allocation is shown to each player before placement.
**Priority:** Must · **Estimate:** 2 · **Depends on:** E1.1
 
### E1.3 — Territory claim & initial placement
**As a** Player, **I want** to claim territories and place my starting armies, **so that** the board is fully occupied before play begins.
 
**AC:**
- Territories are distributed until all 42 are owned (support both "deal territory cards" and "take turns claiming one at a time" — configurable).
- After all territories are claimed, players take turns placing remaining armies one at a time onto territories they already own.
- A player may never place on a territory they don't own.
- Placement ends when all starting armies for all players are placed.
**Priority:** Must · **Estimate:** 5 · **Depends on:** E1.2
 
---
 
## Epic E2 — Reinforcement Phase
 
### E2.1 — Territory-count reinforcement
**As a** Player, **I want** to receive armies based on how many territories I hold, **so that** controlling more land is rewarded.
 
**AC:**
- Reinforcements = floor(owned territories ÷ 3), minimum 3.
- Recomputed at the start of each of the player's reinforcement phases.
**Priority:** Must · **Estimate:** 2 · **Depends on:** E0.3
 
### E2.2 — Continent control bonus
**As a** Player, **I want** bonus armies for fully controlling a continent, **so that** holding regions is strategically valuable.
 
**AC:**
- For each continent where the player owns every territory, add that continent's bonus (NA 5, SA 2, EU 5, AF 3, AS 7, AU 2).
- Bonuses stack across multiple fully-held continents.
- Losing a single territory in a continent removes that bonus next reinforcement.
**Priority:** Must · **Estimate:** 3 · **Depends on:** E2.1
 
### E2.3 — Army placement
**As a** Player, **I want** to distribute my reinforcement pool onto my territories, **so that** I can shape my offense and defense.
 
**AC:**
- Armies may only be placed on owned territories.
- The player cannot leave the reinforcement phase until the entire pool is placed.
- Placement is undoable within the phase (before confirming end of phase), if undo is enabled.
**Priority:** Must · **Estimate:** 3 · **Depends on:** E2.1, E5 (card pool may add to total)
 
---
 
## Epic E3 — Attack Phase
 
### E3.1 — Attack declaration & validation
**As a** Player, **I want** to attack an adjacent enemy territory from one of my own, **so that** I can expand and eliminate opponents.
 
**AC:**
- An attack is legal only if: attacker territory is owned by the player, target is adjacent, target is owned by a different player, and the attacker territory has ≥ 2 armies.
- The attacker chooses how many dice to roll: 1–3, never more than (attacking territory armies − 1).
- Illegal attacks are rejected without state change.
**Priority:** Must · **Estimate:** 5 · **Depends on:** E0.3
 
### E3.2 — Dice resolution
**As a** Player, **I want** combat resolved by dice with the correct comparison rules, **so that** outcomes match the physical game.
 
**AC:**
- Attacker rolls 1–3 dice (≤ attacking armies − 1, max 3). Defender rolls 1–2 dice (≤ defending armies, max 2).
- Dice are sorted descending on each side; highest-vs-highest and second-highest-vs-second-highest are compared.
- **Defender wins ties.**
- For each comparison, the loser removes one army from the contested territory.
- Dice values are recorded in the event log (E0.4).
**Priority:** Must · **Estimate:** 5 · **Depends on:** E3.1
 
### E3.3 — Territory capture & occupation
**As a** Player, **I want** to occupy a territory when I reduce its defenders to zero, **so that** I take control of it.
 
**AC:**
- When defending armies hit 0, the attacker captures the territory.
- The attacker must move in at least the number of dice rolled in the deciding battle, and may move up to (attacking armies − 1).
- At least 1 army must remain on the originating territory.
- Ownership transfers; continent bonuses recompute accordingly.
**Priority:** Must · **Estimate:** 5 · **Depends on:** E3.2
 
### E3.4 — Continue or end attack phase
**As a** Player, **I want** to make as many attacks as I wish during my turn, **so that** I can press an advantage.
 
**AC:**
- After resolving an attack, the player may declare another legal attack or end the phase.
- Ending the attack phase advances the state machine to Fortify.
**Priority:** Must · **Estimate:** 2 · **Depends on:** E3.3
 
### E3.5 — Conquest card award
**As a** Player, **I want** to earn one Risk card if I captured at least one territory this turn, **so that** I'm rewarded for aggression.
 
**AC:**
- A per-turn "captured ≥ 1 territory" flag is set on the first capture.
- At end of turn, if the flag is set, the player draws exactly one card (regardless of number of captures).
- Flag resets each turn.
**Priority:** Must · **Estimate:** 2 · **Depends on:** E3.3, E5.1
 
### E3.6 — Player elimination & card inheritance
**As a** Player, **I want** to eliminate an opponent by taking their last territory and inherit their cards, **so that** removing rivals is rewarded.
 
**AC:**
- A player owning 0 territories is marked eliminated and skipped in future turns.
- The eliminating player receives all of the eliminated player's Risk cards.
- If inheritance brings the eliminator's hand to ≥ 6 cards, they must immediately trade in sets until holding ≤ 4 (see E5.3), even mid-attack-phase.
- Eliminating the second-to-last opponent (Classic) triggers the win check (E6).
**Priority:** Must · **Estimate:** 5 · **Depends on:** E3.3, E5.3
 
---
 
## Epic E4 — Fortify Phase
 
### E4.1 — Fortify movement
**As a** Player, **I want** to move armies once between two of my connected territories, **so that** I can reposition for defense.
 
**AC:**
- One fortify move per turn.
- Source and destination are both owned and connected by an unbroken chain of owned territories (configurable rule: "connected chain" vs. "adjacent only").
- The source must retain at least 1 army.
- Completing or skipping the move ends the turn and passes to the next living player's reinforcement phase.
**Priority:** Must · **Estimate:** 5 · **Depends on:** E0.3
 
---
 
## Epic E5 — Risk Card System
 
Shared by all modes (the 12 mission cards are only dealt in Mode 2).
 
### E5.1 — Deck composition & draw
**As the** System, **I want** a correctly composed deck and a draw mechanism, **so that** card rewards work.
 
**AC:**
- Deck = 42 territory cards (each tagged Infantry / Cavalry / Artillery and a territory) + 2 wild cards. (The 12 mission cards are a separate deck used only in Mode 2.)
- Drawing pulls from the top of a shuffled draw pile.
- When the draw pile empties, the discard pile is reshuffled into it.
**Priority:** Must · **Estimate:** 3 · **Depends on:** E0.1
 
### E5.2 — Set detection
**As the** System, **I want** to detect valid card sets in a hand, **so that** trade-ins can be validated and suggested.
 
**AC:**
- Valid sets: 3 of the same symbol; 1 of each of the 3 symbols; any 2 + 1 wild.
- The system can enumerate all valid sets in a hand and flag whether at least one exists.
**Priority:** Must · **Estimate:** 3 · **Depends on:** E5.1
 
### E5.3 — Trade-in & escalating value
**As a** Player, **I want** to trade in a set for bonus armies during reinforcement, **so that** collecting cards pays off.
 
**AC:**
- A global "sets traded so far" counter drives the value: 1st = 4, 2nd = 6, 3rd = 8, 4th = 10, 5th = 12, 6th = 15, then +5 per set thereafter.
- The counter is shared across all players (it reflects total sets turned in during the game).
- **Mandatory trade-in:** if a player starts their turn (or, via inheritance, reaches) 5+ cards, they must trade until below the threshold (≤ 4 after trading; must trade at 5–6).
- Traded cards return to the discard pile.
**Priority:** Must · **Estimate:** 5 · **Depends on:** E5.2
 
### E5.4 — Occupied-territory bonus
**As a** Player, **I want** 2 extra armies when a traded card matches a territory I occupy, **so that** holding pictured territories is rewarded.
 
**AC:**
- If any card in the traded set depicts a territory the player currently occupies, they may choose one such territory to receive +2 armies, placed directly on it.
- Maximum +2 from this rule per trade-in, regardless of how many cards match.
**Priority:** Should · **Estimate:** 3 · **Depends on:** E5.3
 
---
 
## Epic E6 — Win Condition Framework
 
### E6.1 — Pluggable victory check
**As a** developer, **I want** the victory condition to be a strategy injected per mode, **so that** the same engine supports all three modes without branching logic everywhere.
 
**AC:**
- A `VictoryCondition` interface is evaluated after every state change that could end the game (capture, elimination, mission completion, HQ capture).
- Each mode supplies its own implementation.
- The first satisfied condition transitions the state machine to `GAME_OVER` and records the winner.
**Priority:** Must · **Estimate:** 5 · **Depends on:** E0.3
 
### E6.2 — Classic Conquest victory (Mode 1)
**As a** Player, **I want** to win by controlling all 42 territories, **so that** total domination ends the game.
 
**AC:**
- Victory triggers the moment one player owns all 42 territories (equivalently, all others eliminated).
- The check runs after each capture/elimination.
**Priority:** Must · **Estimate:** 2 · **Depends on:** E6.1
 
---
 
## Epic E7 — Mode 2: Secret Mission
 
Builds on the full engine (E0–E6). Adds the mission deck and a mode-specific victory condition.
 
### E7.1 — Deal secret missions
**As a** Player, **I want** to receive one hidden mission at setup, **so that** I have a private objective.
 
**AC:**
- After standard setup (E1), shuffle the 12 mission cards and deal one face-down to each player; remainder returned to the box.
- If fewer than 5 players, remove "destroy player of color X" missions whose color isn't in play before dealing.
- A player's mission is visible only to them.
**Priority:** Must · **Estimate:** 3 · **Depends on:** E1.3
 
### E7.2 — Mission model & evaluation
**As the** System, **I want** each mission type expressed as an evaluable predicate over game state, **so that** completion can be detected automatically.
 
**AC:**
- Supported mission types:
  - Conquer two named continents.
  - Conquer two named continents + any one more of the player's choice.
  - Conquer any two non-adjacent continents.
  - Hold 18 territories, each with ≥ 2 armies.
  - Hold 24 territories (any army count).
  - Destroy a specific colored player.
- Continent-pair missions require holding **every** territory of both continents simultaneously.
- Each predicate is pure (state in → boolean out) for testability.
**Priority:** Must · **Estimate:** 8 · **Depends on:** E7.1, E6.1
 
### E7.3 — "Destroy a player" resolution
**As a** Player whose mission is to destroy a color, **I want** my mission satisfied the moment that player is eliminated by anyone, **so that** the rule matches the physical game.
 
**AC:**
- The mission is satisfied as soon as the target player is eliminated — regardless of who delivered the final blow.
- The mission holder may declare/reveal and win on their following turn even if another player did the eliminating. (Configurable: "win only on your own turn" vs. "win immediately"; default to "your own turn" to avoid simultaneous-win edge cases.)
- There is **no** fallback to world conquest if the target is already gone.
- (Optional house-rule toggle: if the mission holder *is* the targeted color, substitute a "hold 24 territories" objective.)
**Priority:** Must · **Estimate:** 3 · **Depends on:** E7.2
 
### E7.4 — Secret Mission victory condition
**As a** Player, **I want** to win immediately upon completing my mission, **so that** the game can end short of full conquest.
 
**AC:**
- The mode's `VictoryCondition` evaluates the active player's mission predicate at the legal check point (default: their own turn; plus the elimination trigger for "destroy a player").
- On satisfaction, the mission is revealed for verification and the game ends with that player as winner.
**Priority:** Must · **Estimate:** 3 · **Depends on:** E7.2, E6.1
 
---
 
## Epic E8 — Mode 3: Capital Risk
 
Builds on the full engine (E0–E6). Uses Headquarters (HQ) instead of full conquest.
 
### E8.1 — Headquarters selection & simultaneous reveal
**As a** Player, **I want** to secretly pick one of my territories as my HQ, then reveal with everyone at once, **so that** the mode starts fairly.
 
**AC:**
- After standard setup, each player selects one owned territory as HQ and places the matching territory card face-down.
- Once all players have chosen, all HQ choices are revealed simultaneously.
- HQ status is tracked per player and tied to a specific territory + its territory card.
**Priority:** Must · **Estimate:** 5 · **Depends on:** E1.3
 
### E8.2 — HQ card excluded from sets
**As the** System, **I want** an HQ's territory card kept out of trade-in sets, **so that** trade-in math matches the rules.
 
**AC:**
- A card representing a player's current HQ cannot be selected as part of a tradeable set.
- Set detection (E5.2) excludes HQ cards from the player's tradeable hand.
**Priority:** Must · **Estimate:** 3 · **Depends on:** E5.2, E8.1
 
### E8.3 — HQ capture & retained play
**As a** Player, **I want** capturing an enemy HQ to be tracked, and losing my own HQ to NOT eliminate me, **so that** the mode plays as designed.
 
**AC:**
- When a player captures a territory that is another player's HQ, they take that HQ card as proof and the capture is recorded against the win condition.
- The player who lost their HQ is **not** eliminated by that event alone; they continue playing.
- (A player can still be fully eliminated by losing all territories per E3.6.)
**Priority:** Must · **Estimate:** 5 · **Depends on:** E3.3, E8.1
 
### E8.4 — Capital victory condition (thresholds by player count)
**As a** Player, **I want** to win by capturing the required number of enemy HQs while holding my own, **so that** the shortened game ends correctly.
 
**AC:**
- Required captures: 3 players → both opposing HQs; 4 → any 2; 5 or 6 → any 3.
- Victory requires the player to **still control their own HQ territory** at the moment of the check.
- The mode's `VictoryCondition` evaluates after each HQ capture.
**Priority:** Must · **Estimate:** 5 · **Depends on:** E8.3, E6.1
 
---
 
## Epic E9 — Cross-Cutting & Non-Functional
 
### E9.1 — Turn/phase UI surfacing
**As a** Player, **I want** clear indication of whose turn it is, the current phase, and my legal actions, **so that** I always know what I can do.
 
**AC:**
- Active player, phase, reinforcement pool, and available actions are always visible.
- Illegal targets are visually disabled rather than erroring on click.
**Priority:** Must · **Estimate:** 5 · **Depends on:** E0.3
 
### E9.2 — Save / load & resume
**As a** Player, **I want** to save and resume a match, **so that** long games survive interruptions.
 
**AC:**
- Full game state (or the event log from E0.4) can be serialized and restored deterministically, including each player's hidden data (missions, face-down HQ).
**Priority:** Should · **Estimate:** 5 · **Depends on:** E0.4
 
### E9.3 — Hidden-information integrity
**As a** Player, **I want** my mission and pre-reveal HQ kept hidden from opponents, **so that** secret modes are fair.
 
**AC:**
- In networked play, hidden state is never sent to clients that shouldn't see it (server-authoritative).
- In hotseat/local play, hidden info is gated behind a "pass device" screen.
**Priority:** Must (for Modes 2–3) · **Estimate:** 5 · **Depends on:** E7.1, E8.1
 
### E9.4 — Deterministic, auditable dice
**As a** Player, **I want** dice to be provably fair, **so that** I trust combat outcomes.
 
**AC:**
- RNG is seeded and the seed/result is logged (E0.4); replays reproduce identical rolls.
- (Optional: server-side roll with client-visible verification for online play.)
**Priority:** Should · **Estimate:** 3 · **Depends on:** E0.4, E3.2
 
### E9.5 — Rules-config surface
**As a** Host, **I want** to toggle the documented rule variations, **so that** groups can play their preferred ruleset.
 
**AC:**
- Configurable toggles: fortify "connected chain" vs "adjacent only"; mission "win on own turn" vs "win immediately"; (future) house-rule add-ons.
- Defaults match the official rulebook.
**Priority:** Could · **Estimate:** 3 · **Depends on:** E4.1, E7.3
 
---
 
## Suggested build order
 
1. **Vertical slice of Mode 1 first.** Implement E0 → E1 → E2 → E3 → E4 → E5 → E6.1/E6.2. This yields a fully playable Classic Conquest game and exercises the whole engine.
2. **Harden the engine** with E0.4 (event log), E9.1 (turn UI), and E9.4 (auditable dice).
3. **Layer Mode 2 (Secret Mission)** via E7. The only genuinely new logic is the mission deck and predicate evaluation; everything else reuses the engine.
4. **Layer Mode 3 (Capital Risk)** via E8. New logic is HQ selection/reveal, HQ-aware capture, and the threshold victory condition.
5. **Polish & fairness** with E9.2, E9.3, E9.5.
## Dependency summary (critical path)
 
```
E0.1 → E0.2 → E0.3 → E1.1 → E1.2 → E1.3 → E2 → E3 → E4 → E5 → E6.1 → E6.2  (Mode 1 playable)
                                   E6.1 → E7 (Mode 2)
                                   E6.1 → E8 (Mode 3)
```