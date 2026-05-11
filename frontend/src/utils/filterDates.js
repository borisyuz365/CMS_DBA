export const parseFilterDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const match = String(value).match(/^(\d{2})\/(\d{2})\/(\d{2})(?:\s+(\d{2}):(\d{2}))?$/);
  if (match) {
    const [, day, month, year, hour = '00', minute = '00'] = match;
    const fullYear = 2000 + Number(year);
    const date = new Date(fullYear, Number(month) - 1, Number(day), Number(hour), Number(minute));
    return isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
};

export const formatFilterDate = (value) => {
  const date = parseFilterDate(value);
  if (!date) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hour}:${minute}`;
};

export const getDefaultCreateFilterDates = () => {
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 14);
  return {
    startDate: formatFilterDate(startDate),
    endDate: formatFilterDate(endDate),
  };
};

export const validateFilterDateRange = (startValue, endValue) => {
  const errors = {};
  const hasStart = startValue !== null && startValue !== undefined && startValue !== '';
  const hasEnd = endValue !== null && endValue !== undefined && endValue !== '';
  const startDate = parseFilterDate(startValue);
  const endDate = parseFilterDate(endValue);

  if (hasStart && !startDate) {
    errors.start = 'Invalid start date';
  }
  if (hasEnd && !endDate) {
    errors.end = 'Invalid end date';
  }
  if (startDate && endDate && endDate < startDate) {
    errors.start = 'Start date must be on or before end date';
    errors.end = 'End date must be on or after start date';
  }

  return errors;
};
