// Shared by browser controls, the rules engine, and reproducible balance runs.
export const BALANCE = Object.freeze({
  // Classic mode moves one grid cell per press interval.
  playerStepSeconds: .150,
  // Arcade mode progresses downfield independently of lateral steering.
  playerCruiseYardsPerSecond: 7.2,
  playerSprintYardsPerSecond: 8.0,
  playerBrakeYardsPerSecond: 3.2,
  playerAccelerationSeconds: .18,
  // 15% faster defensive decisions, commitment, lunge and recovery.
  defenderTempo: 1.15,
  defenderBaseSeconds: .780,
  defenderMaxRampSeconds: .380,
  defenderRampPerYard: .006,
  defenderChaseChance: .64,
  firstDefenderGap: 6,
  frontCenterChance: .80,
  defenderChargeRange: 8,
  defenderChargeYards: 4,
  // Classic keeps the v0.4 handheld-style defensive behavior and spacing.
  classicDefense: Object.freeze({
    defenderBaseSeconds: .560,
    defenderMaxRampSeconds: .110,
    defenderRampPerYard: .0015,
    defenderChaseChance: .64,
    firstDefenderGap: 2,
    frontCenterChance: .75
  })
});

