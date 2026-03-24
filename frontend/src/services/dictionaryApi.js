/**
 * API for Dictionary – terms and categories.
 * Uses backend at /api/dictionary.
 */
const API_BASE_URL = '/api';

export const fetchTerms = async () => {
  const response = await fetch(`${API_BASE_URL}/dictionary/terms`);
  if (!response.ok) throw new Error('Failed to fetch terms');
  return response.json();
};

export const searchTerms = async (searchTerm, searchOptions, category = null) => {
  const response = await fetch(`${API_BASE_URL}/dictionary/terms/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ searchTerm, searchOptions, category }),
  });
  if (!response.ok) throw new Error('Failed to search terms');
  return response.json();
};

export const createTerm = async (termData) => {
  const response = await fetch(`${API_BASE_URL}/dictionary/terms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(termData),
  });
  if (!response.ok) throw new Error('Failed to create term');
  return response.json();
};

export const updateTerm = async (id, termData) => {
  const response = await fetch(`${API_BASE_URL}/dictionary/terms/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(termData),
  });
  if (!response.ok) throw new Error('Failed to update term');
  return response.json();
};

export const deleteTerm = async (id) => {
  const response = await fetch(`${API_BASE_URL}/dictionary/terms/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete term');
  return response.json();
};

export const saveAllTerms = async (terms) => {
  const response = await fetch(`${API_BASE_URL}/dictionary/terms/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ terms }),
  });
  if (!response.ok) throw new Error('Failed to save terms');
  return response.json();
};

export const fetchCategories = async () => {
  const response = await fetch(`${API_BASE_URL}/dictionary/categories`);
  if (!response.ok) throw new Error('Failed to fetch categories');
  return response.json();
};

export const createCategory = async (categoryData) => {
  const response = await fetch(`${API_BASE_URL}/dictionary/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(categoryData),
  });
  if (!response.ok) throw new Error('Failed to create category');
  return response.json();
};

export const updateCategory = async (id, categoryData) => {
  const response = await fetch(`${API_BASE_URL}/dictionary/categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(categoryData),
  });
  if (!response.ok) throw new Error('Failed to update category');
  return response.json();
};

export const deleteCategory = async (id) => {
  const response = await fetch(`${API_BASE_URL}/dictionary/categories/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete category');
  return response.json();
};

export const fetchLanguages = async () => {
  const response = await fetch(`${API_BASE_URL}/dictionary/languages`);
  if (!response.ok) throw new Error('Failed to fetch languages');
  return response.json();
};
