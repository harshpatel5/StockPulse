import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Search } from 'lucide-react';
import { ASSET_TYPES } from '../constants';
import { searchSymbols, searchCrypto } from '../services/priceService';

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
      <div className="card-head">
        <Plus size={18} />
        <span>Add asset</span>
      </div>
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
            <small style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>
              📍 Currently supports US exchanges only (NYSE, NASDAQ). More exchanges coming soon!
            </small>
          )}
        </label>

        <label className="field" style={{ position: 'relative' }}>
          <span>Ticker / name</span>
          <div style={{ position: 'relative' }}>
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
              style={{ paddingRight: '40px' }}
            />
            {isSearching && (
              <div
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                }}
              >
                <Search size={16} style={{ opacity: 0.5 }} />
              </div>
            )}
          </div>
          {showDropdown && searchResults.length > 0 && (
            <div
              ref={dropdownRef}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: '#0f172a',
                border: '1px solid #243447',
                borderRadius: '8px',
                marginTop: '4px',
                maxHeight: '200px',
                overflowY: 'auto',
                zIndex: 1000,
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
              }}
            >
              {searchResults.map((result, index) => (
                <button
                  key={`${result.symbol}-${index}`}
                  type="button"
                  onClick={() => handleSelectSuggestion(result)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    textAlign: 'left',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#cbd5e1',
                    cursor: 'pointer',
                    borderBottom: index < searchResults.length - 1 ? '1px solid #243447' : 'none',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#1e293b';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                    {result.displaySymbol}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                    {result.description}
                  </div>
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

        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save asset'}
        </button>
      </form>
    </article>
  );
};
