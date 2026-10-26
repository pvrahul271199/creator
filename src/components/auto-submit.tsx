"use client";

import type { ChangeEvent, ReactNode } from "react";

/** Select that submits its parent form as soon as the value changes. */
export function AutoSubmitSelect({
  name,
  defaultValue,
  className,
  children,
}: {
  name: string;
  defaultValue?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className={className}
      onChange={(e: ChangeEvent<HTMLSelectElement>) => e.target.form?.requestSubmit()}
    >
      {children}
    </select>
  );
}

/** Checkbox that submits its parent form when toggled. */
export function AutoSubmitCheckbox({
  checked,
  className,
  label,
}: {
  checked: boolean;
  className?: string;
  label: string;
}) {
  return (
    <input
      type="checkbox"
      name="toggle"
      aria-label={label}
      defaultChecked={checked}
      className={className}
      onChange={(e: ChangeEvent<HTMLInputElement>) => e.target.form?.requestSubmit()}
    />
  );
}
