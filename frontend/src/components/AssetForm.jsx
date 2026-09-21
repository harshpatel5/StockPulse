import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Search } from 'lucide-react';
import { ASSET_TYPES } from '../constants';
import { searchSymbols, searchCrypto } from '../services/priceService';
import { CardHeader } from './ui/CardHeader';

export const AssetForm = ({ formAsset, setFormAsset, onSubmit, busy, token }) => {
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeoutRef = useRef(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Debounced search function - searches based on asset type
  const performSearch = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      setIsSearching(false);
      return;
    }

    if (!token) {
      setSearchResults([]);
      setShowDropdown(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      // Search based on selected asset type
      const assetType = formAsset.type?.toLowerCase() || 'stock';
      let results = [];

      if (assetType === 'crypto') {
        results = await searchCrypto(token, query);
      } else {
        // Stock and ETF both use Finnhub search (ETFs are listed like stocks)
        results = await searchSymbols(token, query);
      }

      setSearchResults(results);
      setShowDropdown(results.length > 0);
    } catch {
      setSearchResults([]);
      setShowDropdown(false);
    } finally {
      setIsSearching(false);
    }
  }, [token, formAsset.type]);

  // Handle input change with debouncing
  const handleInputChange = (event) => {
    const value = event.target.value;
    setFormAsset((prev) => ({ ...prev, name: value }));

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion) => {
    setFormAsset((prev) => ({ ...prev, name: suggestion.symbol }));
    setSearchResults([]);
    setShowDropdown(false);
    // Focus back on input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Clear search results when asset type changes
  useEffect(() => {
    setSearchResults([]);
    setShowDropdown(false);
  }, [formAsset.type]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <article className="card">
      <CardHeader icon={Plus} title="Add asset" />
      <form className="stack" onSubmit={onSubmit}>
        <label className="field">
          <span>Type</span>
          <select
            value={formAsset.type}
            onChange={(event) =>
              setFormAsset((prev) => ({ ...prev, type: event.target.value }))
            }
          >
            {ASSET_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {(formAsset.type === 'Stock' || formAsset.type === 'ETF') && (
            <small className="field-hint">
              Currently supports US exchanges only (NYSE, NASDAQ). More exchanges coming soon.
            </small>
          )}
        </label>

        <label className="field field--search">
          <span>Ticker / name</span>
          <div className="field-input-wrap">
            <input
              ref={inputRef}
              type="text"
              value={formAsset.name}
              onChange={handleInputChange}
              onFocus={() => {
                if (searchResults.length > 0) {
                  setShowDropdown(true);
                }
              }}
              placeholder={formAsset.type === 'Crypto' ? 'BTC' : 'AAPL'}
              required
              autoComplete="off"
              role="combobox"
              aria-expanded={showDropdown}
              aria-controls="asset-suggestions"
            />
            {isSearching && (
              <span className="field-adornment" aria-hidden="true">
                <Search size={16} />
              </span>
            )}
          </div>
          {showDropdown && searchResults.length > 0 && (
            <div
              ref={dropdownRef}
              id="asset-suggestions"
              className="suggest-list"
              role="listbox"
              aria-label="Matching symbols"
            >
              {searchResults.map((result, index) => (
                <button
                  key={`${result.symbol}-${index}`}
                  type="button"
                  className="suggest-item"
                  role="option"
                  aria-selected="false"
                  onClick={() => handleSelectSuggestion(result)}
                >
                  <span className="suggest-symbol">{result.displaySymbol}</span>
                  <span className="suggest-description">{result.description}</span>
                </button>
              ))}
            </div>
          )}
        </label>

        <div className="two-col">
          <label className="field">
            <span>Quantity</span>
            <input
              type="number"
              step="0.01"
              value={formAsset.quantity}
              onChange={(event) =>
                setFormAsset((prev) => ({ ...prev, quantity: event.target.value }))
              }
              placeholder="10"
              required
            />
          </label>

          <label className="field">
            <span>Cost basis (USD)</span>
            <input
              type="number"
              step="0.01"
              value={formAsset.costBasis}
              onChange={(event) =>
                setFormAsset((prev) => ({ ...prev, costBasis: event.target.value }))
              }
              placeholder="1500"
              required
            />
          </label>
        </div>

        <button className="btn primary" type="submit" disabled={busy} aria-busy={busy}>
          {busy && <span className="btn-spinner" aria-hidden="true" />}
          {busy ? 'Saving…' : 'Save asset'}
        </button>
      </form>
    </article>
  );
};
