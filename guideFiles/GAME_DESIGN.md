# Game Design Specification — Dhamrai Life

## 1. Core fantasy

“Start with almost nothing in a recognizable Bangladesh town and build a life.” The player may choose a lawful livelihood, serve as a police officer, or follow a risky criminal path. The world is open-ended: the player is not forced to follow only the main story.

## 2. Core gameplay loop

1. Explore a neighbourhood and learn its roads, people and services.
2. Find work, transport passengers, accept missions or investigate opportunities.
3. Complete an activity and receive money, reputation, information or an item.
4. Pay expenses: fuel/energy, repair, food/rest if enabled, fines, rent or business costs.
5. Save, invest, improve a vehicle, buy an in-game plot or build a business.
6. Unlock new missions, routes, relationships and areas.
7. Experience consequences from time, choices, reputation and law systems.

## 3. Character selection

### 3.1 Rickshaw driver

- Intro: first day of work; access to a basic rented or owned pedal rickshaw.
- First mission chain: find passengers, learn fares/landmarks, deliver a passenger, resolve a fare disagreement and save toward ownership.
- Progression: better rickshaw, regular passenger contacts, stand reputation, later transport business.
- Design principle: this should be a complete and rewarding play style, not just a tutorial.

### 3.2 CNG driver

- Intro: lease or own a CNG auto-rickshaw with a daily income target.
- First mission chain: inspect vehicle, arrange fuel, take fares, navigate a congested junction and finish a shift.
- Progression: own CNG, improve condition, build a small fleet, hire drivers in later phases.

### 3.3 Police officer

- Intro: first patrol shift with a supervisor and basic duties.
- First mission chain: traffic observation, vehicle document conversation, resolve a fictional complaint and report an incident.
- Branches: honest officer, internal corruption investigation, or corrupt officer. Outcomes influence trust, risk and career progression.
- Do not portray real named officers or institutions as corrupt; all characters and incidents are fictional.

### 3.4 Dakat

- Intro: a fictional crew offers a risky first job.
- First mission chain: meet a contact, gather fictional mission information, choose a non-violent intimidation/stealth route or abandon the job, evade a search and face the consequences.
- Progression: crew trust, territory reputation and escalating law response.
- Avoid realistic real-world procedural instructions; keep missions abstract, authored and clearly fictional.

### 3.5 Chor

- Intro: a small theft opportunity and a personal reason for choosing the path.
- First mission chain: learn stealth controls, assess risk, decide to steal/return/avoid, escape or face arrest.
- Progression: stealth skill, fences/contacts, wanted level and redemption path.

## 4. Common player systems

- Health/injury only if it adds useful gameplay; avoid gratuitous detail.
- Stamina and movement speed with accessible settings.
- Inventory: cash, documents, mission items, tools and collected discoveries.
- Skills: driving, negotiation, mechanic knowledge, stealth, investigation, business management and local knowledge.
- Reputation: local trust, transport reputation, police attention and faction relationships kept as distinct values rather than one universal score.
- Journal: mission history, discoveries, transactions, property and incident record.

## 5. Vehicle gameplay

| Vehicle | Gameplay identity | Example activities |
|---|---|---|
| Pedal rickshaw | Slow, low running cost, human-powered | Passenger fares, short-distance routes, market errands |
| CNG auto-rickshaw | Flexible city/market transport | Fare routes, daily target, vehicle lease/ownership |
| Easy bike | Short local routes, battery/charge management | Local passenger trips, parcel delivery |
| Motorcycle | Quick and agile, higher risk/maintenance | Delivery, travel, time-limited missions |
| Private car | Comfort and storage, higher purchase/maintenance cost | Family errands, business travel, special jobs |
| Truck | Cargo capacity and restricted maneuverability | Goods delivery, construction materials, wholesale work |

Each vehicle has condition, energy/fuel, capacity and a tuning profile. Start with one fully playable vehicle, then reuse the vehicle interface for additional models.

## 6. Driving model

- Keyboard: W/Up accelerate, S/Down brake/reverse (context-sensitive), A/D steer, Space handbrake, E interact, F enter/exit vehicle.
- Vehicle feel differs by mass, wheelbase, top speed, steering and braking.
- Use arcade/semi-realistic physics: convincing acceleration, braking, suspension response and collision without requiring a full engineering simulation.
- Vehicle camera: third-person follow and first-person driver view; a vehicle may use a simple windshield/dash view.
- Road legality and traffic direction are authored in the road graph; do not assume every road's OSM one-way tag is complete.

## 7. Traffic and local life

- Main-road agents travel faster; market streets and alleys reduce speed and increase interaction density.
- Traffic composition is weighted by time, road type and neighbourhood: rickshaw, CNG, easy bike, motorcycle, car, truck, bus and pedestrians can be added as content expands.
- Include horns, rickshaw bells, engine loops, market ambience, birds, rain and distant announcements. Audio assets must be original or licensed.
- Avoid spawning traffic directly in front of the player. Use spawn buffers and safe route points.
- Congestion and near misses should be readable and avoid punishing low-end performance.

## 8. Police and bribery interaction

Example fictional dialogue tone:

- Police NPC: “এই যে ভাই, একটু দাঁড়ান। কাগজপত্র আছে?”
- Player: “স্যার, একটু দেখেন। কাগজটা ব্যাগে আছে।”
- Police NPC: “ঠিক আছে, আগে কাগজ দেখান।”

A different fictional branch may present a corrupt character asking for a small “চা-পানি” payment. Amounts such as ৳50, ৳100 or ৳200 are configuration examples, not factual guidance. Player choices can include refuse, show documentation, pay, request a formal fine or attempt to leave. Each choice has game consequences. Keep dialogue contextual; do not repeat a generic bribe interaction at every junction.

## 9. Economy design

### 9.1 Income

- Passenger fares and route bonuses.
- Delivery and cargo contracts.
- Employment shifts and police duty.
- Business revenue and rent.
- Mission rewards and discoveries.

### 9.2 Expenses

- Fuel/charging, repairs, vehicle rental/loan payments if enabled.
- Fines, legal fees or jail-related opportunity cost.
- Property purchase, construction, maintenance and staff wages.
- Shop stock and business running costs.

### 9.3 Economy rules

- Store whole taka as integer values.
- Every transaction gets an ID and a human-readable reason.
- Reward on mission completion must be idempotent: one mission completion ID can only pay once.
- UI should show cash and bank separately.
- Do not allow UI-only edits to balance.
- Tune prices from a single balance dataset and review playtest earnings/hour across all roles.

## 10. Property and empire

- Plot categories: roadside commercial, residential lane, village plot, workshop/garage and selected special plots.
- Each plot is a game-authored polygon or anchor with area class, access, zone, price band and build slots.
- Player can inspect, purchase, place a building template, upgrade, manage rent and sell under game rules.
- A business can begin as a small shop, repair garage, transport stand, rental house or goods depot.
- Employees, stock and daily operating costs are later systems; MVP can start with a simple passive/mission-linked business.
- Label all plot ownership as virtual/in-game. Never display an OSM building footprint as evidence of real land ownership.

## 11. Missions

### 11.1 Mission categories

- Main story role chain.
- Jobs and daily/shift activities.
- Passenger/cargo delivery.
- Police patrol and investigation.
- Stealth/crime/risk missions.
- Neighbourhood errands and relationship tasks.
- Heritage and exploration tasks.
- Business/property milestones.
- Random world events.

### 11.2 Mission data contract

Every mission definition should include:

```ts
interface MissionDefinition {
  id: string;
  titleBn: string;
  summaryBn: string;
  allowedRoles?: string[];
  prerequisites: MissionCondition[];
  startTrigger: MissionTrigger;
  objectives: MissionObjective[];
  branches: MissionBranch[];
  rewards: RewardDefinition[];
  failureConditions: MissionCondition[];
  repeatPolicy: "once" | "cooldown" | "repeatable";
  contentVersion: number;
}
```

Validate mission IDs and references at build time. Do not make mission state dependent on a localized display title.

## 12. Landmarks, heritage and educational content

Potential Dhamrai discovery content includes Yashomadhab Temple, Dhamrai metal craft/Rathkhola, Balia Zamindar Bari, Saitta banyan tree, Mahashakti Preran Kendra and other places listed by the official upazila tourism page. These are candidates; location, access, spelling, photographs, ownership and current status must be checked before release.

Dhamrai's bronze/copper craft and lost-wax technique is listed by Bangladesh's heritage portal. It is suitable for an educational mission involving an artisan workshop, craft vocabulary, process stages and a fictional order/delivery. Do not claim that all historical details in an NPC story are documented; include a source card for factual material.

Jahangirnagar University content belongs to the Savar extension. Build campus landmarks and hall names only after verifying current official university sources. Keep historical facts accurate and avoid inventing real campus incidents.

## 13. World events, time and weather

- Market activity, traffic mix, NPC schedules and selected services may vary by game time.
- Rain affects visibility, road appearance and selected handling parameters; it should not make controls frustrating.
- Weather events should be seeded/saved so that a reload does not unexpectedly reset a mission encounter.
- Offline accrual is capped and explicitly designed. Do not simulate every NPC for eight hours when the player closes the browser.

## 14. Accessibility and UX

- Key rebinding and sensitivity settings.
- Camera shake, motion blur, depth of field and screen effects can be disabled.
- Text scaling for dialogue and subtitles.
- Bengali text font must support all required glyphs and shaping correctly.
- Color is not the only indicator for wanted state, mission status or vehicle condition.
- Pause menu and settings remain navigable without precise mouse movement.
- Provide subtitle controls and volume mix for dialogue, ambience and effects.
