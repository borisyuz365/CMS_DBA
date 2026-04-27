const API_BASE_URL = '/api';

/**
 * API Service for Athletes
 */
class ApiService {
  /**
   * Generic fetch method with error handling
   */
  async fetch(url, options = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({
          error: `HTTP error! status: ${response.status}`,
        }));
        const msg = typeof err.error === 'string' ? err.error : err.error?.message || 'Request failed';
        throw new Error(msg);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  /**
   * Get all athletes with optional filters
   */
  async getAthletes(filters = {}) {
    const queryParams = new URLSearchParams();
    
    // Handle arrays for multi-select filters
    if (filters.country) {
      if (Array.isArray(filters.country)) {
        filters.country.forEach(country => queryParams.append('country', country));
      } else {
        queryParams.append('country', filters.country);
      }
    }
    if (filters.sportType) {
      if (Array.isArray(filters.sportType)) {
        filters.sportType.forEach(sport => queryParams.append('sportType', sport));
      } else {
        queryParams.append('sportType', filters.sportType);
      }
    }
    if (filters.league) {
      if (Array.isArray(filters.league)) {
        filters.league.forEach(league => queryParams.append('league', league));
      } else {
        queryParams.append('league', filters.league);
      }
    }
    if (filters.team) {
      if (Array.isArray(filters.team)) {
        filters.team.forEach(team => queryParams.append('team', team));
      } else {
        queryParams.append('team', filters.team);
      }
    }
    if (filters.athleteId) queryParams.append('athleteId', filters.athleteId);
    if (filters.athleteName) queryParams.append('athleteName', filters.athleteName);
    if (filters.language) queryParams.append('language', filters.language);
    if (filters.showDeleted !== undefined) {
      queryParams.append('showDeleted', filters.showDeleted === true || filters.showDeleted === 'true' ? 'true' : 'false');
    }
    
    const queryString = queryParams.toString();
    const url = `/athletes${queryString ? `?${queryString}` : ''}`;
    const response = await this.fetch(url);
    return response.data || [];
  }

  /**
   * Get athlete by ID
   */
  async getAthleteById(id) {
    const response = await this.fetch(`/athletes/${id}`);
    return response.data;
  }

  /**
   * Get all terms
   */
  async getTerms() {
    const response = await this.fetch('/terms');
    return response.data || [];
  }

  /**
   * Get term by ID
   */
  async getTermById(id) {
    const response = await this.fetch(`/terms/${id}`);
    return response.data;
  }

  /**
   * Create new term
   */
  async createTerm(termData) {
    const response = await this.fetch('/terms', {
      method: 'POST',
      body: JSON.stringify(termData),
    });
    return response.data;
  }

  /**
   * Update term
   */
  async updateTerm(id, termData) {
    const response = await this.fetch(`/terms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(termData),
    });
    return response.data;
  }

  /**
   * Get all categories
   */
  async getCategories() {
    const response = await this.fetch('/terms/categories');
    return response.data || [];
  }

  /**
   * Create new category
   */
  async createCategory(categoryData) {
    const response = await this.fetch('/terms/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
    return response.data;
  }

  /**
   * Get all countries. When `params.search` is provided the server filters
   * by name / code / ID and returns only matching rows.
   */
  async getCountries(params = {}) {
    const qp = new URLSearchParams();
    if (params.search) qp.append('search', params.search);
    const qs = qp.toString();
    const url = qs ? `/data/countries?${qs}` : '/data/countries';
    const response = await this.fetch(url);
    return response.data || [];
  }

  /**
   * Get countries list with optional filters (for Countries entity page)
   */
  async getCountriesList(filters = {}) {
    const queryParams = new URLSearchParams();
    if (filters.countryId) queryParams.append('countryId', filters.countryId);
    if (filters.countryCode) queryParams.append('countryCode', filters.countryCode);
    if (filters.name) queryParams.append('name', filters.name);
    const queryString = queryParams.toString();
    const url = `/countries${queryString ? `?${queryString}` : ''}`;
    const response = await this.fetch(url);
    return response.data || [];
  }

  /**
   * Get country by ID
   */
  async getCountryById(id) {
    const response = await this.fetch(`/countries/${id}`);
    return response.data;
  }

  /**
   * Create a new country
   */
  async createCountry(countryData) {
    const response = await this.fetch('/countries', {
      method: 'POST',
      body: JSON.stringify(countryData),
    });
    return response.data;
  }

  /**
   * Update multiple countries (bulk update)
   */
  async updateCountriesBulk(updates) {
    const response = await this.fetch('/countries/bulk', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    return response.data;
  }

  /**
   * Delete countries (soft delete - set IS_DELETED to true)
   */
  async deleteCountries(countryIds) {
    const updates = countryIds.map(id => ({
      countryId: id,
      changes: { IS_DELETED: true },
    }));
    const response = await this.fetch('/countries/bulk', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    return response.data;
  }

  /**
   * Restore countries (set IS_DELETED to false)
   */
  async restoreCountries(countryIds) {
    const updates = countryIds.map(id => ({
      countryId: id,
      changes: { IS_DELETED: false },
    }));
    const response = await this.fetch('/countries/bulk', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    return response.data;
  }

  /**
   * Get all competitors (teams/clubs) - from data endpoint (basic)
   */
  async getCompetitors(params = {}) {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (Array.isArray(params.sportTypeId)) {
      params.sportTypeId.forEach((id) => qs.append('sportTypeId', id));
    } else if (params.sportTypeId) {
      qs.set('sportTypeId', params.sportTypeId);
    }
    if (Array.isArray(params.mainCompetition)) {
      params.mainCompetition.forEach((id) => qs.append('mainCompetition', id));
    } else if (params.mainCompetition) {
      qs.set('mainCompetition', params.mainCompetition);
    }
    const queryString = qs.toString();
    const response = await this.fetch(`/data/competitors${queryString ? `?${queryString}` : ''}`);
    return response.data || [];
  }

  /**
   * Get all competitors with optional filters (from competitors endpoint - enriched)
   */
  async getCompetitorsList(filters = {}) {
    const queryParams = new URLSearchParams();
    
    // Handle arrays for multi-select filters
    if (filters.country) {
      if (Array.isArray(filters.country)) {
        filters.country.forEach(country => queryParams.append('country', country));
      } else {
        queryParams.append('country', filters.country);
      }
    }
    if (filters.sportType) {
      if (Array.isArray(filters.sportType)) {
        filters.sportType.forEach(sport => queryParams.append('sportType', sport));
      } else {
        queryParams.append('sportType', filters.sportType);
      }
    }
    if (filters.competition) {
      if (Array.isArray(filters.competition)) {
        filters.competition.forEach(competition => queryParams.append('competition', competition));
      } else {
        queryParams.append('competition', filters.competition);
      }
    }
    if (filters.competitorId) queryParams.append('competitorId', filters.competitorId);
    if (filters.competitorName) queryParams.append('competitorName', filters.competitorName);
    if (filters.language) queryParams.append('language', filters.language);
    if (filters.showDeleted !== undefined) {
      queryParams.append('showDeleted', filters.showDeleted === true || filters.showDeleted === 'true' ? 'true' : 'false');
    }
    
    const queryString = queryParams.toString();
    const url = `/competitors${queryString ? `?${queryString}` : ''}`;
    const response = await this.fetch(url);
    return response.data || [];
  }

  /**
   * Get competitor by ID
   */
  async getCompetitorById(id) {
    const response = await this.fetch(`/competitors/${id}`);
    return response.data;
  }

  /**
   * Update multiple competitors (bulk update)
   */
  async updateCompetitorsBulk(updates) {
    const response = await this.fetch('/competitors/bulk', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    return response.data;
  }

  /**
   * Delete competitors (soft delete - set IS_DELETED to true)
   */
  async deleteCompetitors(competitorIds) {
    const updates = competitorIds.map(id => ({
      competitorId: id,
      changes: { IS_DELETED: true },
    }));
    const response = await this.fetch('/competitors/bulk', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    return response.data;
  }

  /**
   * Restore competitors (set IS_DELETED to false)
   */
  async restoreCompetitors(competitorIds) {
    const updates = competitorIds.map(id => ({
      competitorId: id,
      changes: { IS_DELETED: false },
    }));
    const response = await this.fetch('/competitors/bulk', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    return response.data;
  }

  /**
   * Get all competitions (leagues). Pass showDeleted=true to include soft-deleted.
   * When `opts.search` is provided the server filters by name / ID / country.
   */
  async getCompetitions(opts = {}) {
    const params = new URLSearchParams();
    if (opts.showDeleted === true) params.append('showDeleted', 'true');
    if (opts.search) params.append('search', opts.search);
    else if (opts.competitionName) params.append('competitionName', opts.competitionName);
    const qs = params.toString();
    const url = qs ? `/data/competitions?${qs}` : '/data/competitions';
    const response = await this.fetch(url);
    return response.data || [];
  }

  /**
   * Get one competition by id (enriched)
   */
  async getCompetitionById(id) {
    const response = await this.fetch(`/data/competitions/${id}`);
    return response.data;
  }

  /**
   * Create new competition. Body: NAME_ID, COUNTRY_ID, SPORT_TYPE_ID, GENDER, COMPETITION_TYPE (optional: MAIN_COLOR, SECONDARY_COLOR).
   */
  async createCompetition(data) {
    const response = await this.fetch('/data/competitions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  /**
   * Update competition by id. Pass only fields to update (e.g. GENDER, MAIN_COLOR as number, etc.).
   */
  async updateCompetition(id, data) {
    const response = await this.fetch(`/data/competitions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  /**
   * Get data sources (for Partner IDs / Integration tab)
   */
  async getDataSources() {
    const response = await this.fetch('/data/data-sources');
    return response.data || [];
  }

  /**
   * Get partner IDs for a competition (from partner_id_competitions.json).
   * If competitionId is omitted, returns all partner-id-competitions rows.
   */
  async getPartnerIdCompetitions(competitionId) {
    const q = competitionId != null && competitionId !== '' ? `?competitionId=${competitionId}` : '';
    const response = await this.fetch(`/data/partner-id-competitions${q}`);
    return response.data || [];
  }

  /**
   * Upsert one partner ID mapping for a competition
   */
  async putPartnerId(competitionId, dataSourceId, partnerId) {
    const response = await this.fetch(
      `/data/competitions/${competitionId}/partner-ids`,
      { method: 'PUT', body: JSON.stringify({ DATA_SOURCE_ID: dataSourceId, PARTNER_ID: partnerId }) }
    );
    return response.data;
  }

  /**
   * Delete partner ID mapping for a competition + data source
   */
  async deletePartnerId(competitionId, dataSourceId) {
    await this.fetch(
      `/data/competitions/${competitionId}/partner-ids/${dataSourceId}`,
      { method: 'DELETE' }
    );
  }

  /**
   * Bulk-save all partner ID entries for a competition (replaces existing).
   */
  async savePartnerIdsBulk(competitionId, entries) {
    const response = await this.fetch(
      `/data/competitions/${competitionId}/partner-ids/bulk`,
      { method: 'PUT', body: JSON.stringify({ entries }) }
    );
    return response.data || [];
  }

  /**
   * Get all languages
   */
  async getLanguages() {
    const response = await this.fetch('/data/languages');
    return response.data || [];
  }

  /**
   * Get all sports
   */
  async getSports() {
    const response = await this.fetch('/data/sports');
    return response.data || [];
  }

  /**
   * Get games list with optional filters
   */
  async getGamesList(filters = {}) {
    const params = new URLSearchParams();
    if (filters.countryId != null && filters.countryId !== '') params.append('countryId', filters.countryId);
    if (filters.sportId != null && filters.sportId !== '') params.append('sportId', filters.sportId);
    if (filters.competitionId != null && filters.competitionId !== '') params.append('competitionId', filters.competitionId);
    if (filters.teamId != null && filters.teamId !== '') params.append('teamId', filters.teamId);
    if (filters.gameId != null && filters.gameId !== '') params.append('gameId', filters.gameId);
    if (filters.searchPartnerId != null && filters.searchPartnerId !== '') params.append('searchPartnerId', filters.searchPartnerId);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.hideDeleted === true || filters.hideDeleted === 'true') params.append('hideDeleted', 'true');
    const qs = params.toString();
    const response = await this.fetch(`/games${qs ? `?${qs}` : ''}`);
    return response.data || [];
  }

  /**
   * Get game by ID
   */
  async getGameById(id) {
    const response = await this.fetch(`/games/${id}`);
    return response.data;
  }

  async getGameStatuses() {
    const response = await this.fetch('/data/game-statuses');
    return response.data || [];
  }

  async getSequenceDetails(sequence) {
    const response = await this.fetch(`/data/sequence-details/${sequence}`);
    return response.data || {};
  }

  /**
   * Get updates log for a game (investigation/debug).
   * filters: { freeText, source, updateType, dateFrom, dateTo } - server-side search when provided.
   * Returns { data, filterOptions: { sources, updateTypes } }.
   */
  async getGameUpdates(gameId, filters = {}) {
    const params = new URLSearchParams();
    if (filters.freeText != null && String(filters.freeText).trim()) params.append('freeText', filters.freeText);
    if (filters.source && Array.isArray(filters.source) && filters.source.length > 0) {
      filters.source.forEach((s) => params.append('source', s));
    } else if (filters.source && String(filters.source).trim()) params.append('source', filters.source);
    if (filters.updateType && Array.isArray(filters.updateType) && filters.updateType.length > 0) {
      filters.updateType.forEach((t) => params.append('updateType', t));
    } else if (filters.updateType && String(filters.updateType).trim()) params.append('updateType', filters.updateType);
    if (filters.dateFrom) params.append('dateFrom', typeof filters.dateFrom === 'string' ? filters.dateFrom : (filters.dateFrom?.format?.('YYYY-MM-DD') || String(filters.dateFrom)));
    if (filters.dateTo) params.append('dateTo', typeof filters.dateTo === 'string' ? filters.dateTo : (filters.dateTo?.format?.('YYYY-MM-DD') || String(filters.dateTo)));
    const qs = params.toString();
    const response = await this.fetch(`/games/${gameId}/updates${qs ? `?${qs}` : ''}`);
    return { data: response.data || [], filterOptions: response.filterOptions || { sources: [], updateTypes: [] } };
  }

  async getGameScoreLog(gameId) {
    const response = await this.fetch(`/games/${gameId}/score-log`);
    return response.data || [];
  }

  async getGameStatusLog(gameId) {
    const response = await this.fetch(`/games/${gameId}/status-log`);
    return response.data || [];
  }

  async getGameEventsLog(gameId) {
    const response = await this.fetch(`/games/${gameId}/events-log`);
    return {
      data: response.data || [],
      eventTypeNames: response.eventTypeNames || {},
      dataSourceNames: response.dataSourceNames || {},
      gameEventsMap: response.gameEventsMap || {},
      sequenceMap: response.sequenceMap || {},
    };
  }

  async getGameNotificationsLog(gameId) {
    const response = await this.fetch(`/games/${gameId}/notifications-log`);
    return response.data || [];
  }

  /**
   * Create a new game
   */
  async createGame(payload) {
    const response = await this.fetch('/games', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  }

  async getGenders() {
    const response = await this.fetch('/data/genders');
    return response.data || [];
  }

  async getCompetitionTypes() {
    const response = await this.fetch('/data/competition-types');
    return response.data || [];
  }

  async getStandingTypes() {
    const response = await this.fetch('/data/standing-types');
    return response.data || [];
  }

  async getStagesTypes() {
    const response = await this.fetch('/data/stages-types');
    return response.data || [];
  }

  async getSubSportTypes() {
    const response = await this.fetch('/data/sub-sport-types');
    return response.data || [];
  }

  async getCompetitorTypes() {
    const response = await this.fetch('/data/competitor-types');
    return response.data || [];
  }

  async getPriorityLevels() {
    const response = await this.fetch('/data/priority-levels');
    return response.data || [];
  }

  async getPriorityUpdateTypes() {
    const response = await this.fetch('/data/priority-update-types');
    return response.data || [];
  }

  async getPriorities() {
    const response = await this.fetch('/priorities');
    return response.data || [];
  }

  async createPriority(data) {
    const response = await this.fetch('/priorities', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async updatePrioritiesBulk(updates) {
    const response = await this.fetch('/priorities/bulk', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    return response.data;
  }

  async deletePriority(index) {
    await this.fetch(`/priorities/${index}`, { method: 'DELETE' });
  }

  async deletePrioritiesBulk(indices) {
    const response = await this.fetch('/priorities/bulk', {
      method: 'DELETE',
      body: JSON.stringify({ indices }),
    });
    return response.data;
  }

  async getPriorityHistory({ data_source, update_type, cut_type, cut_value } = {}) {
    const params = new URLSearchParams();
    if (data_source != null) params.set('data_source', data_source);
    if (update_type != null) params.set('update_type', update_type);
    if (cut_type != null) params.set('cut_type', cut_type);
    if (cut_value != null) params.set('cut_value', cut_value);
    const qs = params.toString();
    const response = await this.fetch(`/priorities/history${qs ? `?${qs}` : ''}`);
    return response.data || [];
  }

  /**
   * Get all sports (from sports API - for list/edit)
   */
  async getSportsList() {
    const response = await this.fetch('/sports');
    return response.data || [];
  }

  /**
   * Get sport by SPORT_TYPE_ID
   */
  async getSportById(id) {
    const response = await this.fetch(`/sports/${id}`);
    return response.data;
  }

  /**
   * Create a new sport
   */
  async createSport(sportData) {
    const response = await this.fetch('/sports', {
      method: 'POST',
      body: JSON.stringify(sportData),
    });
    return response.data;
  }

  /**
   * Update multiple sports (bulk update)
   */
  async updateSportsBulk(updates) {
    const response = await this.fetch('/sports/bulk', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    return response.data;
  }

  /**
   * Delete sports (soft delete - set IS_DELETED to true)
   */
  async deleteSports(sportTypeIds) {
    const updates = sportTypeIds.map(id => ({
      sportTypeId: id,
      changes: { IS_DELETED: true },
    }));
    const response = await this.fetch('/sports/bulk', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    return response.data;
  }

  /**
   * Restore sports (set IS_DELETED to false)
   */
  async restoreSports(sportTypeIds) {
    const updates = sportTypeIds.map(id => ({
      sportTypeId: id,
      changes: { IS_DELETED: false },
    }));
    const response = await this.fetch('/sports/bulk', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    return response.data;
  }

  /**
   * Get all data sources (for list/edit)
   */
  async getDataSourcesList() {
    const response = await this.fetch('/data-sources');
    return response.data || [];
  }

  /**
   * Get data source by DATA_SOURCE_ID
   */
  async getDataSourceById(id) {
    const response = await this.fetch(`/data-sources/${id}`);
    return response.data;
  }

  /**
   * Create a new data source
   */
  async createDataSource(payload) {
    const response = await this.fetch('/data-sources', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  }

  /**
   * Update multiple data sources (bulk update)
   */
  async updateDataSourcesBulk(updates) {
    const response = await this.fetch('/data-sources/bulk', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    return response.data;
  }

  /**
   * Delete data sources (soft delete - set IS_DELETED to true)
   */
  async deleteDataSources(dataSourceIds) {
    const updates = dataSourceIds.map(id => ({
      dataSourceId: id,
      changes: { IS_DELETED: true },
    }));
    const response = await this.fetch('/data-sources/bulk', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    return response.data;
  }

  /**
   * Restore data sources (set IS_DELETED to false)
   */
  async restoreDataSources(dataSourceIds) {
    const updates = dataSourceIds.map(id => ({
      dataSourceId: id,
      changes: { IS_DELETED: false },
    }));
    const response = await this.fetch('/data-sources/bulk', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    return response.data;
  }

  /**
   * Get all languages (for list/edit)
   */
  async getLanguagesList() {
    const response = await this.fetch('/languages');
    return response.data || [];
  }

  /**
   * Get language by id
   */
  async getLanguageById(id) {
    const response = await this.fetch(`/languages/${id}`);
    return response.data;
  }

  /**
   * Create a new language
   */
  async createLanguage(payload) {
    const response = await this.fetch('/languages', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  }

  /**
   * Update multiple languages (bulk update)
   */
  async updateLanguagesBulk(updates) {
    const response = await this.fetch('/languages/bulk', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    return response.data;
  }

  /**
   * Delete languages (soft delete - set IS_DELETED to true)
   */
  async deleteLanguages(languageIds) {
    const updates = languageIds.map(id => ({
      languageId: id,
      changes: { IS_DELETED: true },
    }));
    const response = await this.fetch('/languages/bulk', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    return response.data;
  }

  /**
   * Restore languages (set IS_DELETED to false)
   */
  async restoreLanguages(languageIds) {
    const updates = languageIds.map(id => ({
      languageId: id,
      changes: { IS_DELETED: false },
    }));
    const response = await this.fetch('/languages/bulk', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    return response.data;
  }

  /**
   * Get all time zones (for list/edit)
   */
  async getTimeZonesList() {
    const response = await this.fetch('/time-zones');
    return response.data || [];
  }

  /**
   * Get time zone by TIME_ZONE_ID
   */
  async getTimeZoneById(id) {
    const response = await this.fetch(`/time-zones/${id}`);
    return response.data;
  }

  /**
   * Create a new time zone
   */
  async createTimeZone(payload) {
    const response = await this.fetch('/time-zones', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  }

  /**
   * Update multiple time zones (bulk update)
   */
  async updateTimeZonesBulk(updates) {
    const response = await this.fetch('/time-zones/bulk', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    return response.data;
  }

  /**
   * Delete time zones (soft delete - set IS_DELETED to true)
   */
  async deleteTimeZones(timeZoneIds) {
    const updates = timeZoneIds.map(id => ({
      timeZoneId: id,
      changes: { IS_DELETED: true },
    }));
    const response = await this.fetch('/time-zones/bulk', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    return response.data;
  }

  /**
   * Restore time zones (set IS_DELETED to false)
   */
  async restoreTimeZones(timeZoneIds) {
    const updates = timeZoneIds.map(id => ({
      timeZoneId: id,
      changes: { IS_DELETED: false },
    }));
    const response = await this.fetch('/time-zones/bulk', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    return response.data;
  }

  /**
   * Get TZDB time zones connected to a given time zone ID (T_TZDB_TIME_ZONES where CONNECTED_TIME_ZONE = id).
   */
  async getTzdbTimeZonesByConnectedId(connectedTimeZoneId) {
    const q = connectedTimeZoneId != null && connectedTimeZoneId !== '' ? `?connectedTimeZoneId=${encodeURIComponent(connectedTimeZoneId)}` : '';
    const response = await this.fetch(`/tzdb-time-zones${q}`);
    return response.data || [];
  }

  /**
   * Get TZDB time zones that are not connected (CONNECTED_TIME_ZONE is null or 0).
   */
  async getTzdbTimeZonesUnconnected() {
    const response = await this.fetch('/tzdb-time-zones?unconnected=true');
    return response.data || [];
  }

  /**
   * Update CONNECTED_TIME_ZONE for a TZDB record (by TIME_ZONE_NAME). Pass null to unlink.
   */
  async updateTzdbTimeZoneConnection(timeZoneName, connectedTimeZoneId) {
    const name = encodeURIComponent(timeZoneName);
    const response = await this.fetch(`/tzdb-time-zones/by-name/${name}`, {
      method: 'PATCH',
      body: JSON.stringify({ CONNECTED_TIME_ZONE: connectedTimeZoneId }),
    });
    return response.data;
  }

  /**
   * Get all athletes positions
   */
  async getAthletesPositions() {
    const response = await this.fetch('/data/athletes-positions');
    return response.data || [];
  }

  /**
   * Get all athlete status types
   */
  async getAthleteStatuses() {
    const response = await this.fetch('/data/athlete-statuses');
    return response.data || [];
  }

  /**
   * Get table settings (field options for table order parameters)
   */
  async getTableSettings() {
    const response = await this.fetch('/data/table-settings');
    return response.data || [];
  }

  /**
   * Get buzz item types (for competition BUZZ_ITEM_TYPE dropdown)
   */
  async getBuzzItemTypes() {
    const response = await this.fetch('/data/buzz-item-types');
    return response.data || [];
  }

  /**
   * Get all surfaces (tennis, basketball, football, swimming, etc.)
   */
  async getSurfaces() {
    const response = await this.fetch('/data/surfaces');
    return response.data || [];
  }

  /**
   * Get all tennis backhand types
   */
  async getTennisBackhandTypes() {
    const response = await this.fetch('/data/tennis-backhand-types');
    return response.data || [];
  }

  /**
   * Get all currencies
   */
  async getCurrencies() {
    const response = await this.fetch('/data/currencies');
    return response.data || [];
  }

  /**
   * Get all venues (from data endpoint - basic enrichment)
   */
  async getVenues() {
    const response = await this.fetch('/data/venues');
    return response.data || [];
  }

  /**
   * Get all venues with optional filters (from venues endpoint - enriched)
   */
  async getVenuesList(filters = {}) {
    const queryParams = new URLSearchParams();
    
    // Handle arrays for multi-select filters
    if (filters.country) {
      if (Array.isArray(filters.country)) {
        filters.country.forEach(country => queryParams.append('country', country));
      } else {
        queryParams.append('country', filters.country);
      }
    }
    if (filters.city) {
      if (Array.isArray(filters.city)) {
        filters.city.forEach(city => queryParams.append('city', city));
      } else {
        queryParams.append('city', filters.city);
      }
    }
    if (filters.venueId) queryParams.append('venueId', filters.venueId);
    if (filters.venueName) queryParams.append('venueName', filters.venueName);
    if (filters.language) queryParams.append('language', filters.language);
    if (filters.hasCapacity !== undefined) {
      queryParams.append('hasCapacity', filters.hasCapacity === true || filters.hasCapacity === 'true' ? 'true' : 'false');
    }
    if (filters.hasLocation !== undefined) {
      queryParams.append('hasLocation', filters.hasLocation === true || filters.hasLocation === 'true' ? 'true' : 'false');
    }
    
    const queryString = queryParams.toString();
    const url = `/venues${queryString ? `?${queryString}` : ''}`;
    const response = await this.fetch(url);
    return response.data || [];
  }

  /**
   * Get venue by ID
   */
  async getVenueById(id) {
    const response = await this.fetch(`/venues/${id}`);
    return response.data;
  }

  /**
   * Get TV network types (Broadcast, Streaming, etc.)
   */
  async getTvNetworkTypes() {
    const response = await this.fetch('/data/tv-network-types');
    return response.data || [];
  }

  /**
   * Get all TV networks with optional filters
   */
  async getTvNetworksList(filters = {}) {
    const queryParams = new URLSearchParams();
    if (filters.country) {
      if (Array.isArray(filters.country)) {
        filters.country.forEach(c => queryParams.append('country', c));
      } else {
        queryParams.append('country', filters.country);
      }
    }
    if (filters.tvNetworkId) queryParams.append('tvNetworkId', filters.tvNetworkId);
    if (filters.channelName) queryParams.append('channelName', filters.channelName);
    if (filters.language) queryParams.append('language', filters.language);
    const queryString = queryParams.toString();
    const url = `/tv-networks${queryString ? `?${queryString}` : ''}`;
    const response = await this.fetch(url);
    return response.data || [];
  }

  /**
   * Get TV network by ID
   */
  async getTvNetworkById(id) {
    const response = await this.fetch(`/tv-networks/${id}`);
    return response.data;
  }

  /**
   * Create a new TV network
   */
  async createTvNetwork(data) {
    const response = await this.fetch('/tv-networks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  /**
   * Update multiple TV networks (bulk update)
   */
  async updateTvNetworksBulk(updates) {
    const response = await this.fetch('/tv-networks/bulk', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    return response.data;
  }

  /**
   * Delete TV networks (soft delete - set IS_DELETED to true)
   */
  async deleteTvNetworks(tvNetworkIds) {
    const updates = tvNetworkIds.map(id => ({
      tvNetworkId: id,
      changes: { IS_DELETED: true },
    }));
    const response = await this.fetch('/tv-networks/bulk', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    return response.data;
  }

  /**
   * Restore TV networks (set IS_DELETED to false)
   */
  async restoreTvNetworks(tvNetworkIds) {
    const updates = tvNetworkIds.map(id => ({
      tvNetworkId: id,
      changes: { IS_DELETED: false },
    }));
    const response = await this.fetch('/tv-networks/bulk', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    return response.data;
  }

  /**
   * Create a new venue
   */
  async createVenue(venueData) {
    const response = await this.fetch('/venues', {
      method: 'POST',
      body: JSON.stringify(venueData),
    });
    return response.data;
  }

  /**
   * Create a new competitor
   */
  async createCompetitor(competitorData) {
    const response = await this.fetch('/competitors', {
      method: 'POST',
      body: JSON.stringify(competitorData),
    });
    return response.data;
  }

  /**
   * Create a new athlete
   */
  async createAthlete(athleteData) {
    const response = await this.fetch('/athletes', {
      method: 'POST',
      body: JSON.stringify(athleteData),
    });
    return response.data;
  }

  /**
   * Update multiple venues (bulk update)
   */
  async updateVenuesBulk(updates) {
    const response = await this.fetch('/venues/bulk', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    return response.data;
  }

  /**
   * Delete venues (soft delete - set IS_DELETED to true)
   */
  async deleteVenues(venueIds) {
    const updates = venueIds.map(id => ({
      venueId: id,
      changes: { IS_DELETED: true },
    }));
    const response = await this.fetch('/venues/bulk', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    return response.data;
  }

  /**
   * Restore venues (set IS_DELETED to false)
   */
  async restoreVenues(venueIds) {
    const updates = venueIds.map(id => ({
      venueId: id,
      changes: { IS_DELETED: false },
    }));
    const response = await this.fetch('/venues/bulk', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    return response.data;
  }

  /**
   * Update multiple athletes (bulk update)
   */
  async updateAthletesBulk(updates) {
    const response = await this.fetch('/athletes/bulk', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    return response.data;
  }

  /**
   * Delete athletes (soft delete - set IS_DELETED to true)
   */
  async deleteAthletes(athleteIds) {
    const updates = athleteIds.map(id => ({
      athleteId: id,
      changes: { IS_DELETED: true },
    }));
    const response = await this.fetch('/athletes/bulk', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    return response.data;
  }

  /**
   * Restore athletes (set IS_DELETED to false)
   */
  async restoreAthletes(athleteIds) {
    const updates = athleteIds.map(id => ({
      athleteId: id,
      changes: { IS_DELETED: false },
    }));
    const response = await this.fetch('/athletes/bulk', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    return response.data;
  }

  /**
   * Get all contracts for an athlete
   */
  async getAthleteContracts(athleteId) {
    const response = await this.fetch(`/athletes/${athleteId}/contracts`);
    return response.data || [];
  }

  /**
   * Create a new contract for an athlete
   */
  async createAthleteContract(athleteId, contractData) {
    const response = await this.fetch(`/athletes/${athleteId}/contracts`, {
      method: 'POST',
      body: JSON.stringify(contractData),
    });
    return response.data;
  }

  /**
   * Update a contract for an athlete
   */
  async updateAthleteContract(athleteId, contractId, contractData) {
    const response = await this.fetch(`/athletes/${athleteId}/contracts/${contractId}`, {
      method: 'PUT',
      body: JSON.stringify(contractData),
    });
    return response.data;
  }

  /**
   * Delete a contract for an athlete
   */
  async deleteAthleteContract(athleteId, contractId) {
    const response = await this.fetch(`/athletes/${athleteId}/contracts/${contractId}`, {
      method: 'DELETE',
    });
    return response.data;
  }

  /**
   * Get all statistics for an athlete
   */
  async getAthleteStatistics(athleteId) {
    const response = await this.fetch(`/athletes/${athleteId}/statistics`);
    return response.data || [];
  }

  /**
   * Get all statistics types
   */
  async getStatisticsTypes() {
    const response = await this.fetch('/data/statistics-types');
    return response.data || [];
  }

  /**
   * Get all seasons (optionally filtered by competition), enriched with name
   */
  async getSeasons(competitionId = null) {
    const url = competitionId != null && competitionId !== ''
      ? `/data/seasons?competitionId=${competitionId}`
      : '/data/seasons';
    const response = await this.fetch(url);
    return response.data || [];
  }

  /**
   * Get stages for a competition+season (enriched with name)
   */
  async getStages(competitionId, seasonNum) {
    const response = await this.fetch(
      `/data/stages?competitionId=${competitionId}&seasonNum=${seasonNum}`
    );
    return response.data || [];
  }

  /**
   * Get groups for a competition+season+stage (enriched with name)
   */
  async getGroups(competitionId, seasonNum, stageNum) {
    const response = await this.fetch(
      `/data/groups?competitionId=${competitionId}&seasonNum=${seasonNum}&stageNum=${stageNum}`
    );
    return response.data || [];
  }

  /**
   * Get phases for a competition+season (enriched with name)
   */
  async getPhases(competitionId, seasonNum) {
    const response = await this.fetch(
      `/data/phases?competitionId=${competitionId}&seasonNum=${seasonNum}`
    );
    return response.data || [];
  }

  /**
   * Create phase for a competition+season
   */
  async createPhase(competitionId, seasonNum, data) {
    const response = await this.fetch(
      `/data/competitions/${competitionId}/seasons/${seasonNum}/phases`,
      { method: 'POST', body: JSON.stringify(data) }
    );
    return response?.data;
  }

  /**
   * Update phase by competitionId + seasonNum + phaseNum
   */
  async updatePhase(competitionId, seasonNum, phaseNum, data) {
    const response = await this.fetch(
      `/data/competitions/${competitionId}/seasons/${seasonNum}/phases/${phaseNum}`,
      { method: 'PUT', body: JSON.stringify(data) }
    );
    return response?.data;
  }

  /**
   * Delete phase
   */
  async deletePhase(competitionId, seasonNum, phaseNum) {
    await this.fetch(
      `/data/competitions/${competitionId}/seasons/${seasonNum}/phases/${phaseNum}`,
      { method: 'DELETE' }
    );
  }

  /**
   * Create season for a competition
   */
  async createSeason(competitionId, data) {
    const response = await this.fetch(`/data/competitions/${competitionId}/seasons`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  /**
   * Update season by competitionId + seasonNum
   */
  async updateSeason(competitionId, seasonNum, data) {
    const response = await this.fetch(`/data/competitions/${competitionId}/seasons/${seasonNum}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  /**
   * Delete season (fails if it is the current season — BR-1)
   */
  async deleteSeason(competitionId, seasonNum) {
    await this.fetch(`/data/competitions/${competitionId}/seasons/${seasonNum}`, {
      method: 'DELETE',
    });
  }

  /**
   * Create stage for a competition+season
   */
  async createStage(competitionId, seasonNum, data) {
    const response = await this.fetch(`/data/competitions/${competitionId}/seasons/${seasonNum}/stages`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  /**
   * Update stage by competitionId + seasonNum + stageNum
   */
  async updateStage(competitionId, seasonNum, stageNum, data) {
    const response = await this.fetch(`/data/competitions/${competitionId}/seasons/${seasonNum}/stages/${stageNum}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  /**
   * Get stage standings (stage_tables) for a stage
   */
  async getStageStandings(competitionId, seasonNum, stageNum) {
    const response = await this.fetch(
      `/data/competitions/${competitionId}/seasons/${seasonNum}/stages/${stageNum}/standings`
    );
    return response.data || [];
  }

  /**
   * Update stage standings (stage_tables)
   */
  async updateStageStandings(competitionId, seasonNum, stageNum, rows) {
    const response = await this.fetch(
      `/data/competitions/${competitionId}/seasons/${seasonNum}/stages/${stageNum}/standings`,
      {
        method: 'PUT',
        body: JSON.stringify({ data: rows }),
      }
    );
    return response.data || [];
  }

  /**
   * Get stage table destinations
   */
  async getStageDestinations(competitionId, seasonNum, stageNum) {
    const response = await this.fetch(
      `/data/competitions/${competitionId}/seasons/${seasonNum}/stages/${stageNum}/destinations`
    );
    return response.data || [];
  }

  /**
   * Update stage table destinations
   */
  async updateStageDestinations(competitionId, seasonNum, stageNum, rows) {
    const response = await this.fetch(
      `/data/competitions/${competitionId}/seasons/${seasonNum}/stages/${stageNum}/destinations`,
      {
        method: 'PUT',
        body: JSON.stringify({ data: rows }),
      }
    );
    return response.data || [];
  }

  /**
   * Get stage points deductions
   */
  async getStagePointsDeductions(competitionId, seasonNum, stageNum) {
    const response = await this.fetch(
      `/data/competitions/${competitionId}/seasons/${seasonNum}/stages/${stageNum}/points-deductions`
    );
    return response.data || [];
  }

  /**
   * Update stage points deductions
   */
  async updateStagePointsDeductions(competitionId, seasonNum, stageNum, rows) {
    const response = await this.fetch(
      `/data/competitions/${competitionId}/seasons/${seasonNum}/stages/${stageNum}/points-deductions`,
      {
        method: 'PUT',
        body: JSON.stringify({ data: rows }),
      }
    );
    return response.data || [];
  }

  /**
   * Delete stage (fails if it is the current stage — BR-1)
   */
  async deleteStage(competitionId, seasonNum, stageNum) {
    await this.fetch(`/data/competitions/${competitionId}/seasons/${seasonNum}/stages/${stageNum}`, {
      method: 'DELETE',
    });
  }

  /**
   * Create group for a competition+season+stage
   */
  async createGroup(competitionId, seasonNum, stageNum, data) {
    const response = await this.fetch(
      `/data/competitions/${competitionId}/seasons/${seasonNum}/stages/${stageNum}/groups`,
      { method: 'POST', body: JSON.stringify(data) }
    );
    return response?.data;
  }

  /**
   * Update group by competitionId + seasonNum + stageNum + groupNum
   */
  async updateGroup(competitionId, seasonNum, stageNum, groupNum, data) {
    const response = await this.fetch(
      `/data/competitions/${competitionId}/seasons/${seasonNum}/stages/${stageNum}/groups/${groupNum}`,
      { method: 'PUT', body: JSON.stringify(data) }
    );
    return response?.data;
  }

  /**
   * Delete group
   */
  async deleteGroup(competitionId, seasonNum, stageNum, groupNum) {
    await this.fetch(
      `/data/competitions/${competitionId}/seasons/${seasonNum}/stages/${stageNum}/groups/${groupNum}`,
      { method: 'DELETE' }
    );
  }

  /**
   * Get competition winners (all seasons) with coach info.
   */
  async getCompetitionWinners(competitionId) {
    const response = await this.fetch(`/data/competitions/${competitionId}/winners`);
    return response.data || [];
  }

  /**
   * Save competition winners (WINNER flags + coach contracts).
   */
  async saveCompetitionWinners(competitionId, winners) {
    const response = await this.fetch(`/data/competitions/${competitionId}/winners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winners }),
    });
    return response;
  }

  /**
   * Validate if an athlete is a valid coach (has FORMATION_POSITION=24).
   */
  async validateCoach(athleteId) {
    const response = await this.fetch(`/data/athletes/${athleteId}/validate-coach`);
    return response;
  }

  /**
   * Get season competitors. If competitionId and seasonNum are passed, returns only those for that competition+season (enriched with name).
   */
  async getSeasonCompetitors(competitionId, seasonNum) {
    const q = (competitionId != null && competitionId !== '' && seasonNum != null && seasonNum !== '')
      ? `?competitionId=${competitionId}&seasonNum=${seasonNum}` : '';
    const response = await this.fetch(`/data/season-competitors${q}`);
    return response.data || [];
  }

  /**
   * Add competitors to a competition season. competitorIds: number[] or single number.
   */
  async addCompetitorsToSeason(competitionId, seasonNum, competitorIds) {
    const ids = Array.isArray(competitorIds) ? competitorIds : [competitorIds];
    const response = await this.fetch(
      `/data/competitions/${competitionId}/seasons/${seasonNum}/competitors`,
      { method: 'POST', body: JSON.stringify({ COMPETITOR_IDS: ids }) }
    );
    return response;
  }

  /**
   * Remove competitor from a competition season.
   */
  async removeCompetitorFromSeason(competitionId, seasonNum, competitorId) {
    await this.fetch(
      `/data/competitions/${competitionId}/seasons/${seasonNum}/competitors/${competitorId}`,
      { method: 'DELETE' }
    );
  }

  /**
   * Remove competitors from ALL seasons of this competition.
   */
  async removeCompetitorsFromAllSeasons(competitionId, competitorIds) {
    const ids = Array.isArray(competitorIds) ? competitorIds : [competitorIds];
    const response = await this.fetch(
      `/data/competitions/${competitionId}/competitors/all-seasons`,
      { method: 'DELETE', body: JSON.stringify({ COMPETITOR_IDS: ids }) }
    );
    return response;
  }

  /**
   * Update season competitor STATUS/SEED/NOT_IN_SEASON. Body: { STATUS?, SEED?, NOT_IN_SEASON? }.
   */
  async updateSeasonCompetitor(competitionId, seasonNum, competitorId, body) {
    const response = await this.fetch(
      `/data/competitions/${competitionId}/seasons/${seasonNum}/competitors/${competitorId}`,
      { method: 'PUT', body: JSON.stringify(body || {}) }
    );
    return response.data;
  }

  /**
   * Get competitors not in this competition+season (same sport). Optional filters: { countryId, name, sourceCompetitionId }.
   * sourceCompetitionId: only competitors that appear in that competition (any season).
   */
  async getCompetitorsNotInSeason(competitionId, seasonNum, filters = {}) {
    const params = new URLSearchParams();
    if (filters.countryId != null && filters.countryId !== '') params.set('countryId', filters.countryId);
    if (filters.name) params.set('name', filters.name);
    if (filters.sourceCompetitionId != null && filters.sourceCompetitionId !== '') params.set('sourceCompetitionId', filters.sourceCompetitionId);
    const q = params.toString() ? `?${params.toString()}` : '';
    const response = await this.fetch(
      `/data/competitions/${competitionId}/seasons/${seasonNum}/competitors/not-in-season${q}`
    );
    return response.data || [];
  }

  /**
   * Get competitors in a group (enriched with name). For Groups Competitors (2h).
   */
  async getGroupCompetitors(competitionId, seasonNum, stageNum, groupNum) {
    const response = await this.fetch(
      `/data/competitions/${competitionId}/seasons/${seasonNum}/stages/${stageNum}/groups/${groupNum}/competitors`
    );
    return response.data || [];
  }

  /**
   * Get competitors in season but not in any group of this stage (for "Add to Group"). BR-2: only competitors in season.
   */
  async getCompetitorsNotInGroups(competitionId, seasonNum, stageNum) {
    const response = await this.fetch(
      `/data/competitions/${competitionId}/seasons/${seasonNum}/stages/${stageNum}/competitors/not-in-groups`
    );
    return response.data || [];
  }

  /**
   * Add competitors to group. BR-2: if already in another group of this stage, removes from that group first.
   */
  async addCompetitorsToGroup(competitionId, seasonNum, stageNum, groupNum, competitorIds, participantNum = null) {
    const ids = Array.isArray(competitorIds) ? competitorIds : [competitorIds];
    const body = { COMPETITOR_IDS: ids };
    if (participantNum != null) body.PARTICIPANT_NUM = participantNum;
    await this.fetch(
      `/data/competitions/${competitionId}/seasons/${seasonNum}/stages/${stageNum}/groups/${groupNum}/competitors`,
      { method: 'POST', body: JSON.stringify(body) }
    );
  }

  /**
   * Update PARTICIPANT_NUM for a competitor in group.
   */
  async updateGroupCompetitorParticipant(competitionId, seasonNum, stageNum, groupNum, competitorId, participantNum) {
    await this.fetch(
      `/data/competitions/${competitionId}/seasons/${seasonNum}/stages/${stageNum}/groups/${groupNum}/competitors/${competitorId}`,
      { method: 'PUT', body: JSON.stringify({ PARTICIPANT_NUM: participantNum }) }
    );
  }

  /**
   * Remove competitor from group.
   */
  async removeCompetitorFromGroup(competitionId, seasonNum, stageNum, groupNum, competitorId) {
    await this.fetch(
      `/data/competitions/${competitionId}/seasons/${seasonNum}/stages/${stageNum}/groups/${groupNum}/competitors/${competitorId}`,
      { method: 'DELETE' }
    );
  }

  /**
   * Group Games (competition+season+stage+group)
   */
  async getGroupGames(competitionId, seasonNum, stageNum, groupNum) {
    const response = await this.fetch(
      `/data/competitions/${competitionId}/seasons/${seasonNum}/stages/${stageNum}/groups/${groupNum}/games`
    );
    return response.data || [];
  }

  async createGroupGame(competitionId, seasonNum, stageNum, groupNum, data) {
    const response = await this.fetch(
      `/data/competitions/${competitionId}/seasons/${seasonNum}/stages/${stageNum}/groups/${groupNum}/games`,
      { method: 'POST', body: JSON.stringify(data || {}) }
    );
    return response.data;
  }

  async updateGroupGame(competitionId, seasonNum, stageNum, groupNum, gameNum, data) {
    const response = await this.fetch(
      `/data/competitions/${competitionId}/seasons/${seasonNum}/stages/${stageNum}/groups/${groupNum}/games/${gameNum}`,
      { method: 'PUT', body: JSON.stringify(data || {}) }
    );
    return response.data;
  }

  async deleteGroupGame(competitionId, seasonNum, stageNum, groupNum, gameNum) {
    await this.fetch(
      `/data/competitions/${competitionId}/seasons/${seasonNum}/stages/${stageNum}/groups/${groupNum}/games/${gameNum}`,
      { method: 'DELETE' }
    );
  }

  /**
   * Group Participants (competition+season+stage+group)
   */
  async getGroupParticipants(competitionId, seasonNum, stageNum, groupNum) {
    const response = await this.fetch(
      `/data/competitions/${competitionId}/seasons/${seasonNum}/stages/${stageNum}/groups/${groupNum}/participants`
    );
    return response.data || [];
  }

  async createGroupParticipant(competitionId, seasonNum, stageNum, groupNum, data) {
    const response = await this.fetch(
      `/data/competitions/${competitionId}/seasons/${seasonNum}/stages/${stageNum}/groups/${groupNum}/participants`,
      { method: 'POST', body: JSON.stringify(data || {}) }
    );
    return response.data;
  }

  async updateGroupParticipant(competitionId, seasonNum, stageNum, groupNum, participantNum, data) {
    const response = await this.fetch(
      `/data/competitions/${competitionId}/seasons/${seasonNum}/stages/${stageNum}/groups/${groupNum}/participants/${participantNum}`,
      { method: 'PUT', body: JSON.stringify(data || {}) }
    );
    return response.data;
  }

  async deleteGroupParticipant(competitionId, seasonNum, stageNum, groupNum, participantNum) {
    await this.fetch(
      `/data/competitions/${competitionId}/seasons/${seasonNum}/stages/${stageNum}/groups/${groupNum}/participants/${participantNum}`,
      { method: 'DELETE' }
    );
  }

  /**
   * Create new statistics for an athlete
   */
  async createAthleteStatistics(athleteId, statisticsData) {
    const response = await this.fetch(`/athletes/${athleteId}/statistics`, {
      method: 'POST',
      body: JSON.stringify(statisticsData),
    });
    return response.data;
  }

  /**
   * Update statistics for an athlete
   */
  async updateAthleteStatistics(athleteId, competitionId, seasonNum, competitorId, statisticsData) {
    const response = await this.fetch(`/athletes/${athleteId}/statistics/${competitionId}/${seasonNum}/${competitorId}`, {
      method: 'PUT',
      body: JSON.stringify(statisticsData),
    });
    return response.data;
  }

  /**
   * Delete statistics for an athlete
   */
  async deleteAthleteStatistics(athleteId, competitionId, seasonNum, competitorId) {
    const response = await this.fetch(`/athletes/${athleteId}/statistics/${competitionId}/${seasonNum}/${competitorId}`, {
      method: 'DELETE',
    });
    return response.data;
  }

  /**
   * Get all injuries for an athlete
   */
  async getAthleteInjuries(athleteId) {
    const response = await this.fetch(`/athletes/${athleteId}/injuries`);
    return response.data || [];
  }

  /**
   * Create a new injury for an athlete
   */
  async createAthleteInjury(athleteId, injuryData) {
    const response = await this.fetch(`/athletes/${athleteId}/injuries`, {
      method: 'POST',
      body: JSON.stringify(injuryData),
    });
    return response.data;
  }

  /**
   * Update an injury for an athlete
   */
  async updateAthleteInjury(athleteId, injuryId, injuryData) {
    const response = await this.fetch(`/athletes/${athleteId}/injuries/${injuryId}`, {
      method: 'PUT',
      body: JSON.stringify(injuryData),
    });
    return response.data;
  }

  /**
   * Delete an injury for an athlete
   */
  async deleteAthleteInjury(athleteId, injuryId) {
    const response = await this.fetch(`/athletes/${athleteId}/injuries/${injuryId}`, {
      method: 'DELETE',
    });
    return response.data;
  }

  /**
   * Get all suspensions for an athlete
   */
  async getAthleteSuspensions(athleteId) {
    const response = await this.fetch(`/athletes/${athleteId}/suspensions`);
    return response.data || [];
  }

  /**
   * Create a new suspension for an athlete
   */
  async createAthleteSuspension(athleteId, suspensionData) {
    const response = await this.fetch(`/athletes/${athleteId}/suspensions`, {
      method: 'POST',
      body: JSON.stringify(suspensionData),
    });
    return response.data;
  }

  /**
   * Update a suspension for an athlete
   */
  async updateAthleteSuspension(athleteId, suspensionId, suspensionData) {
    const response = await this.fetch(`/athletes/${athleteId}/suspensions/${suspensionId}`, {
      method: 'PUT',
      body: JSON.stringify(suspensionData),
    });
    return response.data;
  }

  /**
   * Delete a suspension for an athlete
   */
  async deleteAthleteSuspension(athleteId, suspensionId) {
    const response = await this.fetch(`/athletes/${athleteId}/suspensions/${suspensionId}`, {
      method: 'DELETE',
    });
    return response.data;
  }

  /**
   * Get all trophies for an athlete
   */
  async getAthleteTrophies(athleteId) {
    const response = await this.fetch(`/athletes/${athleteId}/trophies`);
    return response.data || [];
  }

  /**
   * Create a new trophy for an athlete
   */
  async createAthleteTrophy(athleteId, trophyData) {
    const response = await this.fetch(`/athletes/${athleteId}/trophies`, {
      method: 'POST',
      body: JSON.stringify(trophyData),
    });
    return response.data;
  }

  /**
   * Update a trophy for an athlete
   */
  async updateAthleteTrophy(athleteId, competitionId, seasonNum, competitorId, trophyData) {
    const response = await this.fetch(`/athletes/${athleteId}/trophies/${competitionId}/${seasonNum}/${competitorId}`, {
      method: 'PUT',
      body: JSON.stringify(trophyData),
    });
    return response.data;
  }

  /**
   * Delete a trophy for an athlete
   */
  async deleteAthleteTrophy(athleteId, competitionId, seasonNum, competitorId) {
    const response = await this.fetch(`/athletes/${athleteId}/trophies/${competitionId}/${seasonNum}/${competitorId}`, {
      method: 'DELETE',
    });
    return response.data;
  }
  async getFiltersList(filters = {}) {
    const params = new URLSearchParams();
    if (filters.activeOnly === true || filters.activeOnly === 'true') params.append('activeOnly', 'true');
    if (filters.filterId) params.append('filterId', filters.filterId);
    const qs = params.toString();
    const response = await this.fetch(`/filters${qs ? `?${qs}` : ''}`);
    return response.data || [];
  }

  async createFilter(filterData) {
    const response = await this.fetch('/filters', {
      method: 'POST',
      body: JSON.stringify(filterData),
    });
    return response.data;
  }

  async updateFiltersBulk(updates) {
    const response = await this.fetch('/filters/bulk', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    return response.data;
  }

  /**
   * Get temporary (unidentified) records for an entity (countries, competitions, ...).
   * Server-side filtering + pagination; the response also contains facet lists
   * describing which sport-types / data-sources actually exist in the temp
   * table (so the UI dropdowns only offer relevant values).
   *
   * @param {string} entity
   * @param {object} [params]
   * @param {string} [params.search]           Substring match on NAME.
   * @param {number[]} [params.sportTypeIds]   Restrict SPORT_TYPE_ID values.
   * @param {number[]} [params.dataSourceIds]  Restrict DATA_SOURCE_ID values.
   * @param {boolean} [params.showHidden]      Include ACTIVE=0 rows.
   * @param {number} [params.page]             0-based page index.
   * @param {number} [params.pageSize]         Page size.
   * @returns {Promise<{rows: Array, total: number, page: number, pageSize: number,
   *                    facets: { sportTypes: Array<{id:number,label:string,count:number}>,
   *                              dataSources: Array<{id:number,label:string,count:number}> }}>}
   */
  async getTempEntities(entity, params = {}) {
    const qp = new URLSearchParams();
    if (params.search) qp.append('search', params.search);
    if (Array.isArray(params.sportTypeIds)) {
      params.sportTypeIds.forEach((id) => qp.append('sportTypeIds', String(id)));
    }
    if (Array.isArray(params.dataSourceIds)) {
      params.dataSourceIds.forEach((id) => qp.append('dataSourceIds', String(id)));
    }
    if (Array.isArray(params.countryIds)) {
      params.countryIds.forEach((id) => qp.append('countryIds', String(id)));
    }
    if (Array.isArray(params.competitionIds)) {
      params.competitionIds.forEach((id) => qp.append('competitionIds', String(id)));
    }
    if (Array.isArray(params.competitorIds)) {
      params.competitorIds.forEach((id) => qp.append('competitorIds', String(id)));
    }
    if (params.showHidden !== undefined) {
      qp.append('showHidden', params.showHidden ? 'true' : 'false');
    }
    if (params.page !== undefined) qp.append('page', String(params.page));
    if (params.pageSize !== undefined) qp.append('pageSize', String(params.pageSize));

    const qs = qp.toString();
    const url = `/temp/${encodeURIComponent(entity)}${qs ? `?${qs}` : ''}`;
    const response = await this.fetch(url);
    const data = response.data || {};
    return {
      rows: Array.isArray(data.rows) ? data.rows : [],
      total: Number(data.total) || 0,
      page: Number(data.page) || 0,
      pageSize: Number(data.pageSize) || 0,
      facets: data.facets || { sportTypes: [], dataSources: [] },
    };
  }

  /**
   * Update fields on a single temporary record (e.g. toggle ACTIVE).
   * id must match the entity's id field (e.g. COUNTRY_ID for countries).
   */
  async updateTempEntity(entity, id, changes) {
    const response = await this.fetch(
      `/temp/${encodeURIComponent(entity)}/${encodeURIComponent(id)}`,
      { method: 'PUT', body: JSON.stringify(changes || {}) }
    );
    return response.data;
  }

  /**
   * Delete one temporary record.
   */
  async deleteTempEntity(entity, id) {
    const response = await this.fetch(
      `/temp/${encodeURIComponent(entity)}/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    );
    return response.data;
  }

  /**
   * Bulk delete temporary records.
   */
  async deleteTempEntitiesBulk(entity, ids) {
    const response = await this.fetch(
      `/temp/${encodeURIComponent(entity)}/bulk-delete`,
      { method: 'POST', body: JSON.stringify({ ids }) }
    );
    return response.data;
  }

  /**
   * Connect one or more temporary records of `entity` to an existing entity
   * by adding their NAME (under their LANG_ID) as values to the target's term.
   * After the connect the temp rows are removed.
   *
   * tempIds: number[], targetId: id of the existing entity to connect to.
   */
  async connectTempEntities(entity, tempIds, targetId) {
    const response = await this.fetch(
      `/temp/${encodeURIComponent(entity)}/connect`,
      { method: 'POST', body: JSON.stringify({ tempIds, targetId }) }
    );
    return response.data;
  }

  /**
   * Ask the server which existing entities best match the NAME of the
   * supplied temp rows. Server returns an ordered list of suggestions.
   *
   * The backend gates this (no suggestions when > 3 temp rows, names must
   * be longer than 3 characters) and returns an empty array in those cases.
   *
   * @param {string} entity e.g. 'countries'.
   * @param {Array<{NAME: string, LANG_ID?: number}>} tempRows
   *        Up to 3 rows (typically the rows currently selected in the UI).
   *        Passing full rows (rather than just ids) matters because temp
   *        files can contain multiple records sharing the same id.
   * @param {object} [opts]
   * @param {number} [opts.limit=3]
   * @returns {Promise<{ suggestions: Array<{ countryId: number, score: number,
   *                      reason: { tempIndex: number, matchedText: string,
   *                                matchedLang: number|null, kind: string,
   *                                perRowScore: number } }> }>}
   */
  async suggestTempMatches(entity, tempRows, opts = {}) {
    const rows = (tempRows || []).map((r) => ({
      NAME: r?.NAME ?? r?.name ?? '',
      LANG_ID: r?.LANG_ID ?? r?.languageId ?? null,
      COUNTRY_ID: r?.COUNTRY_ID ?? null,
    }));
    const body = { rows };
    if (opts.limit != null) body.limit = Number(opts.limit);
    if (Array.isArray(opts.countryIds) && opts.countryIds.length > 0) {
      body.countryIds = opts.countryIds;
    }
    if (Array.isArray(opts.competitionIds) && opts.competitionIds.length > 0) {
      body.competitionIds = opts.competitionIds;
    }
    if (Array.isArray(opts.competitorIds) && opts.competitorIds.length > 0) {
      body.competitorIds = opts.competitorIds;
    }
    const response = await this.fetch(
      `/temp/${encodeURIComponent(entity)}/suggest`,
      { method: 'POST', body: JSON.stringify(body) }
    );
    return response.data || { suggestions: [] };
  }
}

export default new ApiService();
