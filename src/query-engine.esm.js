/**
 * ES Module Wrapper for Pokemon Champions Query Engine
 */
import engine from './query-engine.js';

export const {
  TYPES,
  TYPE_COLORS,
  TYPE_CHART,
  DEFENSIVE_ABILITIES,
  calculateDualTypeMatchups,
  summarizeMatchups,
  applyAbilityToMatchups,
  PokemonQueryEngine
} = engine;

export default PokemonQueryEngine;
