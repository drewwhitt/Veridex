# Veridex in plain English (TL;DR)

**What it is:** A website that uses computer simulations to predict how sports will turn out. It runs thousands of "what if" versions of a season or tournament and reports the odds. Drew built it solo. It's live at veridex-sports.vercel.app.

**What it does today:**

- **World Cup 2026:** Finished. The site ran about 10,000 simulated tournaments and showed each team's chance of winning. Spain won. The site now looks back at how the predictions did.
- **NFL 2026:** Partly working. An admin can type in game scores, and the site updates standings, the schedule, team rankings, and playoff odds. Right now scores are entered by hand. Automatic score updates are planned but not switched on.
- **Fantasy football:** The biggest current project. It ranks players for a draft, shows how much value each player adds over a replacement-level player, and estimates the range of outcomes for each player. It's close, but its ranges are a bit too narrow compared to the target.
- **Daily updates:** Every morning, an automatic job saves a snapshot of the odds and publishes a briefing.

**How the predictions work (simply):** Each team gets a strength rating that goes up or down after every game, depending on whether it won and by how much. The site then plays the rest of the season or tournament thousands of times using those ratings to see who wins how often.

**Where it stands (October 9, 2026):**

- The code is in good shape overall, but there are **9 small cleanup errors** the project's own checks flag (unused leftover code, no effect on results).
- There's a **security gap to fix:** a fallback in the admin save code can write scores using the public key, which should only be allowed to read. This needs to be removed, and the database permissions double-checked.
- Some project notes are behind the code, and a few planned features are not in the code yet.

**Next steps, in order:**

1. Clean up the 9 errors and confirm the site builds.
2. Remove the risky fallback and confirm the database only accepts writes through the protected path.
3. Test a real NFL score entry on the live site.
4. Decide whether to turn on automatic score updates (needs an API key).
5. Keep improving the fantasy predictions until their ranges hit the 80% target.

**Not started:** Basketball, hockey, baseball, and MLS. The plan is to reuse the same engine once NFL is solid.