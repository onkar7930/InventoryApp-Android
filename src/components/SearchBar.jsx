// src/components/SearchBar.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function SearchBar() {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const navigate = useNavigate();

    // Fetch suggestions as the user types
    useEffect(() => {
        const fetchSuggestions = async () => {
            if (query.trim().length < 2) {
                setSuggestions([]);
                return;
            }
            const { data } = await supabase
                .from('items')
                .select('id, name')
                .ilike('name', `%${query}%`)
                .limit(5); // Only show top 5 suggestions

            if (data) setSuggestions(data);
        };

        // Add a slight delay (debounce) so we don't spam the database on every single keystroke
        const timeoutId = setTimeout(fetchSuggestions, 200);
        return () => clearTimeout(timeoutId);
    }, [query]);

    const handleSearch = (e) => {
        e.preventDefault();
        if (query.trim()) {
            navigate(`/search?q=${encodeURIComponent(query)}`);
            setQuery(''); // Clear bar after search
            setSuggestions([]);
        }
    };

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '5px' }}>
                <input
                    type="text"
                    placeholder="Search item..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ flex: 1, padding: '15px', boxSizing: 'border-box' }}
                />
                <button type="submit" style={{ padding: '0 20px', background: '#007bff', color: 'white', border: 'none' }}>
                    Search
                </button>
            </form>

            {/* Auto-suggest Dropdown */}
            {query.trim().length > 0 && (
                <ul style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, background: 'white',
                    border: '1px solid #ddd', borderRadius: '4px', listStyle: 'none', padding: 0,
                    margin: '5px 0 0 0', zIndex: 10, boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}>
                    {/* Always show the exact typed query as the first option */}
                    <li
                        onClick={handleSearch}
                        style={{ padding: '12px', borderBottom: '1px solid #eee', cursor: 'pointer', fontWeight: 'bold', color: '#007bff' }}
                    >
                        Search "{query}"...
                    </li>

                    {/* Show the actual matching items from the DB */}
                    {suggestions.map(item => (
                        <li
                            key={item.id}
                            onClick={() => navigate(`/item/${item.id}`)}
                            style={{ padding: '12px', borderBottom: '1px solid #eee', cursor: 'pointer' }}
                        >
                            {item.name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}