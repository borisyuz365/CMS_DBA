import React from 'react';
import {
  Box, FormControl, InputLabel, Select, MenuItem, Checkbox, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import api from '../../services/api';

const demoCompetitionTeams = {
  34: [1, 8, 15],
  14: [2, 9, 16],
  // ... more teams
};

const demoTeams = [
  { id: 1, name: 'Real Madrid', country: 'Spain', logo: 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg' },
  { id: 2, name: 'FC Barcelona', country: 'Spain', logo: 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg' },
  // ... more teams
];

function NotInSeasonCompetitors({ currentCompetitionId, currentSport, selectedNotInSeason, setSelectedNotInSeason, selectedSeason }) {
  const [competitions, setCompetitions] = React.useState([]);
  const [countryOptions, setCountryOptions] = React.useState([]);
  const [country, setCountry] = React.useState('');
  const [competitionId, setCompetitionId] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  // Fetch competitions from API
  React.useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        setLoading(true);
        const response = await api.getCompetitions();
        if (response.success && response.data) {
          const transformedData = response.data.map(comp => ({
            id: comp.COMPETITION_ID || comp.id,
            name: comp.name || `Competition ${comp.COMPETITION_ID}`,
            country: comp.country || 'Unknown',
            sport: comp.sport || 'Unknown',
          }));
          setCompetitions(transformedData);
          
          // Extract unique countries
          const uniqueCountries = [...new Set(transformedData.map(c => c.country).filter(Boolean))].sort();
          setCountryOptions(uniqueCountries);
        }
      } catch (err) {
        console.error('Failed to fetch competitions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompetitions();
  }, []);

  const currentCompetition = competitions.find(c => c.id === Number(currentCompetitionId));

  React.useEffect(() => {
    if (!country && countryOptions.length > 0) {
      setCountry(currentCompetition?.country || countryOptions[0]);
    }
  }, [currentCompetition, country, countryOptions]);

  const filteredCompetitions = React.useMemo(
    () => competitions.filter(c => c.country === country && c.sport === currentSport),
    [competitions, country, currentSport]
  );

  React.useEffect(() => {
    if (filteredCompetitions.length > 0 && !filteredCompetitions.some(c => c.id === competitionId)) {
      setCompetitionId(filteredCompetitions[0].id);
    }
  }, [country, currentSport, filteredCompetitions, competitionId]);

  const teamIds = demoCompetitionTeams[competitionId] || [];
  // Filter out teams already in selectedSeason.teams
  const inSeasonIds = selectedSeason?.teams?.map(t => t.id) || [];
  const teams = teamIds
    .map(id => demoTeams.find(t => t.id === id))
    .filter(Boolean)
    .filter(team => !inSeasonIds.includes(team.id));

  // Select all logic
  const allIds = teams.map(t => t.id);
  const allSelected = allIds.length > 0 && selectedNotInSeason.length === allIds.length;
  const someSelected = selectedNotInSeason.length > 0 && selectedNotInSeason.length < allIds.length;

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Select country</InputLabel>
          <Select
            value={country}
            label="Select country"
            onChange={e => setCountry(e.target.value)}
            disabled={countryOptions.length === 0}
          >
            {countryOptions.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Select competition</InputLabel>
          <Select
            value={competitionId}
            label="Select competition"
            onChange={e => setCompetitionId(e.target.value)}
            disabled={filteredCompetitions.length === 0}
          >
            {filteredCompetitions.map(opt => (
              <MenuItem key={opt.id} value={opt.id}>{opt.name} (#{opt.id})</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={e => {
                    if (e.target.checked) setSelectedNotInSeason(allIds);
                    else setSelectedNotInSeason([]);
                  }}
                  inputProps={{ 'aria-label': 'select all not in season' }}
                />
              </TableCell>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Country</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {teams.map((team, idx) => (
              <TableRow
                key={team.id}
                selected={selectedNotInSeason.includes(team.id)}
                onClick={e => {
                  if (e.target.type === 'checkbox') return;
                  if (selectedNotInSeason.includes(team.id)) {
                    setSelectedNotInSeason(selectedNotInSeason.filter(id => id !== team.id));
                  } else {
                    setSelectedNotInSeason([...selectedNotInSeason, team.id]);
                  }
                }}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedNotInSeason.includes(team.id)}
                    onChange={e => {
                      if (e.target.checked) setSelectedNotInSeason([...selectedNotInSeason, team.id]);
                      else setSelectedNotInSeason(selectedNotInSeason.filter(id => id !== team.id));
                    }}
                    inputProps={{ 'aria-label': `select team ${team.id}` }}
                  />
                </TableCell>
                <TableCell>{team.id}</TableCell>
                <TableCell>
                  {team.logo && (
                    <img src={team.logo} alt={team.name} style={{ width: 28, height: 28, verticalAlign: 'middle', marginRight: 8, borderRadius: 4, background: '#fff', border: '1px solid #eee' }} />
                  )}
                  {team.name}
                </TableCell>
                <TableCell>{team.country}</TableCell>
              </TableRow>
            ))}
            {teams.length === 0 && (
              <TableRow><TableCell colSpan={4} align="center">No teams found for this competition.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default NotInSeasonCompetitors; 