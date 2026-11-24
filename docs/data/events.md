# GRID event census: series 2964589

Event types, snapshot keys and position sampling (no values).

## Position updates

Seconds between a player's position changes: median 3, 90th percentile 8, max 62 (10078 gaps).

## Event types

| Type | Count |
|---|---|---|
| `player-purchased-item` | 586 |
| `player-completed-increaseLevel` | 307 |
| `player-used-ability` | 265 |
| `player-lost-item` | 225 |
| `player-killed-player` | 58 |
| `game-respawned-player` | 47 |
| `game-set-npcRespawnClock` | 46 |
| `player-sold-item` | 29 |
| `game-started-npcRespawnClock` | 26 |
| `game-stopped-npcRespawnClock` | 26 |
| `game-respawned-BTierNPC` | 25 |
| `player-killed-BTierNPC` | 23 |
| `team-banned-character` | 20 |
| `team-picked-character` | 20 |
| `game-respawned-ATierNPC` | 18 |
| `player-killed-ATierNPC` | 18 |
| `player-destroyed-tower` | 17 |
| `player-completed-destroyTower` | 17 |
| `player-completed-destroyTurretPlateMid1` | 13 |
| `player-completed-slayRiftScuttlerTop` | 12 |
| `player-completed-slayRiftScuttlerBot` | 11 |
| `team-completed-destroyTurretPlateBot1` | 11 |
| `player-!purchased-item` | 10 |
| `player-completed-slayDragon` | 10 |
| `player-acquired-statusEffect` | 10 |
| `player-lost-statusEffect` | 10 |
| `player-acquired-item` | 9 |
| `team-completed-destroyTurretPlateTop1` | 9 |
| `player-completed-destroyTurretPlateBot2` | 9 |
| `player-completed-destroyTurretPlateBot1` | 8 |
| `player-completed-destroyTurretPlateTop1` | 8 |
| `player-multikilled-player` | 7 |
| `player-completed-destroyTurretPlateMid3` | 7 |
| `player-completed-slayVoidGrub` | 6 |
| `player-completed-slayOceanDrake` | 6 |
| `game-stopped-structureRespawnClock` | 6 |
| `team-completed-destroyTurretPlateMid2` | 5 |
| `player-completed-destroyTurretPlateMid2` | 5 |
| `game-respawned-STierNPC` | 4 |
| `team-completed-destroyTurretPlateTop2` | 4 |
| `game-started-gameClock` | 3 |
| `team-completed-destroyTurretPlateBot2` | 3 |
| `game-stopped-gameClock` | 3 |
| `team-completed-destroyTurretPlateMid3` | 3 |
| `player-completed-destroyTurretPlateTop2` | 3 |
| `team-completed-destroyTurretPlateTop3` | 3 |
| `game-set-gameClock` | 2 |
| `series-started-game` | 2 |
| `team-completed-destroyTurretPlateMid1` | 2 |
| `player-completed-slayRiftHerald` | 2 |
| `player-pickedUp-item` | 2 |
| `team-destroyed-tower` | 2 |
| `team-completed-destroyTower` | 2 |
| `player-killed-STierNPC` | 2 |
| `player-completed-slayBaron` | 2 |
| `player-destroyed-fortifier` | 2 |
| `player-completed-destroyFortifier` | 2 |
| `player-destroyed-base` | 2 |
| `player-completed-destroyNexus` | 2 |
| `team-won-game` | 2 |
| `series-ended-game` | 2 |
| `player-completed-destroyTurretPlateBot3` | 2 |
| `grid-started-feed` | 1 |
| `tournament-started-series` | 1 |
| `player-completed-slayHextechDrake` | 1 |
| `player-completed-slayMountainDrake` | 1 |
| `series-paused-game` | 1 |
| `series-resumed-game` | 1 |
| `player-completed-slayCloudDrake` | 1 |
| `player-completed-slayInfernalDrake` | 1 |
| `team-completed-destroyTurretPlateBot3` | 1 |
| `team-won-series` | 1 |
| `tournament-ended-series` | 1 |
| `grid-ended-feed` | 1 |

## Snapshot keys

- game: clock, draftActions, duration, finished, forfeited, id, map, nonPlayerCharacters, paused, segments, sequenceNumber, started, startedAt, statePath, structures, teams, titleVersion, type
- npc: alive, id, position, respawnClock, side, statePath, type
- player: abilities, alive, character, currentArmor, currentHealth, damageDealt, damageDealtSources, damageDealtTargets, damagePerMinute, damagePerMoney, damagePercentage, damageTaken, deaths, experiencePoints, externalLinks, firstKill, forwardPercentage, id, inventory, kdaRatio, killAssistsGiven, killAssistsReceived, killAssistsReceivedFromPlayer, killParticipation, kills, killsAndAssists, loadoutValue, maxHealth, money, moneyPerMinute, moneyPercentage, multikills, name, netWorth, objectives, participationStatus, position, respawnClock, roles, selfkills, statePath, statusEffects, structuresCaptured, structuresDestroyed, teamkillAssistsGiven, teamkillAssistsReceived, teamkillAssistsReceivedFromPlayer, teamkills, totalMoneyEarned, unitKills, visionScore, visionScorePerMinute, weaponKills, weaponTeamkills
- structure: currentHealth, destroyed, id, maxHealth, position, respawnClock, side, statePath, teamId, type
- team: baronPowerPlays, damageDealt, damageDealtSources, damageDealtTargets, damagePerMinute, damagePerMoney, damageTaken, deaths, experiencePoints, firstKill, forwardPercentage, id, kdaRatio, killAssistsGiven, killAssistsReceived, killAssistsReceivedFromPlayer, kills, killsAndAssists, loadoutValue, majorMoneyDeficit, majorMoneyLead, money, moneyDifference, moneyPerMinute, multikills, name, netWorth, objectives, players, score, selfkills, side, statePath, structuresCaptured, structuresDestroyed, teamkillAssistsGiven, teamkillAssistsReceived, teamkillAssistsReceivedFromPlayer, teamkills, totalMoneyEarned, unitKills, visionScore, visionScorePerMinute, weaponKills, weaponTeamkills, won
