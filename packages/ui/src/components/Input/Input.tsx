import React, { forwardRef, useId } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      id: customId,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = customId || generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;

    const containerClasses = [
      'gsf-input-container',
      error ? 'gsf-input-container--error' : '',
      disabled ? 'gsf-input-container--disabled' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={`gsf-input-wrapper ${className}`.trim()}>
        {label && (
          <label htmlFor={inputId} className="gsf-input-label">
            {label}
          </label>
        )}
        <div className={containerClasses}>
          {leftIcon && <span className="gsf-input-prefix">{leftIcon}</span>}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId || helperId}
            className="gsf-input-field"
            {...props}
          />
          {rightIcon && <span className="gsf-input-suffix">{rightIcon}</span>}
        </div>
        {error ? (
          <span id={errorId} className="gsf-input-error" role="alert">
            {error}
          </span>
        ) : helperText ? (
          <span id={helperId} className="gsf-input-helper">
            {helperText}
          </span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
