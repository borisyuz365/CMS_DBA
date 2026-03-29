/**
 * CSV Storage Utility – reading/writing terms to/from CSV
 */
export const parseCSV = (csvText) => {
  if (!csvText || csvText.trim() === '') return [];
  const lines = csvText.split('\n').filter((line) => line.trim() !== '');
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });
    data.push(obj);
  }
  return data;
};

export const toCSV = (data) => {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const csvRows = [headers.map((h) => `"${h}"`).join(',')];
  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header] ?? '';
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }
  return csvRows.join('\n');
};

export const loadTermsFromStorage = () => {
  try {
    const stored = localStorage.getItem('dictionary_terms');
    if (stored) return JSON.parse(stored);
    return [];
  } catch (e) {
    console.error('Error loading terms from storage:', e);
    return [];
  }
};

export const saveTermsToStorage = (terms) => {
  try {
    localStorage.setItem('dictionary_terms', JSON.stringify(terms));
  } catch (e) {
    console.error('Error saving terms to storage:', e);
  }
};

export const exportToCSV = (terms, filename = 'dictionary_terms.csv') => {
  const csvContent = toCSV(terms);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const importFromCSV = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const terms = parseCSV(e.target.result);
        resolve(terms);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};
