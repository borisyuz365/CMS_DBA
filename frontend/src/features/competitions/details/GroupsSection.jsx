import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CompetitorsNotInGroupsTable from './CompetitorsNotInGroupsTable';
import GroupAccordionSummary from './GroupAccordionSummary';
import GroupCompetitorsTable from './GroupCompetitorsTable';
import GroupGamesTable from './GroupGamesTable';
import GroupParticipantsTable from './GroupParticipantsTable';
import GroupTransferToolbar from './GroupTransferToolbar';
import GroupsToolbar from './GroupsToolbar';

export default function GroupsSection({
  structureSeasons,
  selectedSeasonNum,
  selectedStageNum,
  expandedStructureSection,
  groupsByStage,
  selectedGroupNum,
  groupCompetitorCounts,
  groupCompetitorsInGroup,
  groupCompetitorsNotInGroups,
  groupGames,
  groupParticipants,
  selectedInGroup,
  selectedNotInGroups,
  loadingGroupCompetitors,
  loadingGroupGames,
  loadingGroupParticipants,
  editingGroupGameIndex,
  editingGroupGameOriginalNum,
  editingGroupParticipantIndex,
  onExpandedStructureSectionChange,
  onSelectedGroupNumChange,
  onSelectedInGroupChange,
  onSelectedNotInGroupsChange,
  onGroupCompetitorsInGroupChange,
  onGroupGamesChange,
  onGroupParticipantsChange,
  onEditingGroupGameIndexChange,
  onEditingGroupGameOriginalNumChange,
  onEditingGroupParticipantIndexChange,
  onAddGroup,
  onGroupNameClick,
  onOpenGroupEditDialog,
  onDeleteGroup,
  onParticipantNumChange,
  onAddGroupGame,
  onDeleteGroupGame,
  onSaveGroupGame,
  onAddGroupParticipant,
  onDeleteGroupParticipant,
  onSaveGroupParticipant,
  onParticipantNameClick,
  onAddToGroup,
  onRemoveFromGroup,
}) {
  if (structureSeasons.length === 0 || selectedSeasonNum == null || selectedStageNum == null) return null;

  const stageKey = `${selectedSeasonNum}-${selectedStageNum}`;
  const groupsList = groupsByStage[stageKey] || [];

  const handleGroupSelectionChange = (nextGroupNum) => {
    onSelectedGroupNumChange(nextGroupNum);
    if (nextGroupNum == null) {
      onSelectedInGroupChange([]);
      onSelectedNotInGroupsChange([]);
    }
  };

  const renderGroups = () => {
    if (groupsList.length === 0 && groupsByStage[stageKey] === undefined) {
      return (
        <Typography color="text.secondary" sx={{ py: 2 }}>
          Loading groups…
        </Typography>
      );
    }

    if (groupsList.length === 0) {
      return (
        <Typography color="text.secondary" sx={{ py: 2 }}>
          No groups for this stage. Create one to get started.
        </Typography>
      );
    }

    const sortedGroups = [...groupsList].sort((a, b) => Number(a.GROUP_NUM) - Number(b.GROUP_NUM));

    return (
      <Box sx={{ '& .MuiAccordion-root': { '&:before': { display: 'none' }, boxShadow: 'none', border: '1px solid #e0e0e0', borderRadius: 1, '& + .MuiAccordion-root': { mt: 1 } } }}>
        {sortedGroups.map((group) => {
          const isExpanded = Number(group.GROUP_NUM) === Number(selectedGroupNum);
          const count = groupCompetitorCounts[group.GROUP_NUM] ?? (isExpanded ? groupCompetitorsInGroup.length : null);
          const countLabel = count != null ? `${count} competitor${count !== 1 ? 's' : ''}` : '—';

          return (
            <Accordion
              key={group.GROUP_NUM}
              expanded={isExpanded}
              onChange={() => handleGroupSelectionChange(isExpanded ? null : group.GROUP_NUM)}
              sx={{ '&.Mui-expanded': { margin: 0 } }}
            >
              <AccordionSummary
                expandIcon={null}
                sx={{
                  minHeight: 48,
                  '& .MuiAccordionSummary-content': { margin: 0, alignItems: 'center', flex: 1 },
                  flexDirection: 'row-reverse',
                }}
              >
                <GroupAccordionSummary
                  group={group}
                  isExpanded={isExpanded}
                  countLabel={countLabel}
                  onGroupNameClick={(event) => {
                    event.stopPropagation();
                    onGroupNameClick(event, selectedSeasonNum, selectedStageNum, group);
                  }}
                  onEditGroup={(event) => {
                    event.stopPropagation();
                    onOpenGroupEditDialog(group, selectedSeasonNum, selectedStageNum);
                  }}
                  onDeleteGroup={(event) => {
                    event.stopPropagation();
                    onDeleteGroup(selectedSeasonNum, selectedStageNum, group);
                  }}
                  onToggleGroup={() => handleGroupSelectionChange(isExpanded ? null : group.GROUP_NUM)}
                />
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0, pb: 2, px: 2 }}>
                <GroupCompetitorsTable
                  competitors={groupCompetitorsInGroup}
                  selectedCompetitorIds={selectedInGroup}
                  loading={loadingGroupCompetitors}
                  selectedSeasonNum={selectedSeasonNum}
                  selectedStageNum={selectedStageNum}
                  groupNum={group.GROUP_NUM}
                  onSelectedCompetitorIdsChange={onSelectedInGroupChange}
                  onCompetitorsChange={onGroupCompetitorsInGroupChange}
                  onParticipantNumChange={onParticipantNumChange}
                />
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mt: 2 }}>
                  <GroupGamesTable
                    games={groupGames}
                    loading={loadingGroupGames}
                    editingIndex={editingGroupGameIndex}
                    editingOriginalGameNum={editingGroupGameOriginalNum}
                    selectedSeasonNum={selectedSeasonNum}
                    selectedStageNum={selectedStageNum}
                    groupNum={group.GROUP_NUM}
                    onAddGame={onAddGroupGame}
                    onDeleteGame={onDeleteGroupGame}
                    onSaveGame={onSaveGroupGame}
                    onGamesChange={onGroupGamesChange}
                    onEditingIndexChange={onEditingGroupGameIndexChange}
                    onEditingOriginalGameNumChange={onEditingGroupGameOriginalNumChange}
                  />
                  <GroupParticipantsTable
                    participants={groupParticipants}
                    loading={loadingGroupParticipants}
                    editingIndex={editingGroupParticipantIndex}
                    selectedSeasonNum={selectedSeasonNum}
                    selectedStageNum={selectedStageNum}
                    groupNum={group.GROUP_NUM}
                    onAddParticipant={onAddGroupParticipant}
                    onDeleteParticipant={onDeleteGroupParticipant}
                    onSaveParticipant={onSaveGroupParticipant}
                    onParticipantNameClick={onParticipantNameClick}
                    onParticipantsChange={onGroupParticipantsChange}
                    onEditingIndexChange={onEditingGroupParticipantIndexChange}
                  />
                </Box>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>
    );
  };

  return (
    <Accordion
      expanded={expandedStructureSection === 'groups'}
      onChange={() => onExpandedStructureSectionChange((prev) => (prev === 'groups' ? null : 'groups'))}
      sx={{
        '&:before': { display: 'none' },
        boxShadow: 'none',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        mb: 2,
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Groups ({groupsList.length})
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 2, alignItems: 'stretch' }}>
          <Box sx={{ flex: { xs: '1 1 100%', lg: '55 55 55%' }, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <GroupsToolbar onCreateGroup={() => onAddGroup(selectedSeasonNum, selectedStageNum)} />
            {renderGroups()}
          </Box>

          <Box sx={{ flex: { xs: '1 1 100%', lg: '45 45 45%' }, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <GroupTransferToolbar
              selectedNotInGroupsCount={selectedNotInGroups.length}
              selectedInGroupCount={selectedInGroup.length}
              hasSelectedGroup={selectedGroupNum != null}
              onAddToGroup={() => onAddToGroup(selectedSeasonNum, selectedStageNum, selectedGroupNum)}
              onRemoveFromGroup={() => onRemoveFromGroup(selectedSeasonNum, selectedStageNum, selectedGroupNum)}
            />
            <CompetitorsNotInGroupsTable
              competitors={groupCompetitorsNotInGroups}
              selectedCompetitorIds={selectedNotInGroups}
              loading={loadingGroupCompetitors}
              hasSelectedGroup={selectedGroupNum != null}
              onSelectedCompetitorIdsChange={onSelectedNotInGroupsChange}
            />
          </Box>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
