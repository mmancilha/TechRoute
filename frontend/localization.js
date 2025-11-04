// localization.js - Canadian English utilities
const enCA = {
  formatters: {
    date: new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }),
    time: new Intl.DateTimeFormat('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false }),
    currency: new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }),
    number: new Intl.NumberFormat('en-CA', { maximumFractionDigits: 2 })
  },
  toDateString(isoDate) {
    if (!isoDate) return '';
    const d = new Date(isoDate);
    return this.formatters.date.format(d); // YYYY-MM-DD in en-CA
  },
  toTimeString(isoTime) {
    if (!isoTime) return '';
    // Combine with arbitrary date to format
    const d = new Date(`1970-01-01T${isoTime}`);
    return this.formatters.time.format(d); // 24-hour
  },
  toCurrency(value) { return this.formatters.currency.format(Number(value || 0)); },
  toNumber(value) { return this.formatters.number.format(Number(value || 0)); }
};

// Example usage hook: enhance success message with formatted date/time if present
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('visit-form');
  if (!form) return;
  form.addEventListener('submit', () => {
    // No-op: utilities available if needed in other scripts.
  });
});