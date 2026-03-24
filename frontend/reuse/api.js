// Dynamically determine API URL based on current hostname
// This allows the app to work when accessed from other devices on the network
const getApiBaseUrl = () => {
  // If REACT_APP_API_URL is explicitly set, use it
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Otherwise, use the current hostname (works for both localhost and network access)
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = '3001';
  
  // If accessing from localhost, use localhost for API
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001/api';
  }
  
  // Otherwise, use the same hostname (for network access)
  return `${protocol}//${hostname}:${port}/api`;
};

const API_BASE_URL = getApiBaseUrl();

// Log API URL for debugging (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('API Base URL:', API_BASE_URL);
}

class ApiService {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Request failed');
      }
      
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Competitions
  async getCompetitions() {
    return this.request('/competitions');
  }

  async getCompetition(id) {
    return this.request(`/competitions/${id}`);
  }

  async createCompetition(competition) {
    return this.request('/competitions', {
      method: 'POST',
      body: competition,
    });
  }

  async updateCompetition(id, competition) {
    return this.request(`/competitions/${id}`, {
      method: 'PUT',
      body: competition,
    });
  }

  async deleteCompetition(id) {
    return this.request(`/competitions/${id}`, {
      method: 'DELETE',
    });
  }

  // Countries
  async getCountries() {
    return this.request('/countries');
  }

  async getCountry(id) {
    return this.request(`/countries/${id}`);
  }

  // Sports
  async getSports() {
    return this.request('/sports');
  }

  async getSport(id) {
    return this.request(`/sports/${id}`);
  }

  // Seasons
  async getSeasons(competitionId) {
    if (competitionId) {
      return this.request(`/seasons/${competitionId}`);
    }
    return this.request('/seasons');
  }

  async createSeason(season) {
    return this.request('/seasons', {
      method: 'POST',
      body: season,
    });
  }

  async updateSeason(id, season) {
    return this.request(`/seasons/${id}`, {
      method: 'PUT',
      body: season,
    });
  }

  async deleteSeason(id) {
    return this.request(`/seasons/${id}`, {
      method: 'DELETE',
    });
  }

  async createTerm(term) {
    return this.request('/dictionary/terms', {
      method: 'POST',
      body: term,
    });
  }

  // Stages
  async getStages(competitionId, seasonNum) {
    if (competitionId && seasonNum) {
      return this.request(`/stages/${competitionId}/${seasonNum}`);
    }
    return this.request('/stages');
  }

  async createStage(stage) {
    return this.request('/stages', {
      method: 'POST',
      body: stage,
    });
  }

  async updateStage(id, stage) {
    return this.request(`/stages/${id}`, {
      method: 'PUT',
      body: stage,
    });
  }

  async deleteStage(id) {
    return this.request(`/stages/${id}`, {
      method: 'DELETE',
    });
  }

  // Groups
  async getGroups(competitionId, seasonNum, stageNum) {
    if (competitionId && seasonNum && stageNum) {
      return this.request(`/groups/${competitionId}/${seasonNum}/${stageNum}`);
    }
    return this.request('/groups');
  }

  async createGroup(group) {
    return this.request('/groups', {
      method: 'POST',
      body: group,
    });
  }

  async updateGroup(id, group) {
    return this.request(`/groups/${id}`, {
      method: 'PUT',
      body: group,
    });
  }

  async deleteGroup(id) {
    return this.request(`/groups/${id}`, {
      method: 'DELETE',
    });
  }

  // Phases
  async getPhases(competitionId, seasonNum) {
    if (competitionId && seasonNum) {
      return this.request(`/phases/${competitionId}/${seasonNum}`);
    }
    return this.request('/phases');
  }

  async createPhase(phase) {
    return this.request('/phases', {
      method: 'POST',
      body: phase,
    });
  }

  async updatePhase(id, phase) {
    return this.request(`/phases/${id}`, {
      method: 'PUT',
      body: phase,
    });
  }

  // Terms
  async getTerm(id) {
    return this.request(`/dictionary/terms/${id}`);
  }

  async findTermByCategoryAndValue(categoryId, engValue) {
    return this.request(`/dictionary/terms/search?categoryId=${categoryId}&engValue=${encodeURIComponent(engValue)}`);
  }

  async getTermsByCategory(categoryId, search = '') {
    const searchParam = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request(`/dictionary/terms/category/${categoryId}${searchParam}`);
  }

  // Competitors
  async getCompetitors() {
    return this.request('/competitors');
  }

  async getCompetitorsByCompetition(competitionId) {
    return this.request(`/competitors/competition/${competitionId}`);
  }

  async getCompetitorsBySeason(competitionId, seasonNum) {
    return this.request(`/competitors/season/${competitionId}/${seasonNum}`);
  }

  async getCompetitorsNotInSeason(competitionId, seasonNum, filters = {}) {
    const queryParams = new URLSearchParams();
    if (filters.country) queryParams.append('country', filters.country);
    if (filters.competition) queryParams.append('competition', filters.competition);
    if (filters.competitorName) queryParams.append('competitorName', filters.competitorName);
    
    const queryString = queryParams.toString();
    const url = `/competitors/not-in-season/${competitionId}/${seasonNum}${queryString ? '?' + queryString : ''}`;
    return this.request(url);
  }

  async getCompetitorsInGroups(competitionId, seasonNum, stageNum) {
    return this.request(`/competitors/groups/${competitionId}/${seasonNum}/${stageNum}`);
  }

  async getCompetitorsNotInGroups(competitionId, seasonNum, stageNum) {
    return this.request(`/competitors/not-in-groups/${competitionId}/${seasonNum}/${stageNum}`);
  }

  async addCompetitorToGroup(competitionId, seasonNum, stageNum, groupNum, competitorIds, participantNum = null) {
    // Support both single ID and array of IDs
    const ids = Array.isArray(competitorIds) ? competitorIds : [competitorIds];
    return this.request(`/competitors/groups/${competitionId}/${seasonNum}/${stageNum}/${groupNum}`, {
      method: 'POST',
      body: { competitorIds: ids, participantNum },
    });
  }

  async removeCompetitorFromGroup(competitionId, seasonNum, stageNum, groupNum, competitorIds) {
    // Support both single ID and array of IDs
    const ids = Array.isArray(competitorIds) ? competitorIds : [competitorIds];
    return this.request(`/competitors/groups/${competitionId}/${seasonNum}/${stageNum}/${groupNum}`, {
      method: 'DELETE',
      body: { competitorIds: ids },
    });
  }

  async addCompetitorsToSeason(competitionId, seasonNum, competitorIds) {
    return this.request(`/competitors/season/${competitionId}/${seasonNum}`, {
      method: 'POST',
      body: { competitorIds },
    });
  }

  async removeCompetitorsFromSeason(competitionId, seasonNum, competitorIds) {
    return this.request(`/competitors/season/${competitionId}/${seasonNum}`, {
      method: 'DELETE',
      body: { competitorIds },
    });
  }
}

export default new ApiService();

