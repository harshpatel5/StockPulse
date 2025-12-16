import { useMemo } from 'react';
import { toNumber } from '../utils/formatters';

export const usePortfolio = (assets, livePrices, history) => {
  const portfolioTotals = useMemo(() => {
    if (!assets.length) {
      return { invested: 0, value: 0, rows: [] };
    }

    return assets.reduce(
      (acc, asset) => {
        const quantity = toNumber(asset.quantity);
        const costBasis = toNumber(asset.cost_basis ?? asset.costBasis);
        const averagePrice = quantity ? costBasis / quantity : 0;
        // Normalize to uppercase for price lookup (API returns uppercase keys)
        const symbolKey = asset.name?.trim().toUpperCase();
        const currentPrice = livePrices[symbolKey] ?? averagePrice;
        const currentValue = currentPrice * quantity;
        const change = currentValue - costBasis;

        acc.invested += costBasis;
        acc.value += currentValue;
        acc.rows.push({
          ...asset,
          quantity,
          costBasis,
          currentPrice,
          currentValue,
          change,
          changePct: costBasis ? (change / costBasis) * 100 : 0,
        });
        return acc;
      },
      { invested: 0, value: 0, rows: [] }
    );
  }, [assets, livePrices]);

  const allocationData = useMemo(() => {
    if (!portfolioTotals.value) return [];

    const grouped = portfolioTotals.rows.reduce((acc, row) => {
      acc[row.type] = (acc[row.type] || 0) + row.currentValue;
      return acc;
    }, {});

    return Object.entries(grouped).map(([type, value]) => ({
      name: type,
      value,
      percentage: ((value / portfolioTotals.value) * 100).toFixed(1),
    }));
  }, [portfolioTotals]);

  const lineSeries = useMemo(() => {
    if (!history.length) return [];

    return history.map((entry) => {
      // Parse date string (format: YYYY-MM-DD)
      const [year, month, day] = entry.date.split('-');
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

      // Format date for display
      const formattedDate = dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: history.length > 30 ? 'numeric' : undefined, // Show year if many data points
      });

      return {
        date: formattedDate,
        fullDate: entry.date, // Keep full date for sorting/grouping
        value: parseFloat(entry.total_value) || 0,
        timestamp: dateObj.getTime(), // For proper sorting
      };
    }).sort((a, b) => a.timestamp - b.timestamp); // Ensure chronological order
  }, [history]);

  const netChange = portfolioTotals.value - portfolioTotals.invested;
  const netChangePct = portfolioTotals.invested
    ? (netChange / portfolioTotals.invested) * 100
    : 0;

  return {
    portfolioTotals,
    allocationData,
    lineSeries,
    netChange,
    netChangePct,
  };
};

