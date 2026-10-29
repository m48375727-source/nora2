import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import { Search, Loader2, X } from 'lucide-react';

interface GifPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGif: (gifUrl: string) => void;
}

export const GifPicker: React.FC<GifPickerProps> = ({ isOpen, onClose, onSelectGif }) => {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) return;
    loadGifs('', 0, true);

    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const loadGifs = async (searchQ: string, pageOffset = 0, reset = false) => {
    setLoading(true);
    try {
      const res = searchQ.trim()
        ? await api.searchGifs(searchQ, pageOffset)
        : await api.getTrendingGifs(pageOffset);

      const items = res.data || [];
      setGifs((prev) => (reset ? items : [...prev, ...items]));
      setOffset(pageOffset + items.length);
    } catch (err) {
      console.error('Failed to load GIFs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      loadGifs(val, 0, true);
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-16 left-2 sm:left-6 z-50 w-80 sm:w-96 h-96 bg-[#05070d] border border-[#111a2e] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Search Header */}
      <div className="p-3 border-b border-[#111a2e] flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="GIPHY ile GIF ara..."
            value={query}
            onChange={handleQueryChange}
            className="w-full pl-9 pr-3 py-1.5 bg-[#0a0f1c] border border-[#111a2e] rounded-xl text-white text-xs focus:outline-none focus:border-[#2563ff] transition-colors"
          />
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* GIFs Grid */}
      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2">
        {gifs.map((gif) => {
          const gifUrl =
            gif.images?.fixed_height?.url ||
            gif.images?.original?.url ||
            gif.images?.downsized_medium?.url;

          if (!gifUrl) return null;

          return (
            <button
              key={gif.id}
              onClick={() => {
                onSelectGif(gifUrl);
                onClose();
              }}
              className="relative aspect-video rounded-lg overflow-hidden bg-[#0a0f1c] hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer group"
            >
              <img
                src={gifUrl}
                alt={gif.title || 'GIF'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
            </button>
          );
        })}

        {loading && (
          <div className="col-span-2 py-6 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        )}

        {!loading && gifs.length === 0 && (
          <div className="col-span-2 py-10 text-center text-xs text-slate-500">
            GIF bulunamadı. Başka bir arama deneyin!
          </div>
        )}
      </div>
    </div>
  );
};
