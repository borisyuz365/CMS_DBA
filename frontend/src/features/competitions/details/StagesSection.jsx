import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import StageDetailsForm from './StageDetailsForm';
import StagesTable from './StagesTable';
import StagesToolbar from './StagesToolbar';

export default function StagesSection({
  structureSeasons,
  selectedSeasonNum,
  expandedStructureSection,
  stagesBySeason,
  phasesBySeason,
  stagesTypes,
  competition,
  selectedStageNum,
  isStageEditMode,
  pendingStageChanges,
  pendingCurrentStage,
  selectedStagesForDelete,
  stagesDraggingStageNum,
  stagesDropTargetIndex,
  structureStageForm,
  allTerms,
  positionTableNamesTermOptions,
  allCompetitions,
  tableTypes,
  onExpandedStructureSectionChange,
  onOpenCreateGenerate,
  onDeleteSelectedStages,
  onToggleStageEditMode,
  onSaveStageEdits,
  onSelectedStageNumChange,
  onSelectedStagesForDeleteChange,
  onStagesDraggingStageNumChange,
  onStagesDropTargetIndexChange,
  onStagesReorderDrop,
  onStageNameClick,
  onStageFieldChange,
  onPendingCurrentStageChange,
  onStageFormChange,
  onOpenManageStandingsDialog,
}) {
  if (structureSeasons.length === 0 || selectedSeasonNum == null) return null;

  const stages = stagesBySeason[selectedSeasonNum] || [];
  const phases = phasesBySeason[selectedSeasonNum] || [];

  const currentStage = (() => {
    if (competition?.CURRENT_SEASON === selectedSeasonNum && competition?.CURRENT_STAGE != null) {
      return stages.find((stage) => stage.STAGE_NUM === competition.CURRENT_STAGE);
    }
    return null;
  })();

  return (
    <Accordion
      expanded={expandedStructureSection === 'stages'}
      onChange={() => onExpandedStructureSectionChange((prev) => (prev === 'stages' ? null : 'stages'))}
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
          Stages ({stages.length})
          {currentStage && (
            <Typography component="span" sx={{ fontWeight: 400, color: 'text.secondary', ml: 1 }}>
              — Current Stage: {currentStage.name || `Stage ${currentStage.STAGE_NUM}`} ({currentStage.STAGE_NUM})
            </Typography>
          )}
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        <StagesToolbar
          isEditMode={isStageEditMode}
          selectedStagesCount={selectedStagesForDelete.length}
          pendingChangesCount={Object.keys(pendingStageChanges).length}
          hasPendingCurrentStage={pendingCurrentStage != null}
          onOpenCreateGenerate={onOpenCreateGenerate}
          onDeleteSelectedStages={onDeleteSelectedStages}
          onToggleEditMode={onToggleStageEditMode}
          onSaveStageEdits={onSaveStageEdits}
        />

        <StagesTable
          stages={stages}
          stagesTypes={stagesTypes}
          phases={phases}
          competition={competition}
          selectedSeasonNum={selectedSeasonNum}
          selectedStageNum={selectedStageNum}
          isEditMode={isStageEditMode}
          pendingStageChanges={pendingStageChanges}
          pendingCurrentStage={pendingCurrentStage}
          selectedStagesForDelete={selectedStagesForDelete}
          draggingStageNum={stagesDraggingStageNum}
          dropTargetIndex={stagesDropTargetIndex}
          onSelectedStageNumChange={onSelectedStageNumChange}
          onSelectedStagesForDeleteChange={onSelectedStagesForDeleteChange}
          onDraggingStageNumChange={onStagesDraggingStageNumChange}
          onDropTargetIndexChange={onStagesDropTargetIndexChange}
          onStagesReorderDrop={onStagesReorderDrop}
          onStageNameClick={onStageNameClick}
          onStageFieldChange={onStageFieldChange}
          onPendingCurrentStageChange={onPendingCurrentStageChange}
        />

        {structureStageForm && (
          <StageDetailsForm
            stageForm={structureStageForm}
            allTerms={allTerms}
            positionTableNamesTermOptions={positionTableNamesTermOptions}
            allCompetitions={allCompetitions}
            tableTypes={tableTypes}
            competition={competition}
            showTableOptions={!isStageEditMode}
            onStageFormChange={onStageFormChange}
            onOpenManageStandingsDialog={onOpenManageStandingsDialog}
          />
        )}
      </AccordionDetails>
    </Accordion>
  );
}
