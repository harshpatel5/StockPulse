// Full-page loader shown while authentication is being validated.
// It reads theme tokens, so it matches the page it appears on.
export const LoadingSpinner = () => (
  <div className="page-loader" role="status">
    <span className="loading-spinner" aria-hidden="true" />
    <span className="visually-hidden">Loading</span>
  </div>
);
