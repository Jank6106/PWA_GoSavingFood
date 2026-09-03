import React from 'react';

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  icon?: React.ReactNode;
}

export const Chip: React.FC<ChipProps> = ({
  children,
  selected = false,
  icon,
  className = '',
  ...props
}) => {
  const classNames = [
    'gsf-chip',
    selected ? 'gsf-chip--selected' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classNames}
      aria-pressed={selected}
      {...props}
    >
      {selected ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        icon && <span aria-hidden="true">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
};
