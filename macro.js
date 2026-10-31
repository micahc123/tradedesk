// Macro snapshot. The Macro and Daily briefing pages are drawn from this.
// Series are monthly, oldest first, ending Oct 2026 (12 points).
// effect: how the latest reading bears on stocks — "helps" | "neutral" | "hurts".
// tilt: -2 (strong underweight) … +2 (strong overweight); `sectors` maps a tilt
// group onto the `sector` values used by runs in data.js.
window.DESK.macro = {
  asOf: "2026-10-30",

  read: {
    regime: "Overheating",
    regimeNote: "Growth above trend, inflation rising",
    cycle: "Late cycle",
    cycleNote: "Moved from mid cycle on Oct 23",
    recession: 24,
    recessionPrev: 18,
    liquidity: "Tightening",
    liquidityNote: "Fed hiking, credit spreads widening",
    summary: [
      "The economy is still growing faster than trend, but growth looks like it peaked in September while inflation is still rising. That is late-cycle overheating. The Fed responded by raising rates on Oct 28 and the market now expects another hike in December.",
      "For stocks this favours companies that earn more when rates and prices are high (banks, energy, miners) and hurts anything that depends on cheap money (housing, REITs, utilities, unprofitable growth). The risk to watch is growth slowing while inflation stays high, which would move us into stagflation.",
    ],
    changed: [
      "The Fed raised rates 0.25% to 3.75–4.00%. Two members wanted a bigger move.",
      "High-yield spreads widened 50bp in a week, to 340bp. That is the biggest move since March.",
      "I moved the cycle call from mid to late and raised recession odds from 18% to 24%.",
      "Homebuilders and REITs are now the biggest underweight. Banks moved up to overweight.",
    ],
  },

  // growth: vs trend, inflation: direction of trend. Both roughly −1.5 … +1.5.
  path: [
    { d: "2026-09-11", g: 0.55, i: -0.22 },
    { d: "2026-09-18", g: 0.63, i: -0.06 },
    { d: "2026-09-25", g: 0.71, i: 0.12 },
    { d: "2026-10-02", g: 0.79, i: 0.26 },
    { d: "2026-10-09", g: 0.86, i: 0.41 },
    { d: "2026-10-16", g: 0.9, i: 0.56 },
    { d: "2026-10-23", g: 0.87, i: 0.73 },
    { d: "2026-10-30", g: 0.8, i: 0.94 },
  ],

  groups: [
    {
      name: "Rates",
      items: [
        { k: "Fed funds (mid)", v: 3.88, u: "%", dp: 2, effect: "hurts", note: "Raised 0.25% on Oct 28. Market prices a 76% chance of another hike on Dec 9.",
          s: [3.63, 3.63, 3.63, 3.63, 3.63, 3.63, 3.63, 3.63, 3.63, 3.63, 3.63, 3.88] },
        { k: "2-year Treasury", v: 4.62, u: "%", dp: 2, effect: "hurts", note: "Up a full point this year as the market moved from cuts to hikes.",
          s: [3.55, 3.52, 3.6, 3.71, 3.8, 3.86, 3.95, 4.08, 4.21, 4.33, 4.48, 4.62] },
        { k: "10-year Treasury", v: 4.97, u: "%", dp: 2, effect: "hurts", note: "Every time it has gone above 4.75% this year, long-duration stocks have sold off.",
          s: [4.12, 4.15, 4.21, 4.3, 4.38, 4.42, 4.51, 4.6, 4.68, 4.74, 4.79, 4.97] },
        { k: "10y minus 2y", v: 35, u: "bp", dp: 0, effect: "helps", note: "Still positive, so banks can still lend long and borrow short at a profit.",
          s: [57, 63, 61, 59, 58, 56, 56, 52, 47, 41, 31, 35] },
      ],
    },
    {
      name: "Inflation",
      items: [
        { k: "Core PCE, yearly", v: 3.4, u: "%", dp: 1, effect: "hurts", note: "The Fed’s preferred measure. It has risen every quarter this year.",
          s: [2.8, 2.8, 2.9, 2.9, 3.0, 3.0, 3.1, 3.1, 3.2, 3.3, 3.3, 3.4] },
        { k: "CPI, yearly", v: 3.6, u: "%", dp: 1, effect: "hurts", note: "Energy and rent are doing most of the work.",
          s: [2.9, 3.0, 3.0, 3.1, 3.2, 3.2, 3.3, 3.4, 3.4, 3.5, 3.5, 3.6] },
        { k: "5-year breakeven", v: 2.71, u: "%", dp: 2, effect: "neutral", note: "Investors expect inflation to stay above target, but not to run away.",
          s: [2.38, 2.4, 2.44, 2.47, 2.5, 2.52, 2.55, 2.58, 2.62, 2.64, 2.66, 2.71] },
      ],
    },
    {
      name: "Jobs",
      items: [
        { k: "Unemployment rate", v: 3.9, u: "%", dp: 1, effect: "neutral", note: "Low, which is good for spending but keeps the Fed worried about wages.",
          s: [4.3, 4.3, 4.2, 4.2, 4.1, 4.1, 4.0, 4.0, 4.0, 3.9, 3.9, 3.9] },
        { k: "Payrolls, 3-month avg", v: 182, u: "k", dp: 0, effect: "helps", note: "Hiring has picked up all year. No sign of a turn yet.",
          s: [98, 110, 121, 135, 142, 150, 158, 165, 171, 176, 179, 182] },
        { k: "Initial jobless claims", v: 214, u: "k", dp: 0, effect: "helps", note: "Layoffs are still very low.",
          s: [236, 232, 231, 228, 226, 224, 221, 219, 218, 216, 215, 214] },
      ],
    },
    {
      name: "Growth",
      items: [
        { k: "ISM manufacturing", v: 53.8, u: "", dp: 1, effect: "helps", note: "Above 50 means factories are expanding. It has been rising for ten months.",
          s: [48.6, 49.0, 49.5, 50.2, 50.9, 51.4, 51.8, 52.3, 52.9, 53.2, 53.5, 53.8] },
        { k: "Q4 GDP nowcast", v: 2.6, u: "%", dp: 1, effect: "helps", note: "Atlanta Fed estimate. Above the roughly 1.8% trend.",
          s: [1.4, 1.6, 1.7, 1.9, 2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.4, 2.6] },
        { k: "Retail sales, yearly", v: 4.1, u: "%", dp: 1, effect: "neutral", note: "Strong in dollars, but less than half of that is real growth after inflation.",
          s: [2.9, 3.0, 3.2, 3.3, 3.5, 3.6, 3.7, 3.8, 3.9, 4.0, 4.0, 4.1] },
      ],
    },
    {
      name: "Credit",
      items: [
        { k: "High-yield spread", v: 340, u: "bp", dp: 0, effect: "hurts", note: "Up 50bp in a week. Still low by history, but the direction matters more.",
          s: [295, 288, 282, 280, 276, 272, 270, 268, 275, 280, 290, 340] },
        { k: "Investment-grade spread", v: 112, u: "bp", dp: 0, effect: "neutral", note: "Wider, but nowhere near stress levels.",
          s: [92, 90, 89, 88, 88, 87, 88, 89, 92, 95, 100, 112] },
        { k: "Banks tightening loans", v: 18, u: "%", dp: 0, effect: "hurts", note: "Net share of banks making loans harder to get. Rising since May.",
          s: [4, 3, 2, 2, 3, 4, 6, 8, 10, 12, 15, 18] },
      ],
    },
    {
      name: "Dollar and commodities",
      items: [
        { k: "Dollar index", v: 120.1, u: "", dp: 1, effect: "hurts", note: "A strong dollar cuts the value of overseas sales for US companies.",
          s: [104.2, 105.0, 106.3, 107.8, 109.1, 110.6, 112.0, 113.8, 115.6, 117.2, 118.4, 120.1] },
        { k: "WTI crude", v: 91.4, u: "$", dp: 2, pre: true, effect: "neutral", note: "Good for energy stocks, bad for consumers and airlines.",
          s: [68.2, 70.1, 72.5, 74.8, 78.0, 80.6, 83.1, 85.9, 88.0, 89.4, 90.2, 91.4] },
        { k: "Copper, per lb", v: 5.12, u: "$", dp: 2, pre: true, effect: "helps", note: "Rising with factory activity and grid spending.",
          s: [4.42, 4.48, 4.55, 4.61, 4.7, 4.78, 4.85, 4.92, 4.98, 5.04, 5.08, 5.12] },
        { k: "Gold, per oz", v: 4180, u: "$", dp: 0, pre: true, effect: "neutral", note: "Rising alongside inflation even with higher real rates.",
          s: [3420, 3480, 3550, 3610, 3690, 3760, 3830, 3900, 3980, 4050, 4110, 4180] },
      ],
    },
  ],

  tilts: [
    { name: "Energy", tilt: 2, sectors: ["Energy"], why: "Oil above $85 and inflation rising." },
    { name: "Banks and brokers", tilt: 1.5, sectors: ["Banks", "Brokers"], why: "Higher rates widen lending margins." },
    { name: "Metals and mining", tilt: 1, sectors: ["Copper", "Lithium"], why: "Factory activity and grid spending." },
    { name: "Health care", tilt: 1, sectors: ["Pharma", "Biotech", "Managed care"], why: "Earnings don’t depend on the cycle." },
    { name: "Industrials", tilt: 0.5, sectors: ["Machinery", "Aerospace"], why: "Strong orders, but a strong dollar hurts exports." },
    { name: "Payments", tilt: 0, sectors: ["Payments"], why: "Inflation lifts volumes, slower spending would cut them." },
    { name: "Semiconductors", tilt: 0, sectors: ["Semis", "Semicap", "Memory"], why: "AI demand offsets high valuations and rates." },
    { name: "Staples", tilt: -0.5, sectors: ["Beverages", "Staples retail"], why: "Safe, but expensive with bond yields near 5%." },
    { name: "Software", tilt: -0.5, sectors: ["Software", "Cybersecurity"], why: "Long-duration earnings are worth less at these rates." },
    { name: "Consumer discretionary", tilt: -1, sectors: ["Apparel", "Discount retail", "Autos"], why: "Higher prices and loan rates squeeze spending." },
    { name: "Utilities and solar", tilt: -1.5, sectors: ["Utilities", "Solar"], why: "Bond-like stocks with heavy borrowing needs." },
    { name: "Housing and REITs", tilt: -2, sectors: ["Homebuilders", "REITs"], why: "Mortgage rates near 7.5% and refinancing costs rising." },
  ],

  themes: [
    { title: "Rate hikes help bank margins", tickers: ["JPM", "SCHW", "GS"],
      body: "Banks earn the gap between what they pay on deposits and what they earn on loans. With the curve still positive and deposit costs lagging, each hike adds to that gap. The risk is credit losses if growth turns." },
    { title: "Oil stays expensive", tickers: ["XOM"],
      body: "Supply is tight and inventories are below average. As long as crude holds above about $85, energy companies keep throwing off cash and buying back stock." },
    { title: "Housing takes the first hit", tickers: ["DHI", "AMT", "NEE"],
      body: "Mortgage rates are back near 7.5%. Housing and anything that borrows heavily to fund long-lived assets usually weakens first when the Fed is still hiking." },
  ],

  history: [
    { d: "2026-10-30", regime: "Overheating", cycle: "Late", rec: 24, liq: "Tightening", top: ["Energy", "Banks and brokers", "Metals and mining"] },
    { d: "2026-10-23", regime: "Overheating", cycle: "Late", rec: 18, liq: "Tightening", top: ["Energy", "Metals and mining", "Health care"] },
    { d: "2026-10-16", regime: "Overheating", cycle: "Mid", rec: 17, liq: "Neutral", top: ["Energy", "Metals and mining", "Industrials"] },
    { d: "2026-10-09", regime: "Overheating", cycle: "Mid", rec: 16, liq: "Neutral", top: ["Energy", "Industrials", "Metals and mining"] },
    { d: "2026-10-02", regime: "Overheating", cycle: "Mid", rec: 15, liq: "Neutral", top: ["Industrials", "Energy", "Semiconductors"] },
    { d: "2026-09-25", regime: "Overheating", cycle: "Mid", rec: 13, liq: "Neutral", top: ["Industrials", "Semiconductors", "Energy"] },
    { d: "2026-09-18", regime: "Recovery", cycle: "Mid", rec: 13, liq: "Easing", top: ["Semiconductors", "Software", "Industrials"] },
    { d: "2026-09-11", regime: "Recovery", cycle: "Mid", rec: 12, liq: "Easing", top: ["Semiconductors", "Software", "Consumer discretionary"] },
  ],

  briefing: {
    title: "Friday, October 30",
    short: "Stocks slipped as bond yields kept climbing after Wednesday’s rate hike. The 10-year closed just under 5%, and banks and energy were the only sectors up for the week. Next Friday’s jobs report is the next big test of whether the Fed hikes again in December.",
    levels: [
      { k: "S&P 500", v: "7,412", d1: -0.6, m1: -2.8 },
      { k: "Nasdaq 100", v: "25,880", d1: -1.1, m1: -4.6 },
      { k: "Russell 2000", v: "2,608", d1: -0.9, m1: -5.2 },
      { k: "VIX", v: "21.4", d1: 6.5, m1: 48.6 },
      { k: "2-year", v: "4.62%", d1: 0.4, m1: 3.1, bp: "+2bp", bpm: "+14bp" },
      { k: "10-year", v: "4.97%", d1: 0.8, m1: 3.8, bp: "+4bp", bpm: "+18bp" },
      { k: "Dollar index", v: "120.1", d1: 0.3, m1: 1.4 },
      { k: "WTI crude", v: "$91.40", d1: 0.9, m1: 1.3 },
      { k: "Gold", v: "$4,180", d1: 0.2, m1: 1.7 },
      { k: "Copper", v: "$5.12", d1: -0.4, m1: 0.8 },
    ],
    happened: [
      "Core PCE for September came in at 3.4% from a year ago, slightly above the 3.3% expected. It was the first big data point since the hike and it backed up the Fed.",
      "Two Fed speakers said December is “live”. Futures now give a 76% chance of another hike, up from 61% a week ago.",
      "High-yield spreads widened another 12bp today. Financing is getting harder for weaker companies.",
      "Homebuilders fell 2.4% and REITs 1.9%, the worst sectors on the day. Banks rose 0.7%.",
    ],
    watching: [
      { d: "2026-11-06", what: "October jobs report", why: "A strong number would make a December hike close to certain." },
      { d: "2026-11-12", what: "October CPI", why: "Watch rent and services. Goods inflation has already turned up." },
      { d: "2026-11-17", what: "October retail sales", why: "The first sign of whether higher rates are slowing spending." },
      { d: "2026-11-25", what: "October PCE", why: "The last inflation reading before the Fed meets." },
      { d: "2026-12-09", what: "Fed decision", why: "A second hike is priced at 76%." },
    ],
  },
};
