import React from 'react';
import {
  Box,
  Typography,
} from '@mui/material';
import LoadingSpinner from '../../../../reuse/LoadingSpinner';
import CompetitorsInSeasonTable from './CompetitorsInSeasonTable';
import CompetitorsNotInSeasonTable from './CompetitorsNotInSeasonTable';
import SeasonCompetitorTransferToolbar from './SeasonCompetitorTransferToolbar';

export default function SeasonCompetitorsSection({
  competitionId,
  competition,
  seasonForm,
  competitorsLoading,
  competitorsInSeason,
  competitorsNotInSeason,
  selectedInSeason,
  selectedNotInSeason,
  rowsPerPageInSeason,
  pageInSeason,
  rowsPerPageNotInSeason,
  pageNotInSeason,
  competitorsNotInSeasonFilters,
  countries,
  allCompetitions,
  onSelectedInSeasonChange,
  onSelectedNotInSeasonChange,
  onCompetitorsInSeasonChange,
  onPageInSeasonChange,
  onRowsPerPageInSeasonChange,
  onPageNotInSeasonChange,
  onRowsPerPageNotInSeasonChange,
  onCompetitorsNotInSeasonFiltersChange,
  onSeasonCompetitorStatusChange,
  onSeasonCompetitorStatusSeedBlur,
  onSeasonCompetitorNotInSeasonChange,
  onAddToSeason,
  onRemoveSelectedFromSeason,
  onRemoveFromAllSeasonsClick,
  onLoadCompetitors,
}) {
  return (
    <>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
        Season Competitors
      </Typography>
      {competitorsLoading ? (
        <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
          <LoadingSpinner />
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2,
            alignItems: { xs: 'stretch', md: 'stretch' },
          }}
        >
          <CompetitorsInSeasonTable
            seasonForm={seasonForm}
            competitors={competitorsInSeason}
            selectedCompetitorIds={selectedInSeason}
            rowsPerPage={rowsPerPageInSeason}
            page={pageInSeason}
            countries={countries}
            allCompetitions={allCompetitions}
            onSelectedCompetitorIdsChange={onSelectedInSeasonChange}
            onCompetitorsChange={onCompetitorsInSeasonChange}
            onPageChange={onPageInSeasonChange}
            onRowsPerPageChange={onRowsPerPageInSeasonChange}
            onStatusChange={onSeasonCompetitorStatusChange}
            onStatusSeedBlur={onSeasonCompetitorStatusSeedBlur}
            onNotInSeasonChange={onSeasonCompetitorNotInSeasonChange}
          />

          <SeasonCompetitorTransferToolbar
            selectedNotInSeasonCount={selectedNotInSeason.length}
            selectedInSeasonCount={selectedInSeason.length}
            onAddToSeason={onAddToSeason}
            onRemoveSelectedFromSeason={onRemoveSelectedFromSeason}
            onRemoveFromAllSeasonsClick={onRemoveFromAllSeasonsClick}
          />

          <CompetitorsNotInSeasonTable
            competitionId={competitionId}
            competition={competition}
            competitors={competitorsNotInSeason}
            selectedCompetitorIds={selectedNotInSeason}
            rowsPerPage={rowsPerPageNotInSeason}
            page={pageNotInSeason}
            filters={competitorsNotInSeasonFilters}
            countries={countries}
            allCompetitions={allCompetitions}
            onSelectedCompetitorIdsChange={onSelectedNotInSeasonChange}
            onPageChange={onPageNotInSeasonChange}
            onRowsPerPageChange={onRowsPerPageNotInSeasonChange}
            onFiltersChange={onCompetitorsNotInSeasonFiltersChange}
            onLoadCompetitors={onLoadCompetitors}
          />
        </Box>
      )}
    </>
  );
}
