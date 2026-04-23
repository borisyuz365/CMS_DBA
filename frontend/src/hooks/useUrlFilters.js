import { useSearchParams } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Generic hook for syncing filter/table state with URL query params.
 *
 * @param {Object} schema - Keys are URL param names, values are config objects:
 *   { type: 'string'|'number'|'boolean'|'array'|'json', default: any }
 *   - 'string' (default): plain string
 *   - 'number': parsed via Number()
 *   - 'boolean': serialized as 'true'/'false'
 *   - 'array': comma-separated strings
 *   - 'json': JSON.stringify / JSON.parse
 *
 * @returns {[Object, Function]} [state, updateState]
 *   - state: current values (keyed by schema keys)
 *   - updateState: accepts partial object or updater function
 */
export default function useUrlFilters(schema) {
  const [searchParams, setSearchParams] = useSearchParams();
  const schemaRef = useRef(schema);
  const isFirstSync = useRef(true);

  const deserialize = useCallback((raw, type, fallback) => {
    if (raw === null || raw === undefined) return fallback;
    switch (type) {
      case 'number': {
        const n = Number(raw);
        return isNaN(n) ? fallback : n;
      }
      case 'boolean':
        return raw === 'true' || raw === '1';
      case 'array':
        return raw ? raw.split(',').map(v => v.trim()).filter(Boolean) : [];
      case 'json':
        try { return JSON.parse(raw); }
        catch { return fallback; }
      default:
        return raw;
    }
  }, []);

  const serialize = useCallback((value, type) => {
    switch (type) {
      case 'array':
        return Array.isArray(value) ? value.join(',') : '';
      case 'json':
        return JSON.stringify(value);
      case 'boolean':
        return value ? 'true' : 'false';
      default:
        return String(value ?? '');
    }
  }, []);

  const isDefaultValue = useCallback((value, defaultVal) => {
    if (value === defaultVal) return true;
    if (value == null && defaultVal == null) return true;
    if (Array.isArray(value) && Array.isArray(defaultVal)) {
      return value.length === defaultVal.length && value.every((v, i) => v === defaultVal[i]);
    }
    if (typeof value === 'object' && typeof defaultVal === 'object' && value !== null && defaultVal !== null) {
      return JSON.stringify(value) === JSON.stringify(defaultVal);
    }
    return false;
  }, []);

  const buildInitialState = useCallback(() => {
    const state = {};
    for (const [key, config] of Object.entries(schemaRef.current)) {
      const raw = searchParams.get(key);
      const type = config.type || 'string';
      state[key] = raw !== null ? deserialize(raw, type, config.default) : config.default;
    }
    return state;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [state, setStateInternal] = useState(buildInitialState);

  useEffect(() => {
    if (isFirstSync.current) {
      isFirstSync.current = false;
      return;
    }

    const params = new URLSearchParams();

    for (const [k, v] of searchParams.entries()) {
      if (!(k in schemaRef.current)) {
        params.set(k, v);
      }
    }

    for (const [key, config] of Object.entries(schemaRef.current)) {
      const value = state[key];
      const type = config.type || 'string';
      if (isDefaultValue(value, config.default)) continue;
      if (value === '' || value === null || value === undefined) continue;
      if (Array.isArray(value) && value.length === 0) continue;
      params.set(key, serialize(value, type));
    }

    setSearchParams(params, { replace: true });
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateState = useCallback((updater) => {
    setStateInternal(prev => {
      const updates = typeof updater === 'function' ? updater(prev) : updater;
      return { ...prev, ...updates };
    });
  }, []);

  return [state, updateState];
}
