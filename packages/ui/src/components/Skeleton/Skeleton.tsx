import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rect' | 'circle';
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  borderRadius,
  className = '',
  style,
  ...props
}) => {
  const inlineStyles: React.CSSProperties = {
    ...style,
    width: width ?? (variant === 'circle' ? 40 : '100%'),
    height: height ?? (variant === 'circle' ? 40 : variant === 'text' ? 18 : 120),
    borderRadius:
      borderRadius ??
      (variant === 'circle' ? '50%' : variant === 'text' ? '4px' : '12px'),
  };

  return (
    <div
      className={`gsf-skeleton ${className}`.trim()}
      style={inlineStyles}
      aria-hidden="true"
      {...props}
    />
  );
};
