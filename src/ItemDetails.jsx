import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import imageCompression from 'browser-image-compression'

export default function ItemDetails({ session }) {
    const { id } = useParams()
    const navigate = useNavigate()

    const [item, setItem] = useState(null)
    const [loading, setLoading] = useState(true)
    const [showWholesale, setShowWholesale] = useState(false)

    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState({})

    const [existingUrls, setExistingUrls] = useState([])
    const [removedUrls, setRemovedUrls] = useState([]) // Tracks images deleted during edit

    const [newImageFiles, setNewImageFiles] = useState([])
    const [newImagePreviews, setNewImagePreviews] = useState([])
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => { fetchItem() }, [id])

    const fetchItem = async () => {
        const { data } = await supabase.from('items').select('*').eq('id', id).single()
        if (data) {
            setItem(data)
            setEditForm(data)
            setExistingUrls(data.image_urls || [])
        }
        setLoading(false)
    }

    const handleAddImage = (e) => {
        if (e.target.files) {
            const files = Array.from(e.target.files)
            setNewImageFiles([...newImageFiles, ...files])
            const previews = files.map(f => URL.createObjectURL(f))
            setNewImagePreviews([...newImagePreviews, ...previews])
        }
    }

    // Handle clicking the "X" on an old image
    const handleRemoveExistingImage = (idxToRemove) => {
        const urlToRemove = existingUrls[idxToRemove]
        setRemovedUrls([...removedUrls, urlToRemove]) // Queue for deletion from bucket
        setExistingUrls(existingUrls.filter((_, i) => i !== idxToRemove)) // Remove from UI
    }

    const handleSave = async (e) => {
        e.preventDefault()
        setIsSaving(true)

        // 1. Compress and upload NEW images
        let uploadedUrls = []
        if (newImageFiles.length > 0) {
            const compressionOptions = { maxSizeMB: 0.15, maxWidthOrHeight: 1024, useWebWorker: true }
            for (const file of newImageFiles) {
                const compressedFile = await imageCompression(file, compressionOptions)
                const fileExt = compressedFile.name.split('.').pop() || 'jpg'
                const fileName = `${session.user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
                await supabase.storage.from('item-photos').upload(fileName, compressedFile)
                const { data } = supabase.storage.from('item-photos').getPublicUrl(fileName)
                uploadedUrls.push(data.publicUrl)
            }
        }

        const finalImageUrls = [...existingUrls, ...uploadedUrls]

        // 2. Save changes to Database
        const { error } = await supabase.from('items').update({
            name: editForm.name,
            retail_price: editForm.retail_price,
            wholesale_price: editForm.wholesale_price,
            comments: editForm.comments,
            image_urls: finalImageUrls
        }).eq('id', id)

        // 3. Delete REMOVED images from the Supabase storage bucket
        if (!error) {
            if (removedUrls.length > 0) {
                // Extract the filepath from the public URL (e.g. "userid/filename.jpg")
                const pathsToDelete = removedUrls.map(url => decodeURIComponent(url.split('/item-photos/')[1]))
                await supabase.storage.from('item-photos').remove(pathsToDelete)
            }

            setItem({ ...editForm, image_urls: finalImageUrls })
            setNewImageFiles([])
            setNewImagePreviews([])
            setRemovedUrls([])
            setIsEditing(false)
        }
        setIsSaving(false)
    }

    const handleDelete = async () => {
        const confirmDelete = window.confirm(`Are you sure you want to delete "${item.name}"? This cannot be undone.`)

        if (confirmDelete) {
            setIsSaving(true)

            // 1. Delete all associated images from the storage bucket first
            if (item.image_urls && item.image_urls.length > 0) {
                const pathsToDelete = item.image_urls.map(url => decodeURIComponent(url.split('/item-photos/')[1]))
                await supabase.storage.from('item-photos').remove(pathsToDelete)
            }

            // 2. Delete the item from the database
            const { error } = await supabase.from('items').delete().eq('id', id)

            if (error) {
                alert("Error deleting item: " + error.message)
                setIsSaving(false)
            } else {
                navigate('/', { replace: true })
            }
        }
    }

    if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>
    if (!item) return <div style={{ padding: '20px', textAlign: 'center' }}>Item not found.</div>

    return (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <button onClick={() => navigate(-1)} style={{ padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)' }}>← Back</button>
                <button onClick={() => {
                    setIsEditing(!isEditing)
                    // Reset states if they cancel edit mode
                    setExistingUrls(item.image_urls || [])
                    setRemovedUrls([])
                    setNewImageFiles([])
                    setNewImagePreviews([])
                    setEditForm(item)
                }} className={isEditing ? "btn-danger" : "btn-outline"} style={{ padding: '8px 15px' }}>
                    {isEditing ? 'Cancel Edit' : '✏️ Edit Item'}
                </button>
            </div>

            {isEditing ? (
                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
                    <div>
                        <label style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600 }}>Manage Photos</label>
                        <div className="image-scroll-container" style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '10px 0' }}>
                            {existingUrls.map((url, idx) => (
                                <div key={'old' + idx} style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
                                    <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px', border: '1px solid var(--border)' }} />
                                    <button type="button" onClick={() => handleRemoveExistingImage(idx)} style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--danger)', color: 'white', width: '22px', height: '22px', borderRadius: '50%', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                                </div>
                            ))}
                            {newImagePreviews.map((src, idx) => (
                                <div key={'new' + idx} style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
                                    <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px', border: '2px solid var(--success)' }} />
                                    <button type="button" onClick={() => {
                                        setNewImageFiles(newImageFiles.filter((_, i) => i !== idx))
                                        setNewImagePreviews(newImagePreviews.filter((_, i) => i !== idx))
                                    }} style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--danger)', color: 'white', width: '22px', height: '22px', borderRadius: '50%', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                                </div>
                            ))}
                            <div onClick={() => document.getElementById('edit-photo-input').click()} style={{ width: '80px', height: '80px', background: '#E0E7FF', border: '2px dashed var(--primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
                                <span style={{ fontSize: '28px', color: 'var(--primary)' }}>+</span>
                            </div>
                            <input id="edit-photo-input" type="file" accept="image/*" capture="environment" multiple onChange={handleAddImage} style={{ display: 'none' }} />
                        </div>
                    </div>

                    <div><label style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Name</label><input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }} /></div>

                    <div style={{ display: 'flex', gap: '15px' }}>
                        <div style={{ flex: 1 }}><label style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Retail Price</label><input type="text" value={editForm.retail_price} onChange={e => setEditForm({ ...editForm, retail_price: e.target.value })} required style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }} /></div>
                        <div style={{ flex: 1 }}><label style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Wholesale Price</label><input type="text" value={editForm.wholesale_price} onChange={e => setEditForm({ ...editForm, wholesale_price: e.target.value })} required style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }} /></div>
                    </div>

                    <div><label style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Comments</label><textarea value={editForm.comments} onChange={e => setEditForm({ ...editForm, comments: e.target.value })} rows="3" style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }}></textarea></div>

                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '20px' }}>
                        <button type="submit" disabled={isSaving} className="btn-success" style={{ padding: '15px', fontSize: '18px' }}>{isSaving ? 'Saving...' : 'Save Changes'}</button>
                        <button type="button" onClick={handleDelete} disabled={isSaving} style={{ padding: '15px', fontSize: '16px', background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: '8px' }}>🗑️ Delete Item</button>
                    </div>
                </form>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {item.image_urls && item.image_urls.length > 0 ? (
                        <div className="image-scroll-container" style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px' }}>
                            {item.image_urls.map((url, idx) => (
                                <img key={idx} src={url} alt="Item" style={{ width: '250px', height: '250px', objectFit: 'cover', borderRadius: '12px', flexShrink: 0, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }} />
                            ))}
                        </div>
                    ) : (<div style={{ height: '150px', background: 'var(--border)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No Photos</div>)}

                    <h1 style={{ margin: '0', fontSize: '28px', color: 'var(--primary)' }}>{item.name}</h1>

                    <div style={{ background: '#F9FAFB', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: 'var(--text-muted)' }}>Retail Price</p>
                        <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: 'var(--success)' }}>{item.retail_price}</p>
                        <hr style={{ border: 'none', borderTop: '1px dashed #ccc', margin: '20px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Wholesale Price</p>
                            <button onClick={() => setShowWholesale(!showWholesale)} style={{ background: 'none', color: 'var(--primary)', textDecoration: 'underline', padding: '5px' }}>{showWholesale ? 'Hide' : 'Reveal'}</button>
                        </div>
                        {showWholesale && (<p style={{ margin: '10px 0 0 0', fontSize: '22px', fontWeight: 'bold', color: 'var(--danger)' }}>{item.wholesale_price}</p>)}
                    </div>

                    {item.comments && (
                        <div>
                            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600 }}>Comments / Details</p>
                            <p style={{ margin: 0, padding: '15px', background: '#F0FDF4', borderLeft: '4px solid var(--success)', borderRadius: '0 8px 8px 0', color: 'var(--text-main)', lineHeight: '1.5' }}>{item.comments}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}