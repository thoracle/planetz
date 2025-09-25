# Help Screen 2.0 and Progression Systems - Design Specification (Draft)

> Status: Draft for review (do not implement until approved)
> Scope: Help Screen 2.0, Achievements with Trophy icons, Pilot Rank progression

## 1. Goals and Non-Goals
- Goals
  - Introduce a collection-driven, session-persistent achievements system with trophy icons.
  - Replace XP with Pilot Rank progression driven by accumulated achievements.
  - Redesign Help Screen (moved to ESC) with tabs, game pause/resume, and new content.
- Non-Goals
  - No implementation in this phase; specification only.
  - No server-side account profiles beyond current local game persistence.
  - No monetization or network features.

## 2. Feature Overview
- Achievements System
  - Tracks aggregate counts: kills, docking completed, discoveries, cards earned, star systems visited, missions completed.
  - Each achievement category awards trophies at tier thresholds (Bronze, Silver, Gold, Platinum).
  - Trophy icons displayed in Achievements screens and context overlays.
- Pilot Rank
  - Player starts as Ensign.
  - Rank advances based on total trophies earned and/or weighted category points.
  - Rank title appears across UI and in the Help Screen header and the Pilot’s Log tab.
- Help Screen 2.0
  - Open/Close: ESC key opens; ESC or click “Close” dismisses.
  - Game Pause: Pauses simulation/render-tick dependent systems while open; resumes on close.
  - Tabs: Pilot Rank’s Log, Collection, Achievements, Credits.

## 3. User Experience Specification
### 3.1 Input and Lifecycle
- Key mapping
  - ESC: Toggle Help Screen visibility.
  - H: Deprecated alias (optional) → shows on-screen tip to use ESC.
- Pause/Resume behavior
  - On open: freeze AI, projectiles, timers, and mission tick; throttle rendering if needed.
  - On close: restore previous simulation state, input focus, and audio volumes.
- Modal behavior
  - Blocks input to world; UI-only navigation permitted.
  - Screen is keyboard and mouse navigable.

### 3.2 Layout and Tabs
- Header
  - Left: Player name and current Pilot Rank badge.
  - Center: Title “Help & Status” with stardate.
  - Right: Close button (ESC) and hint text.
- Tabs (top aligned)
  - Pilot Rank’s Log
    - Chronological log of key events: discoveries, dockings, missions completed, rewards, rank-ups.
    - Sort by stardate descending; filters by category.
  - Collection
    - NFT card collection grid; shows owned vs undiscovered cards with counts.
    - Quick stats (total unique cards, total copies, set completion %).
  - Achievements
    - Category list with progress bars and trophy icons for each tier earned.
    - Detail panel explaining criteria, next tier threshold, and recent increments.
  - Credits
    - Project credits and acknowledgments; static content.

### 3.3 Visual System
- Trophy Icons
  - Four tiers: Bronze, Silver, Gold, Platinum.
  - Consistent 32px base size, scalable for HiDPI.
  - Monochrome with subtle inner glow; color palette aligns with faction-neutral UI.
- Rank Badge
  - Badge with rank title and subtle wreath/star motif.
  - Displays near player name and in HUD when appropriate.

## 4. Achievements System Specification
### 4.1 Categories and Counters (Initial Set)
- Kills: number of enemy ships destroyed.
- Dockings: completed station dockings.
- Discoveries: unique discoveries registered (planets, moons, stations, deposits, landmarks).
- Cards Earned: total cards acquired across all sources.
- Systems Visited: unique star systems visited.
- Missions Completed: completed missions of any type.

### 4.2 Tiers and Thresholds (Default)
- Bronze, Silver, Gold, Platinum thresholds per category (example defaults):
  - Kills: 10 / 50 / 200 / 1000
  - Dockings: 5 / 20 / 75 / 300
  - Discoveries: 10 / 40 / 120 / 300
  - Cards Earned: 5 / 25 / 100 / 300
  - Systems Visited: 2 / 5 / 15 / 40
  - Missions Completed: 3 / 10 / 30 / 100
- All thresholds configurable via data file.

### 4.3 Trophy Granting Rules
- A trophy is granted when a counter crosses a tier threshold.
- Multiple trophies can unlock on a single event if thresholds are leaped.
- Trophies are permanent once earned and persist across sessions.
- Each trophy emits a UI event (toast/badge) and is recorded in the Pilot’s Log.

### 4.4 Presentation
- Achievements Tab
  - Each category row displays: name, current count, horizontal progress bar, next threshold, earned trophy icons.
  - “View Details” opens a panel with recent events and all thresholds.
- Contextual Surfaces
  - Small trophy pop-in at top-right for newly earned trophies, with sound.

## 5. Pilot Rank Specification
### 5.1 Rank Model
- Starting Rank: Ensign.
- Rank List (example; subject to tuning)
  - Ensign → Lieutenant → Lieutenant Commander → Commander → Captain → Commodore → Rear Admiral → Vice Admiral → Admiral
- Rank Progression Rules
  - Primary: total trophies earned across all categories.
    - Example: 2 trophies → Lieutenant, 5 → Lt Commander, 10 → Commander, 16 → Captain, 24 → Commodore, 34 → Rear Admiral, 46 → Vice Admiral, 60 → Admiral.
  - Secondary (tie-breaker/alternative): weighted achievement points (Bronze=1, Silver=3, Gold=6, Platinum=10).
- On rank-up
  - Play a distinct rank-up fanfare, show badge animation, add log entry.

### 5.2 Surfaces
- HUD: small badge adjacent to player name (non-intrusive).
- Help Screen header and Pilot’s Log tab: full badge and title.

## 6. Data Model and Persistence
### 6.1 Data Objects (conceptual)
- AchievementCounters
  - keys: kills, dockings, discoveries, cardsEarned, systemsVisited, missionsCompleted
  - values: non-negative integers
- AchievementTrophies
  - per-category set of tiers earned: { bronze: boolean, silver: boolean, gold: boolean, platinum: boolean }
  - earnedAt: stardate for each tier
- PilotRankState
  - currentRank: string
  - totalTrophies: integer
  - weightedPoints: integer
  - lastRankUpAt: stardate
- PilotLogEntry
  - id, stardate, category, title, description, metadata

### 6.2 Storage
- Persist in existing local save mechanism (same scope as cards and missions).
- Data versioning field for forward compatibility.

## 7. Events and API Contracts (Frontend-internal)
### 7.1 Events (publish/subscribe intent)
- achievement:increment(category, amount, context)
- achievement:trophy-earned(category, tier)
- rank:updated(previousRank, newRank)
- help:opened / help:closed
- log:append(entry)

### 7.2 Service Interfaces (conceptual)
- AchievementService
  - increment(category, amount=1)
  - getCounters()
  - getTrophies()
  - getProgress(category)
- RankService
  - getRank()
  - evaluateRank(counters, trophies)
  - getNextRank()
- HelpScreenController
  - open(), close()
  - isOpen()

## 8. Pause/Resume Semantics
- On Help open: pause AI, projectiles, mission timers, animations; mute/duck combat SFX; maintain ambient music softly.
- On Help close: resume all paused systems; restore SFX volumes; re-enable inputs.
- Ensure idempotency if called repeatedly.

## 9. Accessibility and UX Considerations
- Full keyboard navigation for tabs and content.
- High-contrast mode support and scalable fonts.
- Screen-reader labels for tabs, trophies, progress bars, and rank badge.
- Motion-reduced animations honoring user OS settings.

## 10. Telemetry and Debugging
- Debug channels: `ACHIEVEMENTS`, `RANK`, `UI`.
- Console helpers: view counters, grant test trophies, simulate rank-up.

## 11. Testing Plan (pre-implementation)
- Unit tests: thresholds, multi-tier unlocks, persistence, idempotent pause/resume.
- Integration tests: counters increment from gameplay events; Help open pauses gameplay; dismissal resumes.
- UI tests: ESC opens Help; tab navigation; achievements rendering; rank badge updates.
- Performance: opening Help must be <150ms on mid-tier hardware.

## 12. Open Questions
- Should some categories be hidden until first progress?
- Do we display undiscovered card silhouettes in Collection?
- Rank thresholds: trophy count only or weighted points?
- Source of truth for stardate: backend or frontend clock?
- Trophy icon art: in-house or vector system-generated with CSS/SVG?

## 13. Data-Driven Configuration (suggested file)
- `data/progression/achievements.json`
- `data/progression/ranks.json`

## 14. Milestones
- M1: Finalize spec and thresholds (this document).
- M2: Wire data files and services (no UI).
- M3: Implement Help Screen 2.0 shell with tabs and pause/resume.
- M4: Integrate Achievements and Rank surfaces.
- M5: Polish, a11y, performance, and tests.

## 15. Diagrams (Mermaid UML)

### 15.1 Data Model and Services (Class Diagram)
```mermaid
classDiagram
  direction LR

  class AchievementCounters {
    +int kills
    +int dockings
    +int discoveries
    +int cardsEarned
    +int systemsVisited
    +int missionsCompleted
  }

  class TrophySet {
    +bool bronze
    +bool silver
    +bool gold
    +bool platinum
    +Map~string, string~ earnedAt  // tier -> stardate
  }

  class AchievementTrophies {
    +Map~string, TrophySet~ byCategory
  }

  class PilotRankState {
    +string currentRank
    +int totalTrophies
    +int weightedPoints
    +string lastRankUpAt
  }

  class PilotLogEntry {
    +string id
    +string stardate
    +string category
    +string title
    +string description
    +Map~string, any~ metadata
  }

  class AchievementService {
    +increment(category: string, amount: int = 1) void
    +getCounters() AchievementCounters
    +getTrophies() AchievementTrophies
    +getProgress(category: string) float
  }

  class RankService {
    +getRank() string
    +evaluateRank(counters: AchievementCounters, trophies: AchievementTrophies) PilotRankState
    +getNextRank() string
  }

  class HelpScreenController {
    +open() void
    +close() void
    +isOpen() bool
  }

  class StorageAdapter {
    +load(key: string) any
    +save(key: string, value: any) void
  }

  AchievementService --> AchievementCounters : manages
  AchievementService --> AchievementTrophies : awards
  RankService --> AchievementTrophies : reads
  RankService --> PilotRankState : updates
  HelpScreenController ..> AchievementService : reads
  HelpScreenController ..> RankService : reads
  AchievementService ..> StorageAdapter : persistence
  RankService ..> StorageAdapter : persistence
```

### 15.2 Help Screen Open/Close (Sequence)
```mermaid
sequenceDiagram
  autonumber
  actor Player
  participant UI as HelpScreenController
  participant Game as GameLoop/Simulation
  participant Audio as AudioManager

  Player->>UI: press ESC
  UI->>Game: pause()
  UI->>Audio: duckNonAmbient()
  UI-->>Player: render Help (tabs header)

  Note over UI,Game: Input to world blocked; UI-only navigation

  Player->>UI: press ESC (close) or click Close
  UI->>Game: resume()
  UI->>Audio: restoreVolumes()
  UI-->>Player: hide Help
```

### 15.3 Achievement Increment and Trophy Award (Sequence)
```mermaid
sequenceDiagram
  autonumber
  participant Src as Subsystem (e.g., CombatSystem)
  participant Ach as AchievementService
  participant Rank as RankService
  participant Log as PilotLogService
  participant UI as NotificationCenter

  Src->>Ach: increment('kills', 1)
  Ach->>Ach: update counters
  alt crossed one or more thresholds
    Ach->>Ach: grant trophies (possibly multiple)
    Ach-->>UI: emit trophy-earned(category, tier)
    Ach->>Rank: evaluateRank(counters, trophies)
    alt rank up
      Rank-->>UI: emit rank:updated(prev, next)
      Log-->>UI: append log entry
    end
    Log->>Log: append trophy log entries
  end
```

### 15.4 Help Screen State Machine (State Diagram)
```mermaid
stateDiagram-v2
  [*] --> Closed
  Closed --> Opening: open()
  Opening --> Open: UI ready
  Open --> Closing: close()
  Closing --> Closed: UI hidden

  state Open {
    [*] --> Tabs
    Tabs --> Tabs: switch(tab)
  }
```

### 15.5 Rank Progression (Sequence)
```mermaid
sequenceDiagram
  autonumber
  participant Ach as AchievementService
  participant Rank as RankService
  participant UI as HUD/HelpHeader

  Ach-->>Rank: notify trophies changed
  Rank->>Rank: compute totalTrophies and weightedPoints
  Rank->>Rank: determine new rank threshold
  alt threshold met
    Rank-->>UI: update rank badge/title
  else not met
    Rank-->>UI: no-op
  end
```

### 15.6 Help Screen Components (Component Diagram)
```mermaid
flowchart LR
  subgraph HelpScreen[Help Screen]
    Header[Header: Title, Stardate, Rank Badge]
    Tabs[Tabs: Pilot Log | Collection | Achievements | Credits]
    Content[Tab Content Area]
  end

  Header --> Tabs
  Tabs --> Content

  subgraph Services[Services]
    AchService[AchievementService]
    RankService[RankService]
    LogService[PilotLogService]
  end

  Content -. reads .-> AchService
  Content -. reads .-> RankService
  Content -. reads .-> LogService
```
