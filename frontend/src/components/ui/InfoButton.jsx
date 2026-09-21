import { Info } from 'lucide-react';

export const InfoButton = ({ label, onClick }) => (
  <button type="button" className="info-btn" onClick={onClick} aria-label={label}>
    <Info size={16} aria-hidden="true" />
  </button>
);
