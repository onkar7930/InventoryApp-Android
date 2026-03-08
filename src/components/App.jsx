import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Scanner from './components/Scanner'
import SearchBar from './components/SearchBar'
import './App.css'

function App() {
    const [session, setSession] = useState(null)
    const [shopName, setShopName] = useState('')
    const [scannedCode, setScannedCode] = useState(null)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    // Check if user is already logged in on load
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            if (session) fetchShopName(session.user.id)
        })

        supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            if (session) fetchShopName(session.user.id)
        })
    }, [])

    const fetchShopName = async (userId) => {
        const { data } = await supabase
            .from('profiles')
            .select('shop_name')
            .eq('id', userId)
            .single()

        if (data) setShopName(data.shop_name)
    }

    const handleLogin = async (e) => {
        e.preventDefault()
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) alert(error.message)
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        setShopName('')
    }

    const handleItemSelect = (barcode) => {
        setScannedCode(barcode)
        // TODO: Fetch full item details from DB here
    }

    // --- LOGIN SCREEN ---
    if (!session) {
        return (
            <div style={{ textAlign: 'center', padding: '50px' }}>
                <h2>Shop Login</h2>
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px', margin: '0 auto' }}>
                    <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: '10px' }} />
                    <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '10px' }} />
                    <button type="submit" style={{ padding: '10px', cursor: 'pointer' }}>Login</button>
                </form>
            </div>
        )
    }

    // --- HOME SCREEN ---
    return (
        <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>{shopName || 'Loading Shop...'}</h2>
                <button onClick={handleLogout} style={{ padding: '5px 10px' }}>Logout</button>
            </div>

            {!scannedCode ? (
                <>
                    <SearchBar onItemSelected={handleItemSelect} />
                    <div style={{ margin: '20px 0' }}>- OR -</div>
                    <Scanner onScanSuccess={handleItemSelect} />
                </>
            ) : (
                <div>
                    <h2>Item Selected: {scannedCode}</h2>
                    {/* We will build the Item Details / Edit Form here next! */}
                    <button onClick={() => setScannedCode(null)} style={{ padding: '10px', marginTop: '20px' }}>
                        Back to Scanner
                    </button>
                </div>
            )}
        </div>
    )
}

export default App