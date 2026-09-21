// Formatter instances are created once: building an Intl.NumberFormat per call
// is one of the slowest things you can do in a render loop.
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const dateFormatters = {
  short: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
  long: new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }),
};

export const currency = (value = 0) => currencyFormatter.format(value || 0);

// $1.2K / $3.4M, for axis ticks where space is tight
export const compactCurrency = (value = 0) => compactCurrencyFormatter.format(value || 0);

// Always carries an explicit + or -, so gain and loss never rely on color alone
export const signedCurrency = (value = 0) => {
  const amount = Number.isFinite(value) ? value : 0;
  return `${amount >= 0 ? '+' : '-'}${currency(Math.abs(amount))}`;
};

export const percent = (value = 0, { signed = false, digits = 2 } = {}) => {
  const amount = Number.isFinite(value) ? value : 0;
  const sign = amount < 0 ? '-' : signed ? '+' : '';
  return `${sign}${Math.abs(amount).toFixed(digits)}%`;
};

// Dates from the API are UTC day keys; formatting in local time shifts them a day
export const formatDateUTC = (value, variant = 'short') => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return (dateFormatters[variant] || dateFormatters.short).format(date);
};

export const toNumber = (value) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
