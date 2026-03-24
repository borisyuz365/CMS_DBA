import React from 'react';
import { Button, IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

/**
 * DeleteButton - A delete button component with icon and confirmation
 * 
 * @param {Object} props
 * @param {Function} props.onClick - Click handler
 * @param {boolean} props.disabled - Whether button is disabled
 * @param {string} props.variant - Button variant: 'contained', 'outlined', 'text', 'icon'
 * @param {string} props.size - Button size: 'small', 'medium', 'large'
 * @param {boolean} props.confirm - Whether to show confirmation tooltip
 * @param {string} props.tooltip - Custom tooltip text
 * @param {Object} props.sx - Additional styling
 */
const DeleteButton = ({
  onClick,
  disabled = false,
  variant = 'contained',
  size = 'medium',
  confirm = true,
  tooltip = 'Delete item',
  sx = {},
  ...props
}) => {
  const buttonContent = (
    <Button
      variant={variant}
      color="error"
      size={size}
      disabled={disabled}
      onClick={onClick}
      startIcon={<DeleteIcon />}
      sx={{
        textTransform: 'none',
        fontWeight: 600,
        ...sx
      }}
      {...props}
    >
      Delete
    </Button>
  );

  const iconButtonContent = (
    <IconButton
      color="error"
      size={size}
      disabled={disabled}
      onClick={onClick}
      sx={{
        ...sx
      }}
      {...props}
    >
      <DeleteIcon />
    </IconButton>
  );

  const content = variant === 'icon' ? iconButtonContent : buttonContent;

  if (confirm && !disabled) {
    return (
      <Tooltip title={tooltip} arrow>
        <span>{content}</span>
      </Tooltip>
    );
  }

  return content;
};

export default DeleteButton;
