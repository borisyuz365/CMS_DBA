import React from 'react';
import { IconButton as MuiIconButton, Tooltip } from '@mui/material';

/**
 * IconButton - A customizable icon button component
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Icon to display
 * @param {Function} props.onClick - Click handler
 * @param {boolean} props.disabled - Whether button is disabled
 * @param {string} props.color - Button color: 'primary', 'secondary', 'error', 'warning', 'info', 'success'
 * @param {string} props.size - Button size: 'small', 'medium', 'large'
 * @param {string} props.tooltip - Tooltip text
 * @param {Object} props.sx - Additional styling
 */
const IconButton = ({
  icon,
  onClick,
  disabled = false,
  color = 'primary',
  size = 'medium',
  tooltip,
  sx = {},
  ...props
}) => {
  const button = (
    <MuiIconButton
      color={color}
      size={size}
      disabled={disabled}
      onClick={onClick}
      sx={{
        ...sx
      }}
      {...props}
    >
      {icon}
    </MuiIconButton>
  );

  if (tooltip && !disabled) {
    return (
      <Tooltip title={tooltip} arrow>
        <span>{button}</span>
      </Tooltip>
    );
  }

  return button;
};

export default IconButton;
