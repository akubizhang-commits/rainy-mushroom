# Floor-three array entry

Captured from a legitimate new TowerCampaign run, route `array`, seed `419`, no cultivation-pill or draw income, safe-wave breakthrough policy, earned-material forging only. See `reports/early-growth-fix-2026-11-01/guarded-growth/array-419.json` and its adjacent snapshot for provenance.

The fixture preserves the player, inventory-derived loadout, XP, RNG, enemies and phase on entry to floor 3 wave 5. The pacing test rebinds only the full-health elite's HP/maxHP to the current authored enemy budget before validating and restoring it. This keeps a data-tuning regression meaningful without carrying stale enemy HP. No player stat or item is injected.

The test measures the project's visible combat window, including movement and normal cooldown phase. It is a deterministic balance scenario, not an estimate of human win rate.
