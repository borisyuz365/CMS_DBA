import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Collapse,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Divider,
  FormControl,
  Select,
  MenuItem,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import EditIcon from '@mui/icons-material/Edit';

const CategoryTree = ({
  categories,
  terms,
  selectedCategory,
  onCategorySelect,
  searchTerm = '',
  totalTermsCount = 0,
  categoryPage = 0,
  categoryRowsPerPage = 10,
  onCategoryPageChange,
  onCategoryRowsPerPageChange,
  showPagination = true,
  onCategoryEdit = null,
  categoriesData = [],
}) => {
  const [expandedCategories, setExpandedCategories] = useState({});

  const totalCount = useMemo(() => (totalTermsCount > 0 ? totalTermsCount : terms.length), [totalTermsCount, terms.length]);

  const findPathToCategory = React.useCallback((cats, targetName, currentPath = []) => {
    if (!cats || !Array.isArray(cats)) return null;
    for (const cat of cats) {
      if (!cat || !cat.name) continue;
      const newPath = [...currentPath, cat];
      if (cat.name === targetName) return newPath;
      if (cat.children?.length) {
        const found = findPathToCategory(cat.children, targetName, newPath);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const cloneCategoryWithLimitedDepth = React.useCallback((cat, maxDepth, currentDepth = 0) => {
    if (!cat) return null;
    const cloned = { ...cat, children: [] };
    if (cat.children && currentDepth < maxDepth) {
      cloned.children = cat.children.map((child) => cloneCategoryWithLimitedDepth(child, maxDepth, currentDepth + 1)).filter(Boolean);
    }
    return cloned;
  }, []);

  const buildLimitedTree = React.useCallback((cats, focusedCategoryName) => {
    if (!cats?.length || !focusedCategoryName) return cats;
    const path = findPathToCategory(cats, focusedCategoryName);
    if (!path?.length) return cats;
    const focusedIndex = path.length - 1;
    const startIndex = Math.max(0, focusedIndex - 2);

    const buildPathTree = (catList, pathIndex) => {
      if (pathIndex > focusedIndex) return [];
      const result = [];
      for (const cat of catList) {
        if (!cat?.name) continue;
        if (cat.name === path[pathIndex].name) {
          const categoryCopy = { ...cat, children: [] };
          if (pathIndex === focusedIndex && cat.children?.length) {
            categoryCopy.children = cat.children.map((child) => cloneCategoryWithLimitedDepth(child, 1)).filter(Boolean);
          } else if (pathIndex < focusedIndex) {
            const nextChildTree = buildPathTree(cat.children || [], pathIndex + 1);
            if (nextChildTree.length) categoryCopy.children = nextChildTree;
          }
          result.push(categoryCopy);
          break;
        }
        if (cat.children?.length) {
          const childResult = buildPathTree(cat.children, pathIndex);
          if (childResult.length) {
            result.push({ ...cat, children: childResult });
            break;
          }
        }
      }
      return result;
    };

    const fullPathTree = buildPathTree(cats, 0);
    if (!fullPathTree.length) return cats;
    if (startIndex === 0) return fullPathTree;

    const targetName = path[startIndex].name;
    const findInTree = (tree, name) => {
      for (const c of tree) {
        if (c.name === name) return [c];
        if (c.children?.length) {
          const r = findInTree(c.children, name);
          if (r) return r;
        }
      }
      return null;
    };
    const subtree = findInTree(fullPathTree, targetName);
    return subtree?.length ? subtree : cats;
  }, [findPathToCategory, cloneCategoryWithLimitedDepth]);

  const findMatchingCategories = React.useCallback((cats, search) => {
    if (!cats?.length || !search) return [];
    const searchLower = search.toLowerCase();
    const matches = [];
    const searchRecursive = (list) => {
      for (const cat of list) {
        if (!cat?.name) continue;
        if (cat.name.toLowerCase().includes(searchLower)) matches.push(cat.name);
        if (cat.children?.length) searchRecursive(cat.children);
      }
    };
    searchRecursive(cats);
    return matches;
  }, []);

  const filteredCategories = useMemo(() => {
    if (!categories?.length) return [];
    let focused = null;
    if (selectedCategory && selectedCategory !== 'All Terms') focused = selectedCategory;
    else if (searchTerm) {
      const match = findMatchingCategories(categories, searchTerm);
      if (match.length) focused = match[0];
      else return [];
    }
    if (focused) return buildLimitedTree(categories, focused);
    return categories;
  }, [categories, searchTerm, selectedCategory, buildLimitedTree, findMatchingCategories]);

  useEffect(() => {
    if (onCategoryPageChange) onCategoryPageChange(0);
  }, [searchTerm, onCategoryPageChange]);

  useEffect(() => {
    let focused = null;
    if (selectedCategory && selectedCategory !== 'All Terms') focused = selectedCategory;
    else if (searchTerm && categories?.length) {
      const match = findMatchingCategories(categories, searchTerm);
      if (match.length) focused = match[0];
    }
    if (focused && categories?.length) {
      const path = findPathToCategory(categories, focused);
      if (path?.length) {
        const expanded = {};
        path.forEach((p, i) => {
          if (i < path.length - 1 || p.name === focused) expanded[p.name] = true;
        });
        expanded[focused] = true;
        setExpandedCategories(expanded);
      }
    } else if (!focused) setExpandedCategories({});
  }, [selectedCategory, searchTerm, categories, findPathToCategory, findMatchingCategories]);

  const paginatedCategories = useMemo(
    () => filteredCategories.slice(categoryPage * categoryRowsPerPage, categoryPage * categoryRowsPerPage + categoryRowsPerPage),
    [filteredCategories, categoryPage, categoryRowsPerPage]
  );

  const handleToggle = (name, e) => {
    e?.stopPropagation();
    setExpandedCategories((prev) => ({ ...prev, [name]: !prev[name] }));
  };
  const handleCategoryClick = (name, e) => {
    e?.stopPropagation();
    onCategorySelect(name === selectedCategory ? null : name);
  };

  const renderCategory = (category, depth = 0) => {
    if (!category?.name) return null;
    const hasChildren = category.children?.length > 0;
    const isExpanded = expandedCategories[category.name];
    const isSelected = selectedCategory === category.name;
    return (
      <Box key={category.name}>
        <ListItem disablePadding sx={{ pl: depth * 2 }}>
          <ListItemButton
            onClick={(e) => handleCategoryClick(category.name, e)}
            selected={isSelected}
            sx={{ borderRadius: 1, mb: 0.5, pl: 1, '&.Mui-selected': { backgroundColor: 'primary.light', '&:hover': { backgroundColor: 'primary.light' } } }}
          >
            {hasChildren ? (
              <IconButton size="small" sx={{ mr: 1, minWidth: 24, width: 24, height: 24, color: 'text.secondary' }} onClick={(e) => { e.stopPropagation(); handleToggle(category.name, e); }}>
                {isExpanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
              </IconButton>
            ) : (
              <Box sx={{ width: 24, mr: 1 }} />
            )}
            <ListItemText primary={<Typography variant="body2">{category.name} - {category.count}</Typography>} />
            {onCategoryEdit && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  const full = categoriesData.find((c) => c.name === category.name);
                  if (full) onCategoryEdit(full);
                }}
                sx={{ ml: 1, mr: 0.5, color: 'text.secondary' }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            )}
          </ListItemButton>
        </ListItem>
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box sx={{ pl: 2 }}>{category.children.map((child, idx) => <React.Fragment key={child.name || idx}>{renderCategory(child, depth + 1)}</React.Fragment>)}</Box>
          </Collapse>
        )}
      </Box>
    );
  };

  return (
    <Box>
      <ListItemButton
        onClick={() => handleCategoryClick('All Terms')}
        selected={selectedCategory === 'All Terms' || selectedCategory === null}
        sx={{ borderRadius: 1, mb: 0.5, '&.Mui-selected': { backgroundColor: 'primary.light', '&:hover': { backgroundColor: 'primary.light' } } }}
      >
        <ListItemText primary={<Typography variant="body2" sx={{ fontWeight: 600 }}>- All Terms - {totalCount}</Typography>} />
      </ListItemButton>
      <Divider sx={{ my: 1 }} />
      {paginatedCategories.map((cat) => renderCategory(cat))}
      {showPagination && filteredCategories.length > 0 && onCategoryPageChange && onCategoryRowsPerPageChange && (
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton onClick={() => onCategoryPageChange(categoryPage - 1)} disabled={categoryPage === 0} size="small">
                <ArrowBackIosNewIcon fontSize="small" />
              </IconButton>
              <Typography variant="body2" sx={{ mx: 1 }}>Page {categoryPage + 1} of {Math.ceil(filteredCategories.length / categoryRowsPerPage) || 1}</Typography>
              <IconButton onClick={() => onCategoryPageChange(categoryPage + 1)} disabled={categoryPage >= Math.ceil(filteredCategories.length / categoryRowsPerPage) - 1} size="small">
                <ArrowForwardIosIcon fontSize="small" />
              </IconButton>
            </Box>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <Select value={categoryRowsPerPage} onChange={(e) => { onCategoryRowsPerPageChange(Number(e.target.value)); onCategoryPageChange(0); }}>
                {[10, 25, 50].map((n) => <MenuItem key={n} value={n}>{n} / page</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default CategoryTree;
