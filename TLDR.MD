# Veridex in plain English (TL;DR)

**What it is:** A website that uses computer simulations to predict how sports will turn out. It runs thousands of "what if" versions of a season or tournament and reports the odds. Drew built it solo. It's live at veridex-sports.vercel.app.

**Focus right now:** NFL. Soccer, Formula 1, and MLB are being hidden or marked "coming soon" so the site centers on NFL, then NBA and NHL.

**What it does today:**

- **World Cup 2026:** Finished. The site ran about 10,000 simulated tournaments and showed each team's chance of winning. Spain won. The site now looks back at how the predictions did. The home hero still shows World Cup headlines.
- **NFL 2026:** Working. An admin types in game scores, and the site updates standings, the schedule, team rankings, and playoff odds. The admin panel opens on the next week that still needs scores. The home page shows the latest week with results. Scores are still entered by hand; automatic updates are planned but not switched on.
- **Fantasy football:** The biggest current project. It ranks players for a draft, shows how much value each player adds over a replacement-level player, and estimates the range of outcomes for each player. It's close, but its ranges are a bit too narrow compared to the target.
- **Daily updates:** Every morning, an automatic job saves a snapshot of the odds and publishes a briefing.

**How the predictions work (simply):** Each team gets a strength rating that goes up or down after every game, depending on whether it won and by how much. The site then plays the rest of the season or tournament thousands of times using those ratings to see who wins how often.

**Where it stands (October 9, 2026):**

- The code builds cleanly with the project's type checks. The 9 cleanup errors are fixed.
- There's a **security gap to fix:** a fallback in the admin save code can write scores using the public key, which should only be allowed to read. This needs to be removed, and the database permissions double-checked.
- The home hero doesn't yet reflect NFL results.
- Some project notes are behind the code, and a few planned features are not in the code yet.

**Next steps, in order:**

1. Confirm the site builds (`npm run build`), then push.
2. Remove the risky fallback and confirm the database only accepts writes through the protected path.
3. Test a real NFL score entry on the live site.
4. Make the home hero show NFL, and hide or label Soccer, F1, and MLB.
5. Decide whether to turn on automatic score updates (needs an API key).
6. Keep improving the fantasy predictions until their ranges hit the 80% target.

**Not started:** Basketball, hockey, baseball, and MLS. The plan is to reuse the same engine once NFL is solid.