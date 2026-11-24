# Devpost submission text

Fill in the two links below once the demo is deployed and the video is recorded.

- Hosted demo: [Hosted demo URL]
- Demo video: [YouTube demo URL]

## Inspiration

A draft is a set of promises.
A coach picks an early-game comp because it should take the first dragons, or a scaling comp because it should survive to 25 minutes.
Nobody writes those promises down in a form the team can check, and review usually starts from the VOD, not from the plan.
We wanted one loop: plan from the draft, then ask "did we play our draft?"

## What it does

**Plan.**
Enter a finished draft, or open a pro game to prefill it.
Throughline builds 4 to 8 checkable plan items, each with its evidence and the number of games behind it, a draft tempo chart with windows, and a Discord export.

**Review.**
Pick the game that was played.
Every plan item gets a verdict with the numbers it read and a replay clip of the deciding moment.
Five kinds of macro moments the plan missed are detected, and the coach can confirm, dismiss and annotate each one and share a read-only link.

No text is written by a language model.
Every line is a template filled from counted data.

## How we built it

- Python 3.12, FastAPI, DuckDB for analytics, SQLite for plans and reviews.
- React 18, TypeScript, Vite, Tailwind and TanStack Query, with a canvas minimap replay.
- Built on the hackathon's GRID starter data: 1,738 parseable games, 20 tournaments (LCK, LEC, LTA, LCS), patches 15.1 to 16.17.
- Knowledge base with empirical Bayes shrinkage, a strict time split so a plan only uses earlier games, and a backtest over 587 holdout sides.
- Tested with 89 backend tests (plus real-data tests), 13 Vitest tests and 2 Playwright end-to-end tests.

## Challenges

- The feed has no wards and no roles, and positions arrive every few seconds. We infer roles, interpolate short gaps and report longer ones as unknown.
- Objective spawn times changed between seasons (first baron 24:40 against 19:40), so they are read from the feed.
- Plan adherence is confounded with already winning, so the item-level comparison buckets by gold difference.

## Accomplishments

- Win rate rises from 35.8% for sides that followed 0% to 25% of their plan to 55.0% for 75% to 100%, on 587 holdout sides.
- `window` items show a gold-adjusted +20.4 pp and `lane` items +8.8 pp.
- We report the weak results as well: `objective` had 1 followed side against 247 not followed, because the rule is too strict for real pro setups, and it is the first rule to recalibrate.

## What we learned

- Tests prove code matches a plan, and only real data shows whether the plan's rules fit real play.
- Honest negative results are more useful than a tuned headline.
- Junie works best on small, test-first tasks with strong written guidelines.

## What is next

- Recalibrate the `objective` rule and re-run the validation.
- Hand-check verdicts and moments against VODs and log the results.
- Adherence across a team's games.

## JetBrains tools

- **PyCharm** for the backend, **WebStorm** for the frontend, **DataGrip** for the DuckDB and SQLite files.
- **Junie** as the main coding agent, with rules in `.junie/AGENTS.md`, working test-first task by task.
- Run configurations in `.idea/runConfigurations`, and a task-by-task history in `docs/BUILD_LOG.md`.

## Links

- Repository: [Repository URL]
- Hosted demo: [Hosted demo URL]
- Demo video: [YouTube demo URL]
- Methodology: `docs/methodology.md`
- AI showcase: `AI_SHOWCASE.md`

## Video checklist

- Under 3 minutes, aim for 2:50.
- No team logos, no copyrighted music, no broadcast footage.
- Public on YouTube, and checked to play logged out.
