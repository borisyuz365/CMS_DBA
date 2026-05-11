import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LoadingSpinner from '../../../../reuse/LoadingSpinner';

export default function ManageStandingsDialog({
  open,
  stageName,
  selectedStageNum,
  selectedSeasonNum,
  groupsByStage,
  stagesBySeason,
  structureSeasons,
  manageStandingsData,
  manageStandingsOriginal,
  manageStandingsLoading,
  manageStandingsSaving,
  manageStandingsGroupFilter,
  manageStandingsEditMode,
  manageStandingsRecalculateLive,
  manageStandingsMultiStageEnabled,
  manageStandingsSelectedStages,
  manageStandingsDestinationsExpanded,
  manageStandingsDestinations,
  manageStandingsDestinationsOriginal,
  manageStandingsLoadPrevEnabled,
  manageStandingsLoadPrevSeason,
  manageStandingsLoadPrevStage,
  manageStandingsPointsDeductionsExpanded,
  manageStandingsPointsDeductions,
  manageStandingsPointsDeductionsOriginal,
  tableDestinationsTermOptions,
  pointsDeductionReasonsTermOptions,
  allTerms,
  tableTypes,
  destinationNameCreating,
  pointsDeductionReasonCreating,
  api,
  onClose,
  onSave,
  onGroupFilterChange,
  onEditModeChange,
  onRecalculateLiveChange,
  onMultiStageEnabledChange,
  onSelectedStagesChange,
  onDestinationsExpandedChange,
  onLoadPrevEnabledChange,
  onLoadPrevSeasonChange,
  onLoadPrevStageChange,
  onPointsDeductionsExpandedChange,
  updateManageStandingsRow,
  loadStagesAndPhases,
  loadTermsAndCategories,
  setSnackbar,
  setDestinationNameCreating,
  setPointsDeductionReasonCreating,
  destinationTypeOptions,
  tableTypeOptions,
  handleAddDestination,
  handleUpdateDestination,
  handleRemoveDestination,
  handleRemoveAllDestinations,
  handleDestinationNameClick,
  handleAddPointsDeduction,
  handleUpdatePointsDeduction,
  handleRemovePointsDeduction,
  handleRemoveAllPointsDeductions,
  handleReasonTermClick,
}) {  return (
<Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { minHeight: '70vh' } }}>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              Standings for Stage: {stageName || `Stage ${selectedStageNum}`}
              <IconButton size="small" onClick={onClose} aria-label="Close">
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 0 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minHeight: 400 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  {manageStandingsData.some((r) => r.GROUP_NUM != null && Number(r.GROUP_NUM) !== -1) && (() => {
                    const groupsList = groupsByStage[`${selectedSeasonNum}-${selectedStageNum}`] || [];
                    const getGroupName = (gn) => {
                      if (gn === -1) return 'No Group';
                      const gr = groupsList.find((g) => Number(g.GROUP_NUM) === Number(gn));
                      return gr?.name || `Group ${gn}`;
                    };
                    return (
                      <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Stage Group</InputLabel>
                        <Select
                          label="Stage Group"
                          value={manageStandingsGroupFilter === null ? '__all__' : manageStandingsGroupFilter}
                          onChange={(e) => onGroupFilterChange(e.target.value === '__all__' ? null : e.target.value)}
                          renderValue={(v) => (v === '__all__' ? 'All' : getGroupName(v))}
                        >
                          <MenuItem value="__all__">All</MenuItem>
                          {[...new Set(manageStandingsData.map((r) => r.GROUP_NUM))].sort((a, b) => a - b).map((gn) => (
                            <MenuItem key={gn} value={gn}>{getGroupName(gn)}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    );
                  })()}
                  <FormControlLabel
                    control={<Switch size="small" checked={manageStandingsEditMode} onChange={(e) => onEditModeChange(e.target.checked)} />}
                    label={manageStandingsEditMode ? 'Edit' : 'View'}
                  />
                  <Button variant="contained" size="small" sx={{ textTransform: 'none', color: 'white', backgroundColor: '#dc2626', '&:hover': { backgroundColor: '#b91c1c' }, ml: 'auto' }} onClick={() => {}}>Delete Standings</Button>
                </Box>
                {manageStandingsLoading ? (
                  <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                    <LoadingSpinner />
                  </Box>
                ) : (
                  <TableContainer sx={{ flex: 1, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Id</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Group</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="center">Pos.</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="center">Played</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="center">W</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="center">D</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="center">L</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="center">For</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="center">Against</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="center">GD</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="center">Pts</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="center">%</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(manageStandingsGroupFilter != null
                          ? manageStandingsData.filter((r) => Number(r.GROUP_NUM) === Number(manageStandingsGroupFilter))
                          : manageStandingsData
                        )
                          .sort((a, b) => (Number(a.POSITION) || 0) - (Number(b.POSITION) || 0))
                          .map((r) => {
                            const played = Number(r.GAMES_PLAYED) || 0;
                            const pts = Number(r.POINTS) || 0;
                            const pct = played > 0 && pts >= 0 ? Math.round((pts / (played * 3)) * 100) : 0;
                            const gd = (Number(r.TOTAL_FOR) || 0) - (Number(r.TOTAL_AGAINST) || 0);
                            const EditableCell = ({ field, val }) =>
                              manageStandingsEditMode ? (
                                <TextField
                                  size="small"
                                  type="number"
                                  value={r[field] ?? ''}
                                  onChange={(e) => updateManageStandingsRow(r.COMPETITOR_NUM, r.GROUP_NUM, field, e.target.value)}
                                  inputProps={{ style: { width: 48, textAlign: 'center', padding: '4px 8px' } }}
                                  sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'divider' } } }}
                                />
                              ) : (
                                <span>{val}</span>
                              );
                            return (
                              <TableRow key={`${r.COMPETITOR_NUM}-${r.GROUP_NUM}`} hover>
                                <TableCell>{r.COMPETITOR_NUM}</TableCell>
                                <TableCell>{r.competitorName || `Competitor ${r.COMPETITOR_NUM}`}</TableCell>
                                <TableCell>{r.GROUP_NUM === -1 ? '—' : r.GROUP_NUM}</TableCell>
                                <TableCell align="center"><EditableCell field="POSITION" val={r.POSITION ?? 0} /></TableCell>
                                <TableCell align="center"><EditableCell field="GAMES_PLAYED" val={r.GAMES_PLAYED ?? 0} /></TableCell>
                                <TableCell align="center"><EditableCell field="GAMES_WON" val={r.GAMES_WON ?? 0} /></TableCell>
                                <TableCell align="center"><EditableCell field="GAMES_EVEN" val={r.GAMES_EVEN ?? 0} /></TableCell>
                                <TableCell align="center"><EditableCell field="GAMES_LOST" val={r.GAMES_LOST ?? 0} /></TableCell>
                                <TableCell align="center"><EditableCell field="TOTAL_FOR" val={r.TOTAL_FOR ?? 0} /></TableCell>
                                <TableCell align="center"><EditableCell field="TOTAL_AGAINST" val={r.TOTAL_AGAINST ?? 0} /></TableCell>
                                <TableCell align="center">{gd}</TableCell>
                                <TableCell align="center"><EditableCell field="POINTS" val={r.POINTS ?? 0} /></TableCell>
                                <TableCell align="center">{pct}</TableCell>
                              </TableRow>
                            );
                          })}
                        {manageStandingsData.length === 0 && !manageStandingsLoading && (
                          <TableRow>
                            <TableCell colSpan={13} align="center" sx={{ py: 3 }} color="text.secondary">
                              No standings data. Enable Has Table on this stage and save to generate.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', justifyContent: 'flex-start', mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Button variant="outlined" size="small" sx={{ textTransform: 'none' }} onClick={() => {}}>Reload Missing Competitors</Button>
                  <Button variant="outlined" size="small" sx={{ textTransform: 'none' }} onClick={() => {}}>Reorder</Button>
                  <Button variant="outlined" size="small" sx={{ textTransform: 'none' }} onClick={() => {}}>Clear</Button>
                  <Button variant="outlined" size="small" sx={{ textTransform: 'none' }} onClick={() => {}} disabled>Reset</Button>
                  <Button variant="outlined" size="small" sx={{ textTransform: 'none' }} onClick={() => {}}>Recalculate By Games</Button>
                  <Button variant="outlined" size="small" sx={{ textTransform: 'none' }} onClick={() => {}}>Send Update</Button>
                  <FormControlLabel
                    control={<Checkbox size="small" checked={manageStandingsRecalculateLive} onChange={(e) => onRecalculateLiveChange(e.target.checked)} />}
                    label="Recalculate live upon save"
                    sx={{ ml: 0.5 }}
                  />
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={manageStandingsMultiStageEnabled}
                        onChange={(e) => {
                          onMultiStageEnabledChange(e.target.checked);
                          if (!e.target.checked) onSelectedStagesChange([]);
                        }}
                      />
                    }
                    label="Recalculate Multiple Stages"
                    sx={{ ml: 0, mr: 0 }}
                  />
                  <Autocomplete
                    multiple
                    size="small"
                    disabled={!manageStandingsMultiStageEnabled}
                    options={(stagesBySeason[selectedSeasonNum] || []).map((s) => s.STAGE_NUM)}
                    value={manageStandingsSelectedStages}
                    onChange={(_, val) => onSelectedStagesChange(val)}
                    getOptionLabel={(opt) => {
                      const s = (stagesBySeason[selectedSeasonNum] || []).find((st) => st.STAGE_NUM === opt);
                      return s?.name || `Stage ${opt}`;
                    }}
                    renderTags={(value, getTagProps) =>
                      value.map((opt, index) => {
                        const s = (stagesBySeason[selectedSeasonNum] || []).find((st) => st.STAGE_NUM === opt);
                        return <Chip variant="outlined" size="small" label={s?.name || `Stage ${opt}`} {...getTagProps({ index })} />;
                      })
                    }
                    renderInput={(params) => <TextField {...params} label="Stages" placeholder={manageStandingsMultiStageEnabled ? 'Select stages...' : ''} />}
                    sx={{ minWidth: 280, flex: 1, maxWidth: 480 }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{ textTransform: 'none' }}
                    disabled={!manageStandingsMultiStageEnabled || manageStandingsSelectedStages.length === 0}
                    onClick={() => {}}
                  >
                    Recalculate Multiple Stages
                  </Button>
                </Box>

                {/* Destinations section – collapsible */}
                <Accordion
                  expanded={manageStandingsDestinationsExpanded}
                  onChange={(_, exp) => onDestinationsExpandedChange(exp)}
                  sx={{ mt: 3, '&:before': { display: 'none' }, boxShadow: 'none', border: 1, borderColor: 'divider', borderRadius: 1 }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 48, '& .MuiAccordionSummary-content': { my: 1 } }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Destinations ({manageStandingsDestinations.length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', mb: 1.5 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={manageStandingsLoadPrevEnabled}
                            onChange={(e) => {
                              onLoadPrevEnabledChange(e.target.checked);
                              if (!e.target.checked) {
                                onLoadPrevSeasonChange(null);
                                onLoadPrevStageChange(null);
                              }
                            }}
                          />
                        }
                        label="Load From Previous Stage"
                        sx={{ ml: 0, mr: 0 }}
                      />
                      <FormControl size="small" sx={{ minWidth: 180 }} disabled={!manageStandingsLoadPrevEnabled}>
                        <InputLabel>Season</InputLabel>
                        <Select
                          value={manageStandingsLoadPrevSeason ?? ''}
                          label="Season"
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : e.target.value;
                            onLoadPrevSeasonChange(val);
                            onLoadPrevStageChange(null);
                            if (val != null && stagesBySeason[val] === undefined) {
                              loadStagesAndPhases(val);
                            }
                          }}
                        >
                          <MenuItem value=""><em>None</em></MenuItem>
                          {structureSeasons.map((s) => (
                            <MenuItem key={s.SEASON_NUM} value={s.SEASON_NUM}>
                              #{s.SEASON_NUM} - {s.name || `Season ${s.SEASON_NUM}`}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <FormControl size="small" sx={{ minWidth: 180 }} disabled={!manageStandingsLoadPrevEnabled || manageStandingsLoadPrevSeason == null}>
                        <InputLabel>Stage</InputLabel>
                        <Select
                          value={manageStandingsLoadPrevStage ?? ''}
                          label="Stage"
                          onChange={(e) => onLoadPrevStageChange(e.target.value === '' ? null : e.target.value)}
                        >
                          <MenuItem value=""><em>None</em></MenuItem>
                          {(stagesBySeason[manageStandingsLoadPrevSeason] || []).map((s) => (
                            <MenuItem key={s.STAGE_NUM} value={s.STAGE_NUM}>
                              {s.name || `Stage ${s.STAGE_NUM}`}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{ textTransform: 'none' }}
                        disabled={!manageStandingsLoadPrevEnabled || manageStandingsLoadPrevSeason == null || manageStandingsLoadPrevStage == null}
                        onClick={() => {}}
                      >
                        Add Destinations
                      </Button>
                    </Box>
                    <Box sx={{ mb: 1 }}>
                      <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={handleAddDestination} sx={{ textTransform: 'none' }}>
                        Add New Destination
                      </Button>
                    </Box>
                    <TableContainer sx={{ maxHeight: 240, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, width: 48 }}>Color</TableCell>
                          <TableCell sx={{ fontWeight: 600, minWidth: 140 }}>Name</TableCell>
                          <TableCell sx={{ fontWeight: 600, width: 70 }} align="center">D. Num</TableCell>
                          <TableCell sx={{ fontWeight: 600, minWidth: 120 }}>D. Type</TableCell>
                          <TableCell sx={{ fontWeight: 600, minWidth: 100 }}>Table Type</TableCell>
                          <TableCell sx={{ fontWeight: 600, width: 80 }} align="center">Group Num</TableCell>
                          <TableCell sx={{ fontWeight: 600, width: 90 }} align="center">From Pos.</TableCell>
                          <TableCell sx={{ fontWeight: 600, width: 90 }} align="center">To Pos.</TableCell>
                          <TableCell sx={{ fontWeight: 600, width: 48 }} align="center" padding="checkbox" />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {manageStandingsDestinations.map((d, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell sx={{ py: 0.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ width: 20, height: 20, borderRadius: 0.5, bgcolor: (d.COLOR && /^#[0-9A-Fa-f]{6}$/.test(d.COLOR)) ? d.COLOR : '#e0e0e0', border: '1px solid #ccc', flexShrink: 0 }} />
                                <TextField size="small" value={d.COLOR || ''} onChange={(e) => handleUpdateDestination(idx, 'COLOR', e.target.value)} placeholder="#hex" inputProps={{ style: { width: 56, fontSize: '0.75rem' } }} sx={{ '& .MuiInput-root': { fontSize: '0.75rem' } }} />
                              </Box>
                            </TableCell>
                            <TableCell sx={{ py: 0.5 }}>
                              <Autocomplete
                                key={`dest-name-${idx}-${d.NAME_ID || 'empty'}`}
                                size="small"
                                freeSolo
                                options={tableDestinationsTermOptions}
                                getOptionLabel={(opt) => (typeof opt === 'string' ? opt : (opt?.engValue || opt?.values?.[0]?.value || `Term ${opt?.id}` || ''))}
                                value={d.NAME_ID && d.NAME_ID !== 0 ? ((allTerms || []).find((t) => t.id === d.NAME_ID) || null) : null}
                                isOptionEqualToValue={(opt, val) => (opt && val && (opt.id === val.id))}
                                filterOptions={(options, { inputValue }) => {
                                  const trim = (inputValue || '').trim();
                                  if (trim.length < 3) return [];
                                  const lower = trim.toLowerCase();
                                  return options.filter((opt) => {
                                    const label = (opt?.engValue || opt?.values?.[0]?.value || '').toLowerCase();
                                    return String(label).includes(lower);
                                  });
                                }}
                                onChange={async (_, v) => {
                                  if (v == null) {
                                    handleUpdateDestination(idx, 'NAME_ID', 0);
                                    return;
                                  }
                                  if (typeof v === 'object' && v?.id) {
                                    handleUpdateDestination(idx, 'NAME_ID', v.id);
                                    return;
                                  }
                                  if (typeof v === 'string' && (v || '').trim()) {
                                    const txt = String(v).trim();
                                    setDestinationNameCreating(idx);
                                    try {
                                      const newTerm = await api.createTerm({
                                        category: 'Table Destinations',
                                        values: [{ languageId: 1, value: txt, isDefault: true, status: 'Approved' }],
                                      });
                                      const tid = newTerm?.id ?? newTerm;
                                      handleUpdateDestination(idx, 'NAME_ID', tid);
                                      await loadTermsAndCategories();
                                      setSnackbar({ open: true, message: 'Destination term created', severity: 'success' });
                                    } catch (err) {
                                      setSnackbar({ open: true, message: err.message || 'Failed to create term', severity: 'error' });
                                    } finally {
                                      setDestinationNameCreating(null);
                                    }
                                  }
                                }}
                                disabled={destinationNameCreating === idx}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    size="small"
                                    placeholder="Type 3+ chars for suggestions or enter new"
                                    InputProps={{
                                      ...params.InputProps,
                                      endAdornment: (
                                        <>
                                          {params.InputProps.endAdornment}
                                          {d.NAME_ID && (
                                            <InputAdornment position="end">
                                              <IconButton
                                                size="small"
                                                onClick={(e) => handleDestinationNameClick(e, d.NAME_ID)}
                                                aria-label="Edit term"
                                                sx={{ mr: -0.5 }}
                                              >
                                                <EditIcon fontSize="small" />
                                              </IconButton>
                                            </InputAdornment>
                                          )}
                                        </>
                                      ),
                                    }}
                                  />
                                )}
                                sx={{ minWidth: 160, '& .MuiInputBase-input': { py: 0.5, fontSize: '0.8rem' } }}
                              />
                            </TableCell>
                            <TableCell align="center" sx={{ py: 0.5 }}>{d.DESTINATION_NUM ?? idx + 1}</TableCell>
                            <TableCell sx={{ py: 0.5 }}>
                              <Select
                                size="small"
                                value={d.DESTINATION_TYPE ?? 0}
                                onChange={(e) => handleUpdateDestination(idx, 'DESTINATION_TYPE', Number(e.target.value))}
                                sx={{ minWidth: 100, fontSize: '0.8rem', '& .MuiSelect-select': { py: 0.5 } }}
                              >
                                {destinationTypeOptions.map((o) => (
                                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                                ))}
                              </Select>
                            </TableCell>
                            <TableCell sx={{ py: 0.5 }}>
                              <Select
                                size="small"
                                value={d.TABLE_TYPE ?? 0}
                                onChange={(e) => handleUpdateDestination(idx, 'TABLE_TYPE', Number(e.target.value))}
                                sx={{ minWidth: 90, fontSize: '0.8rem', '& .MuiSelect-select': { py: 0.5 } }}
                              >
                                {tableTypeOptions.map((o) => (
                                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                                ))}
                              </Select>
                            </TableCell>
                            <TableCell sx={{ py: 0.5 }}>
                              <TextField
                                size="small"
                                type="number"
                                value={d.GROUP_NUM ?? ''}
                                onChange={(e) => handleUpdateDestination(idx, 'GROUP_NUM', e.target.value === '' ? 0 : Number(e.target.value))}
                                inputProps={{ min: 0, style: { width: 48, textAlign: 'center' } }}
                                sx={{ '& .MuiInput-input': { py: 0.5 } }}
                              />
                            </TableCell>
                            <TableCell sx={{ py: 0.5 }}>
                              <TextField
                                size="small"
                                type="number"
                                value={d.FROM_POSITION ?? ''}
                                onChange={(e) => handleUpdateDestination(idx, 'FROM_POSITION', e.target.value === '' ? 0 : Number(e.target.value))}
                                inputProps={{ min: 0, style: { width: 48, textAlign: 'center' } }}
                                sx={{ '& .MuiInput-input': { py: 0.5 } }}
                              />
                            </TableCell>
                            <TableCell sx={{ py: 0.5 }}>
                              <TextField
                                size="small"
                                type="number"
                                value={d.TO_POSITION ?? ''}
                                onChange={(e) => handleUpdateDestination(idx, 'TO_POSITION', e.target.value === '' ? 0 : Number(e.target.value))}
                                inputProps={{ min: 0, style: { width: 48, textAlign: 'center' } }}
                                sx={{ '& .MuiInput-input': { py: 0.5 } }}
                              />
                            </TableCell>
                            <TableCell sx={{ py: 0.5 }} padding="checkbox">
                              <IconButton size="small" onClick={() => handleRemoveDestination(idx)} sx={{ color: '#dc2626' }} aria-label="Delete">
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                      <Button variant="outlined" size="small" sx={{ textTransform: 'none', color: '#dc2626', borderColor: '#dc2626', '&:hover': { borderColor: '#b91c1c', bgcolor: 'rgba(220,38,38,0.04)' } }} onClick={handleRemoveAllDestinations} disabled={manageStandingsDestinations.length === 0}>
                        Remove All Destinations
                      </Button>
                      <Typography variant="body2" color="text.secondary">Total Items: {manageStandingsDestinations.length}</Typography>
                    </Box>
                  </AccordionDetails>
                </Accordion>

                {/* Points Deductions section – collapsible, collapsed by default */}
                <Accordion
                  expanded={manageStandingsPointsDeductionsExpanded}
                  onChange={(_, exp) => onPointsDeductionsExpandedChange(exp)}
                  sx={{ mt: 3, '&:before': { display: 'none' }, boxShadow: 'none', border: 1, borderColor: 'divider', borderRadius: 1 }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 48, '& .MuiAccordionSummary-content': { my: 1 } }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Points Deductions ({manageStandingsPointsDeductions.length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0 }}>
                    <Box sx={{ mb: 1 }}>
                      <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={handleAddPointsDeduction} sx={{ textTransform: 'none' }}>
                        Add Points Deduction
                      </Button>
                    </Box>
                    <TableContainer sx={{ maxHeight: 240, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600, width: 40 }} align="center">#</TableCell>
                            <TableCell sx={{ fontWeight: 600, minWidth: 160 }}>Name</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: 70 }} align="center">Points</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: 80 }} align="center">Goals For</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: 90 }} align="center">Goals Against</TableCell>
                            <TableCell sx={{ fontWeight: 600, minWidth: 140 }}>Reason</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: 110 }}>Date</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: 48 }} align="center" padding="checkbox" />
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {manageStandingsPointsDeductions.map((pd, idx) => (
                            <TableRow key={idx} hover>
                              <TableCell align="center" sx={{ py: 0.5 }}>{idx + 1}</TableCell>
                              <TableCell sx={{ py: 0.5 }}>
                                <Autocomplete
                                  size="small"
                                  options={manageStandingsData}
                                  getOptionLabel={(opt) => opt?.competitorName || `Competitor ${opt?.COMPETITOR_NUM || ''}`}
                                  value={manageStandingsData.find((c) => Number(c.COMPETITOR_NUM) === Number(pd.COMPETITOR_NUM)) || null}
                                  onChange={(_, v) => handleUpdatePointsDeduction(idx, 'COMPETITOR_NUM', v ? Number(v.COMPETITOR_NUM) : 0)}
                                  renderInput={(params) => (
                                    <TextField {...params} size="small" placeholder="Select competitor" sx={{ '& .MuiInputBase-input': { py: 0.5, fontSize: '0.8rem' } }} />
                                  )}
                                  sx={{ minWidth: 140 }}
                                />
                              </TableCell>
                              <TableCell sx={{ py: 0.5 }}>
                                <TextField
                                  size="small"
                                  type="number"
                                  value={pd.POINTS ?? ''}
                                  onChange={(e) => handleUpdatePointsDeduction(idx, 'POINTS', e.target.value === '' ? 0 : Number(e.target.value))}
                                  inputProps={{ min: -999, style: { width: 48, textAlign: 'center' } }}
                                  sx={{ '& .MuiInput-input': { py: 0.5 } }}
                                />
                              </TableCell>
                              <TableCell sx={{ py: 0.5 }}>
                                <TextField
                                  size="small"
                                  type="number"
                                  value={pd.GOALS_FOR ?? ''}
                                  onChange={(e) => handleUpdatePointsDeduction(idx, 'GOALS_FOR', e.target.value === '' ? 0 : Number(e.target.value))}
                                  inputProps={{ style: { width: 50, textAlign: 'center' } }}
                                  sx={{ '& .MuiInput-input': { py: 0.5 } }}
                                />
                              </TableCell>
                              <TableCell sx={{ py: 0.5 }}>
                                <TextField
                                  size="small"
                                  type="number"
                                  value={pd.GOALS_AGAINST ?? ''}
                                  onChange={(e) => handleUpdatePointsDeduction(idx, 'GOALS_AGAINST', e.target.value === '' ? 0 : Number(e.target.value))}
                                  inputProps={{ style: { width: 50, textAlign: 'center' } }}
                                  sx={{ '& .MuiInput-input': { py: 0.5 } }}
                                />
                              </TableCell>
                              <TableCell sx={{ py: 0.5 }}>
                                <Autocomplete
                                  size="small"
                                  freeSolo
                                  options={pointsDeductionReasonsTermOptions}
                                  getOptionLabel={(opt) => {
                                    if (typeof opt === 'string') return opt;
                                    if (opt?._createValue) return opt.engValue || `Create "${opt._createValue}"`;
                                    return opt?.engValue || opt?.values?.[0]?.value || `Term ${opt?.id}` || '';
                                  }}
                                  value={pd.REASON_TERM_ID && pd.REASON_TERM_ID !== 0 ? ((allTerms || []).find((t) => t.id === pd.REASON_TERM_ID) || null) : null}
                                  isOptionEqualToValue={(opt, val) => {
                                    if (!opt || !val) return opt === val;
                                    if (opt.id === '__create__' || val.id === '__create__') return false;
                                    return opt.id === val.id;
                                  }}
                                  filterOptions={(options, { inputValue }) => {
                                    const trim = (inputValue || '').trim();
                                    const lower = trim.toLowerCase();
                                    let filtered = trim.length < 2 ? options : options.filter((opt) => {
                                      const label = (opt?.engValue || opt?.values?.[0]?.value || '').toLowerCase();
                                      return String(label).includes(lower);
                                    });
                                    const exactMatch = options.some((opt) =>
                                      (opt?.engValue || opt?.values?.[0]?.value || '').toLowerCase() === lower
                                    );
                                    if (trim.length >= 1 && !exactMatch) {
                                      filtered = [...filtered, { id: '__create__', engValue: `Create "${trim}"`, _createValue: trim }];
                                    }
                                    return filtered;
                                  }}
                                  onChange={async (_, v) => {
                                    if (v == null) {
                                      handleUpdatePointsDeduction(idx, 'REASON_TERM_ID', 0);
                                      return;
                                    }
                                    if (typeof v === 'object' && v?.id === '__create__' && v?._createValue) {
                                      const valueToCreate = String(v._createValue).trim();
                                      if (!valueToCreate) return;
                                      try {
                                        const newTerm = await api.createTerm({
                                          category: 'Points Deduction Reasons',
                                          values: [{ languageId: 1, value: valueToCreate, isDefault: true, status: 'Approved' }],
                                        });
                                        const tid = newTerm?.id ?? newTerm;
                                        handleUpdatePointsDeduction(idx, 'REASON_TERM_ID', tid);
                                        await loadTermsAndCategories();
                                        setSnackbar({ open: true, message: 'Reason term created', severity: 'success' });
                                      } catch (err) {
                                        setSnackbar({ open: true, message: err.message || 'Failed to create term', severity: 'error' });
                                      }
                                      return;
                                    }
                                    if (typeof v === 'object' && v?.id && v.id !== '__create__') {
                                      handleUpdatePointsDeduction(idx, 'REASON_TERM_ID', v.id);
                                      return;
                                    }
                                    if (typeof v === 'string' && (v || '').trim()) {
                                      try {
                                        const newTerm = await api.createTerm({
                                          category: 'Points Deduction Reasons',
                                          values: [{ languageId: 1, value: String(v).trim(), isDefault: true, status: 'Approved' }],
                                        });
                                        const tid = newTerm?.id ?? newTerm;
                                        handleUpdatePointsDeduction(idx, 'REASON_TERM_ID', tid);
                                        await loadTermsAndCategories();
                                        setSnackbar({ open: true, message: 'Reason term created', severity: 'success' });
                                      } catch (err) {
                                        setSnackbar({ open: true, message: err.message || 'Failed to create term', severity: 'error' });
                                      }
                                    }
                                  }}
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      size="small"
                                      placeholder="Type 2+ chars or enter new"
                                      InputProps={{
                                        ...params.InputProps,
                                        endAdornment: (
                                          <>
                                            {params.InputProps.endAdornment}
                                            {pd.REASON_TERM_ID && pd.REASON_TERM_ID !== 0 && (
                                              <InputAdornment position="end">
                                                <IconButton
                                                  size="small"
                                                  onClick={(e) => handleReasonTermClick(e, pd.REASON_TERM_ID)}
                                                  aria-label="Edit term"
                                                  sx={{ mr: -0.5 }}
                                                >
                                                  <EditIcon fontSize="small" />
                                                </IconButton>
                                              </InputAdornment>
                                            )}
                                          </>
                                        ),
                                      }}
                                      sx={{ '& .MuiInputBase-input': { py: 0.5, fontSize: '0.8rem' } }}
                                    />
                                  )}
                                  sx={{ minWidth: 130 }}
                                />
                              </TableCell>
                              <TableCell sx={{ py: 0.5 }}>
                                <TextField
                                  size="small"
                                  type="date"
                                  value={(pd.DEDUCTION_DATE || '').toString().slice(0, 10) || ''}
                                  onChange={(e) => handleUpdatePointsDeduction(idx, 'DEDUCTION_DATE', e.target.value || null)}
                                  InputLabelProps={{ shrink: true }}
                                  inputProps={{ style: { fontSize: '0.75rem' } }}
                                  sx={{ '& .MuiInput-input': { py: 0.5 } }}
                                />
                              </TableCell>
                              <TableCell sx={{ py: 0.5 }} padding="checkbox">
                                <IconButton size="small" onClick={() => handleRemovePointsDeduction(idx)} sx={{ color: '#dc2626' }} aria-label="Delete">
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                      <Button variant="outlined" size="small" sx={{ textTransform: 'none', color: '#dc2626', borderColor: '#dc2626', '&:hover': { borderColor: '#b91c1c', bgcolor: 'rgba(220,38,38,0.04)' } }} onClick={handleRemoveAllPointsDeductions} disabled={manageStandingsPointsDeductions.length === 0}>
                        Remove All Points Deductions
                      </Button>
                      <Typography variant="body2" color="text.secondary">Total Items: {manageStandingsPointsDeductions.length}</Typography>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={onClose} color="inherit">Close</Button>
              <Button
                variant="contained"
                onClick={onSave}
                disabled={manageStandingsSaving || (JSON.stringify(manageStandingsData) === JSON.stringify(manageStandingsOriginal) && JSON.stringify(manageStandingsDestinations) === JSON.stringify(manageStandingsDestinationsOriginal) && JSON.stringify(manageStandingsPointsDeductions) === JSON.stringify(manageStandingsPointsDeductionsOriginal))}
                sx={{ textTransform: 'none', backgroundColor: '#15803d', '&:hover': { backgroundColor: '#166534' } }}
              >
                {manageStandingsSaving ? 'Saving…' : 'Save & Update In Service'}
              </Button>
            </DialogActions>
          </Dialog>
  );
}