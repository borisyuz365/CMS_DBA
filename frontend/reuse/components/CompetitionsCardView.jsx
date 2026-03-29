import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Checkbox,
  Box,
  Typography,
  Button,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import SportsBasketballIcon from '@mui/icons-material/SportsBasketball';
import MaleIcon from '@mui/icons-material/Male';
import FemaleIcon from '@mui/icons-material/Female';
import TransgenderIcon from '@mui/icons-material/Transgender';

function getGenderIcon(gender) {
  if (gender === 'Male') return <MaleIcon fontSize="small" sx={{ color: '#1976d2' }} />;
  if (gender === 'Female') return <FemaleIcon fontSize="small" sx={{ color: '#e91e63' }} />;
  return <TransgenderIcon fontSize="small" sx={{ color: '#9c27b0' }} />;
}

function getSportIcon(sport) {
  if (sport === 'Football') return <SportsSoccerIcon fontSize="small" sx={{ color: '#388e3c' }} />;
  if (sport === 'Basketball') return <SportsBasketballIcon fontSize="small" sx={{ color: '#ff9800' }} />;
  return null;
}

export default function CompetitionsCardView({
  competitions,
  selectedIds,
  onSelectionChange,
  onEdit,
  onTermEdit,
  onPartnerIdClick,
  countryFlags,
  getGenderIcon: customGetGenderIcon,
  getSportIcon: customGetSportIcon,
}) {
  const getGender = customGetGenderIcon || getGenderIcon;
  const getSport = customGetSportIcon || getSportIcon;

  const handleCheckboxChange = (competitionId, checked) => {
    if (checked) {
      onSelectionChange([...selectedIds, competitionId]);
    } else {
      onSelectionChange(selectedIds.filter(id => id !== competitionId));
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {competitions.map((competition) => (
        <Card
          key={competition.id}
          sx={{
            opacity: competition.deleted ? 0.7 : 1,
            backgroundColor: competition.deleted ? '#f0f0f0' : 'background.paper',
            border: selectedIds.includes(competition.id) ? '2px solid' : '1px solid',
            borderColor: selectedIds.includes(competition.id) ? 'primary.main' : 'divider',
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                <Checkbox
                  checked={selectedIds.includes(competition.id)}
                  onChange={(e) => handleCheckboxChange(competition.id, e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                  size="small"
                />
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                  {competition.name}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                  ID:
                </Typography>
                <Button
                  variant="text"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(competition.id);
                  }}
                  sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
                >
                  {competition.id}
                </Button>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                  Competition:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <EmojiEventsIcon fontSize="small" sx={{ color: '#FFD700' }} />
                  <Button
                    variant="text"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTermEdit(competition.nameId);
                    }}
                    sx={{ 
                      color: '#1976d2', 
                      textTransform: 'none', 
                      fontWeight: 600,
                      p: 0,
                      minWidth: 'auto',
                    }}
                  >
                    {competition.name}
                  </Button>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                  Gender:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {getGender(competition.gender)}
                  <Typography variant="body2">{competition.gender}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                  Country:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {countryFlags[competition.country] && (
                    <Typography variant="body2" sx={{ fontSize: '1.2rem' }}>
                      {countryFlags[competition.country]}
                    </Typography>
                  )}
                  <Typography variant="body2">{competition.country}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                  Sport:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {getSport(competition.sport)}
                  <Typography variant="body2">{competition.sport}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                  Colors:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Chip
                    label="Main"
                    size="small"
                    sx={{
                      backgroundColor: competition.mainColor || '#000000',
                      color: '#fff',
                      minWidth: 60,
                    }}
                  />
                  {competition.secondaryColor && (
                    <Chip
                      label="Secondary"
                      size="small"
                      sx={{
                        backgroundColor: competition.secondaryColor,
                        color: '#fff',
                        minWidth: 60,
                      }}
                    />
                  )}
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                  P.ID:
                </Typography>
                <Button
                  variant="text"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPartnerIdClick(competition);
                  }}
                  sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
                >
                  {competition.pid || competition.id}
                </Button>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                  Priority:
                </Typography>
                <Typography variant="body2">{competition.priority || 'N/A'}</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
