import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import SearchBar from './components/SearchBar'
import SearchResults from './SearchResults'
import AddNewItem from './AddNewItem'
import ItemDetails from './ItemDetails'
import imageCompression from 'browser-image-compression'

// --- GLOBAL HEADER ---
function Header({ session }) {
  const [shopName, setShopName] = useState('My Shop')
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchName() {
      const { data } = await supabase.from('profiles').select('shop_name').eq('id', session.user.id).single()
      if (data) setShopName(data.shop_name)
    }
    fetchName()
  }, [session])

  return (
    <header className="app-header">
      {/* Upgraded Shop Brand Area */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        onClick={() => navigate('/')}
      >
        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '18px' }}>🏪</span>
        </div>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, letterSpacing: '0.5px' }}>
          {shopName}
        </h3>
      </div>

      {/* Upgraded High-Contrast Home Button */}
      <button
        onClick={() => navigate('/')}
        style={{
          background: 'var(--surface)',
          color: 'var(--primary)',
          padding: '8px 16px',
          fontSize: '14px',
          borderRadius: '24px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          border: 'none'
        }}
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        Home
      </button>
    </header>
  )
}

// --- AUTH COMPONENT ---
function AuthScreen({ setSession }) {
  const [isLogin, setIsLogin] = useState(true)
  const [awaitingOtp, setAwaitingOtp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [shopName, setShopName] = useState('')
  const [otp, setOtp] = useState('')
  const [message, setMessage] = useState('')

  const handleAuth = async (e) => {
    e.preventDefault()
    setMessage('')
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { shop_name: shopName } } })
      if (error) { setMessage(error.message) } else { setMessage('OTP sent! Please check your email.'); setAwaitingOtp(true) }
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setMessage('')
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'signup' })
    if (error) { setMessage(error.message) } else if (data.session) { setSession(data.session) }
  }

  if (awaitingOtp) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', flex: 1 }}>
        <h2>Check your email</h2>
        <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input type="text" placeholder="Enter OTP" value={otp} onChange={e => setOtp(e.target.value)} required style={{ padding: '15px', textAlign: 'center', letterSpacing: '5px' }} />
          <button type="submit" className="btn-success" style={{ padding: '12px' }}>Verify & Login</button>
        </form>
      </div>
    )
  }

  return (
    <div style={{ padding: '40px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <h1 style={{ color: 'var(--primary)', marginBottom: '30px' }}>Inventory<br />Pro</h1>
      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {!isLogin && <input type="text" placeholder="Shop Name" value={shopName} onChange={e => setShopName(e.target.value)} required style={{ padding: '12px' }} />}
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: '12px' }} />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '12px' }} />
        <button type="submit" className="btn-primary" style={{ padding: '12px', fontSize: '16px' }}>{isLogin ? 'Login' : 'Send OTP'}</button>
      </form>
      <button onClick={() => setIsLogin(!isLogin)} style={{ background: 'none', color: 'var(--primary)', marginTop: '20px', fontSize: '14px' }}>
        {isLogin ? 'Create new shop account' : 'Already have an account? Login'}
      </button>
    </div>
  )
}

// --- HOME COMPONENT ---
function Home({ session }) {
  const [shopData, setShopData] = useState({ shop_name: 'Loading...', banner_url: null })
  const [recentItems, setRecentItems] = useState([])
  const [isUploadingBanner, setIsUploadingBanner] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchData() {
      // Fetch Profile
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      if (profile) setShopData(profile)

      // Fetch Recent Items (Last 4)
      const { data: items } = await supabase.from('items').select('id, name, retail_price, image_urls').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(4)
      if (items) setRecentItems(items)
    }
    fetchData()
  }, [session])

  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingBanner(true);

    try {
      // 1. Compress the new banner image
      const compressionOptions = {
        maxSizeMB: 0.2, // Kept slightly larger (200kb) for a nice wide banner
        maxWidthOrHeight: 1024,
        useWebWorker: true
      };
      const compressedFile = await imageCompression(file, compressionOptions);

      const fileExt = compressedFile.name.split('.').pop() || 'jpg';
      const fileName = `banners/${session.user.id}_${Date.now()}.${fileExt}`;

      // 2. Upload the compressed image to Storage
      const { error: uploadError } = await supabase.storage.from('item-photos').upload(fileName, compressedFile);

      if (uploadError) {
        alert("Error uploading image: " + uploadError.message);
        setIsUploadingBanner(false);
        return;
      }

      // Get the new public URL
      const { data: urlData } = supabase.storage.from('item-photos').getPublicUrl(fileName);
      const newBannerUrl = urlData.publicUrl;

      // 3. Save the new URL to the Database
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ banner_url: newBannerUrl })
        .eq('id', session.user.id);

      if (dbError) {
        alert("Database error: " + dbError.message);
      } else {
        // 4. SUCCESS! Now permanently delete the OLD banner from storage to free up space
        if (shopData.banner_url) {
          const oldPath = decodeURIComponent(shopData.banner_url.split('/item-photos/')[1]);
          if (oldPath) {
            await supabase.storage.from('item-photos').remove([oldPath]);
          }
        }

        // Update the screen
        setShopData({ ...shopData, banner_url: newBannerUrl });
      }
    } catch (error) {
      alert("Error processing banner: " + error.message);
    } finally {
      setIsUploadingBanner(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Banner */}
      <div className="shop-banner-container" onClick={() => document.getElementById('banner-upload').click()}>
        {isUploadingBanner ? (
          <span style={{ color: 'var(--text-muted)' }}>Uploading...</span>
        ) : shopData.banner_url ? (
          <>
            <img src={shopData.banner_url} alt="Shop Banner" className="shop-banner-img" />
            <div className="shop-banner-overlay">Change Banner</div>
          </>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>[ Tap to Add Shop Banner ]</span>
        )}
        <input id="banner-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBannerUpload} />
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <SearchBar />

        {/* Dashboard Action Squares */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' }}>
          <div onClick={() => navigate('/add-item')} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ width: '48px', height: '48px', background: '#E0E7FF', color: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>+</div>
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>Add Item</span>
          </div>
          <div onClick={() => navigate('/search')} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ width: '48px', height: '48px', background: '#D1FAE5', color: 'var(--success)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📚</div>
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>View All</span>
          </div>
        </div>

        {/* Recent Items Feed */}
        {recentItems.length > 0 && (
          <div style={{ marginTop: '30px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>Recently Added</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recentItems.map(item => (
                <div key={item.id} onClick={() => navigate(`/item/${item.id}`)} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', cursor: 'pointer' }}>
                  <div style={{ width: '50px', height: '50px', background: '#f4f4f4', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                    {item.image_urls?.length > 0 ? <img src={item.image_urls[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '10px', color: '#999', display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>No Pic</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: 'var(--text-main)' }}>{item.name}</h4>
                    <p style={{ margin: 0, color: 'var(--success)', fontWeight: 600, fontSize: '14px' }}>{item.retail_price}</p>
                  </div>
                  <span style={{ color: '#ccc', paddingRight: '5px' }}>›</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Clean Red Logout Button */}
        <div style={{ marginTop: 'auto', paddingTop: '40px', paddingBottom: '20px', textAlign: 'center' }}>
          <button onClick={() => supabase.auth.signOut()} style={{ background: '#FEF2F2', color: 'var(--danger)', padding: '10px 24px', borderRadius: '24px', fontSize: '14px', border: '1px solid #FECACA', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Logout
          </button>
        </div>

      </div>
    </div>
  )
}

// --- MAIN APP ---
function App() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    supabase.auth.onAuthStateChange((_event, session) => setSession(session))
  }, [])

  return (
    <Router>
      {session && <Header session={session} />}

      {/* This wrapper locks the screen and acts as the native app scroller */}
      <div className="content-area">
        <Routes>
          <Route path="/" element={session ? <Home session={session} /> : <Navigate to="/auth" />} />
          <Route path="/auth" element={!session ? <AuthScreen setSession={setSession} /> : <Navigate to="/" />} />
          <Route path="/search" element={session ? <SearchResults /> : <Navigate to="/auth" />} />
          <Route path="/item/:id" element={session ? <ItemDetails session={session} /> : <Navigate to="/auth" />} />
          <Route path="/add-item" element={session ? <AddNewItem session={session} /> : <Navigate to="/auth" />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App