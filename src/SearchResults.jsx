import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import SearchBar from './components/SearchBar';

export default function SearchResults() {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchResults = async () => {
            setLoading(true);

            // Start with a basic query, ordered by newest
            let queryBuilder = supabase.from('items').select('*').order('created_at', { ascending: false });

            // If there is a search term, filter the results
            if (query) {
                queryBuilder = queryBuilder.ilike('name', `%${query}%`);
            }

            const { data, error } = await queryBuilder;

            if (data) setResults(data);
            setLoading(false);
        };

        // Now it fetches regardless of whether 'query' is empty or not!
        fetchResults();
    }, [query]);

    return (
        <div style={{ padding: '20px' }}>

            <SearchBar />

            <h3 style={{ margin: '20px 0 15px 0', color: 'var(--text-main)' }}>
                {query ? `Results for "${query}"` : 'All Items'}
            </h3>

            {loading ? (
                <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
            ) : results.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No items found.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {results.map(item => (
                        <Link
                            to={`/item/${item.id}`}
                            key={item.id}
                            style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', textDecoration: 'none', color: 'inherit' }}
                        >
                            <div style={{ width: '60px', height: '60px', backgroundColor: '#f4f4f4', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                                {item.image_urls && item.image_urls.length > 0 ? (
                                    <img src={item.image_urls[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <span style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#999', textAlign: 'center' }}>No Pic</span>
                                )}
                            </div>

                            <div style={{ flex: 1 }}>
                                <h4 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>{item.name}</h4>
                                <p style={{ margin: 0, color: 'var(--success)', fontWeight: 'bold' }}>{item.retail_price}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}