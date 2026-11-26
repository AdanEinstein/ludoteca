// localStorage that never throws (private mode, blocked storage): without it, everything still works, it just does not remember.
export const read = (key: string): string => {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
};

export const write = (key: string, value: string): void => {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* no storage: the TV asks to accept again, the options go back to the default */
  }
};
