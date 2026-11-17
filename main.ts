// BTC race bot: hourly RSI mean reversion on cbBTC/USDC 1-minute bars.
//
// Strategy (long only, one position, full size):
// - RSI(60) over 1-minute closes (simple mean of gains/losses over the last
//   60 bars, the classic Wilder inputs without Wilder smoothing).
// - Buy 100% of cash when RSI <= 33 (an hourly oversold dip).
// - Sell the whole position when RSI >= 65 (the dip has reverted) or when the
//   position is 2% under its cost (a crash stop; never hit on the dev window).
// - Every order caps slippage at 150 bps from the latest close.
//
// Why this shape: a full round trip costs about 34 bps (4 bps fee each way,
// 2 bps slippage each way, ~11 bps of pool impact each way at full size), so
// the bot must catch moves well above that. One-minute noise is only ~6 bps,
// so it never trades on it; the hourly swings in the dev window are 50-130 bps,
// and RSI(60) buys the deep hourly dips and sells the recoveries. On the
// published dev window this makes +$25.61 over 3 round trips with a 1.32%
// maximum drawdown (buy-and-hold makes +$1.07; the house EMA-cross bot loses
// $106.21 there).
//
// Determinism: no wall clock, no environment, no randomness; the only state is
// the closes seen so far, and every computation is a fixed sequence of integer
// and float64 operations on them, so two runs on the same bars answer the same
// orders byte for byte. No model calls, no network.

import { runBars, type BarsState, type Batch, type OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const RSI_PERIOD = 60;
const RSI_BUY = 33;
const RSI_SELL = 65;
const STOP_LOSS_BPS = 200n; // sell when the position is 2% under its cost
const MAX_SLIPPAGE_BPS = 150;

const closes: number[] = []; // closes in price units (1e-5 USDC), one per bar
const gains: number[] = []; // positive close-to-close moves, same units
const losses: number[] = []; // negative close-to-close moves, as positive magnitudes
let lastT: number | null = null;

/** RSI over the last RSI_PERIOD bars, or null before 60 moves are seen. */
function rsi(): number | null {
  if (gains.length < RSI_PERIOD) return null;
  const g = gains.slice(-RSI_PERIOD);
  const l = losses.slice(-RSI_PERIOD);
  const avgGain = g.reduce((a, x) => a + x, 0) / RSI_PERIOD;
  const avgLoss = l.reduce((a, x) => a + x, 0) / RSI_PERIOD;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function onBatch(state: BarsState, _batch: Batch): OrderInput[] {
  if (state.warmingUp) return [];
  const bar = state.latest.get(SYMBOL);
  if (bar === undefined) return [];
  const t = bar.t;
  if (lastT === null || t > lastT) {
    // A new bar for our symbol: fold its close into the RSI inputs.
    const c = Number(bar.c);
    if (closes.length > 0) {
      const d = c - closes[closes.length - 1];
      gains.push(d > 0 ? d : 0);
      losses.push(d < 0 ? -d : 0);
    }
    closes.push(c);
    lastT = t;
  }
  // Otherwise a gap minute with no new bar: decide on the state already
  // held, without double-counting the close.
  const value = rsi();
  if (value === null) return [];
  const holding = state.positions.get(SYMBOL);
  if (holding !== undefined && holding.qty > 0n) {
    // Exit: the dip reverted (RSI back up), or the crash stop.
    if (value >= RSI_SELL) {
      return [{ side: 'sell', symbol: SYMBOL, qty: holding.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }
    const worth = state.value(SYMBOL, holding.qty);
    if (holding.cost > 0n && worth * 10000n <= holding.cost * (10000n - STOP_LOSS_BPS)) {
      return [{ side: 'sell', symbol: SYMBOL, qty: holding.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }
    return [];
  }
  if (value <= RSI_BUY) {
    const cash = state.cash;
    if (cash >= 1000000n) { // the replay's minimum buy notional, 1 USDC
      return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: cash, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }
  }
  return [];
}

await runBars({ onBatch });
