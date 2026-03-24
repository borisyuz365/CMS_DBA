import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
} from '@mui/material';
import EntityPageHeader from './EntityPageHeader';
import EntityFilters from './EntityFilters';
import DataTable from '../../DataTable';
import LoadingSpinner from '../../LoadingSpinner';
import Alert from '../../Alert';

/**
 * EntityListPage - Complete reusable list page component for entities
 * 
 * @param {Object} props
 * @param {string} props.entityName - Entity name (e.g., 'Athletes', 'Competitions')
 * @param {string} props.entityNamePlural - Plural form (default: entityName + 's')
 * @param {Array} props.data - Entity data array
 * @param {boolean} props.loading - Loading state
 * @param {string} props.error - Error message
 * @param {Array} props.columns - DataTable columns configuration
 * @param {Object} props.filters - Current filter values
 * @param {Function} props.onFilterChange - Filter change handler
 * @param {Function} props.onSearch - Search handler
 * @param {Function} props.onClearFilters - Clear filters handler
 * @param {boolean} props.showDeleted - Show deleted toggle state
 * @param {Function} props.onShowDeletedChange - Show deleted toggle handler
 * @param {Array} props.filterConfig - Filter configurations (see EntityFilters)
 * @param {Object} props.pagination - Pagination state
 * @param {Function} props.onPaginationChange - Pagination change handler
 * @param {Function} props.onRowClick - Row click handler (default: navigate to details)
 * @param {string} props.detailsPath - Path pattern for details page (e.g., '/athletes/:id')
 * @param {Object} props.dataTableProps - Additional DataTable props
 * @param {Object} props.sx - Additional styling
 */
const EntityListPage = ({
  entityName = 'Entity',
  entityNamePlural,
  data = [],
  loading = false,
  error = null,
  columns = [],
  filters = {},
  onFilterChange,
  onSearch,
  onClearFilters,
  showDeleted = false,
  onShowDeletedChange,
  filterConfig = [],
  pagination = { page: 0, rowsPerPage: 25, totalRows: 0 },
  onPaginationChange,
  onRowClick,
  detailsPath,
  dataTableProps = {},
  sx = {},
}) => {
  const navigate = useNavigate();
  const pluralName = entityNamePlural || `${entityName}s`;

  const handleRowClick = (row) => {
    if (onRowClick) {
      onRowClick(row);
    } else if (detailsPath) {
      navigate(detailsPath.replace(':id', row.ID || row.id));
    }
  };

  if (loading && data.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <LoadingSpinner />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" message={error} />
      </Box>
    );
  }

  return (
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      p: 3,
      backgroundColor: '#f5f5f5',
      overflow: 'auto',
      ...sx,
    }}>
      {/* Page Header */}
      <EntityPageHeader
        breadcrumbItems={[
          { label: 'Entities', path: '/' },
          { label: pluralName }
        ]}
        title={`${pluralName} List`}
      />

      {/* Filters Section */}
      {filterConfig.length > 0 && (
        <EntityFilters
          filters={filters}
          onFilterChange={onFilterChange}
          onSearch={onSearch}
          onClearFilters={onClearFilters}
          showDeleted={showDeleted}
          onShowDeletedChange={onShowDeletedChange}
          filterConfig={filterConfig}
        />
      )}

      {/* Data Table */}
      <DataTable
        data={data}
        columns={columns}
        loading={loading}
        pagination={pagination}
        onPageChange={(page) => onPaginationChange?.({ ...pagination, page })}
        onRowsPerPageChange={(rowsPerPage) => onPaginationChange?.({ ...pagination, rowsPerPage, page: 0 })}
        onRowClick={handleRowClick}
        {...dataTableProps}
      />
    </Box>
  );
};

export default EntityListPage;
