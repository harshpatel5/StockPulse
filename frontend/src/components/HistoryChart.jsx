import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Activity } from 'lucide-react';
import { currency, compactCurrency, signedCurrency, percent, formatDateUTC } from '../utils/formatters';
import { SERIES, axisProps, gridProps, TOOLTIP_CURSOR } from '../lib/chartTheme';
import { useChartAnimation } from '../hooks/useChartAnimation';
import { CardHeader } from './ui/CardHeader';
import { SegmentedControl } from './ui/SegmentedControl';
import { ChartState } from './ui/ChartState';
import { ChartTooltip } from './ui/ChartTooltip';

const TIMEFRAMES = [
  { value: '7d', label: '7D', days: 7, required: 2 },
  { value: '30d', label: '1M', days: 30, required: 7 },
  { value: '3m', label: '3M', days: 90, required: 30 },
  { value: '6m', label: '6M', days: 180, required: 90 },
  { value: '1y', label: '1Y', days: 365, required: 180 },
  { value: 'all', label: 'ALL', days: null, required: 1 },
];

const HistoryTooltip = ({ active, payload, label, color }) => {
  if (!active || !payload?.length) return null;

  return (
    <ChartTooltip
      title={formatDateUTC(label, 'long')}
      rows={[{ label: 'Value', value: currency(payload[0].value), color }]}
    />
  );
};

export const HistoryChart = ({ lineSeries }) => {
  const [timeframe, setTimeframe] = useState('all');
  const animation = useChartAnimation();

  // Filter data based on selected timeframe
  const filteredData = useMemo(() => {
    if (!lineSeries.length) return [];

    const option = TIMEFRAMES.find((item) => item.value === timeframe);
    if (!option?.days) return lineSeries;

    const cutoffDate = new Date(Date.now() - option.days * 24 * 60 * 60 * 1000);
    return lineSeries.filter((item) => new Date(item.timestamp) >= cutoffDate);
  }, [lineSeries, timeframe]);

  // Y-axis domain padded around the visible range
  const yDomain = useMemo(() => {
    if (!filteredData.length) return [0, 1];

    const values = filteredData.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1 || Math.abs(min) * 0.1 || 100;

    return [Math.max(0, min - padding), max + padding];
  }, [filteredData]);

  const currentValue = filteredData.length ? filteredData[filteredData.length - 1].value : 0;
  const startValue = filteredData.length ? filteredData[0].value : 0;
  const valueChange = currentValue - startValue;
  const percentChange = startValue > 0 ? (valueChange / startValue) * 100 : 0;
  const isPositive = valueChange >= 0;
  const lineColor = isPositive ? SERIES.positive : SERIES.negative;

  const timeframeOptions = TIMEFRAMES.map((option) => ({
    value: option.value,
    label: option.label,
    disabled: lineSeries.length < option.required,
    title: lineSeries.length < option.required ? `Need more data for ${option.label} view` : undefined,
  }));

  return (
    <article className="card chart-card">
      <CardHeader icon={Activity} title="Portfolio Value Over Time" />

      {filteredData.length > 0 && (
        <div className="chart-value-display">
          <span className="chart-current-value tabular">{currency(currentValue)}</span>
          <span className={`chart-value-change tabular ${isPositive ? 'positive' : 'negative'}`}>
            {signedCurrency(valueChange)} ({percent(percentChange, { signed: true })})
          </span>
        </div>
      )}

      <div className="chart-controls">
        <SegmentedControl
          options={timeframeOptions}
          value={timeframe}
          onChange={setTimeframe}
          label="History timeframe"
        />
      </div>

      {filteredData.length > 0 ? (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={filteredData} margin={{ top: 10, right: 20, left: 50, bottom: 50 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={lineColor} stopOpacity={0.15} />
                <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} strokeOpacity={0.5} />
            <XAxis
              dataKey="fullDate"
              {...axisProps}
              angle={-45}
              textAnchor="end"
              height={70}
              tickFormatter={(value) => formatDateUTC(value)}
              interval={filteredData.length <= 7 ? 0 : Math.ceil(filteredData.length / 6)}
            />
            <YAxis
              {...axisProps}
              tickFormatter={(value) => compactCurrency(value)}
              domain={yDomain}
              width={50}
            />
            <Tooltip content={<HistoryTooltip color={lineColor} />} cursor={TOOLTIP_CURSOR} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={lineColor}
              strokeWidth={2}
              fill="url(#colorValue)"
              dot={false}
              activeDot={{ fill: lineColor, r: 5, stroke: '#1a1a1a', strokeWidth: 2 }}
              {...animation}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <ChartState
          icon={Activity}
          message="No portfolio history yet"
          hint="Add assets and your chart will build automatically"
        />
      )}
    </article>
  );
};
