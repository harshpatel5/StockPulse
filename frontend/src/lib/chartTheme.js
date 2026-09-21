// One source for chart color and axis styling. The dashboard is always dark, so
// these are literal values rather than CSS variables (recharts writes them into
// SVG attributes and gradient stops).

// Categorical hues for the allocation donut. This exact order is the dataviz
// skill's validated dark palette: it passes the lightness band, chroma floor,
// adjacent-pair CVD separation and 3:1 contrast on the #1a1a1a card surface.
// Assign in order and never cycle - past the last slot, fold into "Other".
export const CATEGORICAL = [
  '#3987e5',
  '#d95926',
  '#199e70',
  '#c98500',
  '#d55181',
  '#008300',
  '#9085e9',
  '#e66767',
];

// Named series. The benchmark is deliberately neutral and drawn dashed: red read
// as a loss even when the index was up.
export const SERIES = {
  portfolio: '#E0A458',
  benchmark: '#A1A1A1',
  simulation: '#5FB3A8',
  positive: '#4ade80',
  negative: '#f87171',
};

export const BENCHMARK_DASH = '6 4';

// Confidence bands: same hue, stepped by opacity
export const BAND_OPACITY = { inner: 0.3, outer: 0.14 };

// #9a9a9a clears 4.5:1 on the card surface; the previous #6b6b6b did not
export const axisProps = {
  stroke: '#404040',
  tick: { fill: '#9a9a9a', fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: '#2a2a2a', strokeWidth: 1 },
};

export const gridProps = {
  strokeDasharray: '3 3',
  stroke: '#2a2a2a',
  vertical: false,
  horizontal: true,
};

export const REFERENCE_STROKE = '#404040';
export const TOOLTIP_CURSOR = { stroke: '#404040', strokeDasharray: '4 4' };
export const ANIMATION = { duration: 600, easing: 'ease-out' };
