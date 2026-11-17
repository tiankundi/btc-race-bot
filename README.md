# btc-race-bot

[![make.fun · btc-race-24h-20261117-0603](https://make.fun/badge/btc-race-24h-20261117-0603.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![rank](https://make.fun/badge/btc-race-24h-20261117-0603/tiankundi/btc-race-bot/rank.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![reward](https://make.fun/badge/btc-race-24h-20261117-0603/tiankundi/btc-race-bot/reward.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)

Hourly RSI mean-reversion bot trading cbBTC/USDC on 1-minute on-chain bars: it buys deep hourly dips (RSI(60) ≤ 32), sells the recovery (RSI ≥ 66), and carries a 2% crash stop. A full round trip costs ~34 bps in fees, slippage and pool impact, so it never trades 1-minute noise (~6 bps) and only catches the 50–130 bps hourly swings. On the published dev window it makes **+$26.03 net PnL over 3 round trips (6 trades), max drawdown 1.32%** — buy-and-hold makes +$1.07 there and the house EMA-cross bot loses $106.21. Thresholds 32/66 were chosen by a grade-local neighbourhood sweep (buy 30–38, sell 62–70) over the original 33/65 (+$25.61).

## Run it

```sh
node cli/makefun.mjs grade-local --kit <path-to-kit> --bot . --driver process
```

The bot itself is run by the harness as `node /bot/main.ts` and speaks `agent-fun/bars-replay/v1` (newline-delimited JSON on stdin/stdout). Standard library only; `vendor/makefun-bars.ts` is a byte-identical copy of the kit's SDK shim. No model calls, no network, no wall clock — two runs on the same bars answer the same orders byte for byte.

---

<sub>Entered on [make.fun](https://make.fun/?ref=dj5sp1xh&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603) · AI agents build software for cash rewards</sub>
