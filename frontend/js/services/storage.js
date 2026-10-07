/**
 * Safe wrappers around localStorage. Private browsing modes can make
 * localStorage throw on access; these wrappers turn that into "no value"
 * instead of stopping the whole app.
 */

/** @returns {string | null} */
export function storageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function storageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* the value simply will not persist between reloads */
  }
}

export function storageRemove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* nothing to do */
  }
}
