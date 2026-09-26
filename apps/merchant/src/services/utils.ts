export const delay = (ms = 260) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
export const clone = <T,>(value: T): T => structuredClone(value);

