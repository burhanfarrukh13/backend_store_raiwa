// In a single-project deployment, apiBaseUrl is empty string (same-origin relative /api calls).
// If deploying backend to a separate domain, set apiBaseUrl to that domain.
window.BAYTAK_CONFIG = window.BAYTAK_CONFIG || {
  apiBaseUrl: '',
  turnstileSiteKey: ''
};
