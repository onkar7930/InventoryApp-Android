import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import imageCompression from 'browser-image-compression'

export default function AddNewItem({ session }) {
    const navigate = useNavigate()

    const [name, setName] = useState('')
    const [retailPrice, setRetailPrice] = useState('')
    const [wholesalePrice, setWholesalePrice] = useState('')
    const [comments, setComments] = useState('')

    const [imageFiles, setImageFiles] = useState([])
    const [imagePreviews, setImagePreviews] = useState([])
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleAddImage = (e) => {
        if (e.target.files) {
            const files = Array.from(e.target.files)
            setImageFiles([...imageFiles, ...files])
            const previews = files.map(file => URL.createObjectURL(file))
            setImagePreviews([...imagePreviews, ...previews])
        }
    }

    const removeImage = (index) => {
        const newFiles = [...imageFiles]; newFiles.splice(index, 1);
        setImageFiles(newFiles);
        const newPreviews = [...imagePreviews]; newPreviews.splice(index, 1);
        setImagePreviews(newPreviews);
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            let uploadedImageUrls = []

            // --- NEW: Compression Settings ---
            const compressionOptions = {
                maxSizeMB: 0.15, // Compress to max 150KB
                maxWidthOrHeight: 1024, // Resize to max 1024px
                useWebWorker: true
            }

            if (imageFiles.length > 0) {
                for (const file of imageFiles) {
                    // 1. Compress the file BEFORE upload
                    const compressedFile = await imageCompression(file, compressionOptions)

                    const fileExt = compressedFile.name.split('.').pop() || 'jpg'
                    const fileName = `${session.user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

                    // 2. Upload the tiny compressed file
                    await supabase.storage.from('item-photos').upload(fileName, compressedFile)
                    const { data } = supabase.storage.from('item-photos').getPublicUrl(fileName)
                    uploadedImageUrls.push(data.publicUrl)
                }
            }

            await supabase.from('items').insert([{
                user_id: session.user.id,
                name: name,
                retail_price: retailPrice,
                wholesale_price: wholesalePrice,
                comments: comments,
                image_urls: uploadedImageUrls
            }])
            navigate(-1)
        } catch (error) {
            alert('Error adding item: ' + error.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div style={{ padding: '20px' }}>
            <h2 style={{ marginTop: 0 }}>Add New Item</h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                    <label style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600 }}>Photos</label>
                    <div className="image-scroll-container" style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '10px 0' }}>
                        {imagePreviews.map((src, idx) => (
                            <div key={idx} style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
                                <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px', border: '1px solid var(--border)' }} />
                                <button type="button" onClick={() => removeImage(idx)} style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--danger)', color: 'white', width: '22px', height: '22px', borderRadius: '50%', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                            </div>
                        ))}
                        <div onClick={() => document.getElementById('photo-input').click()} style={{ width: '80px', height: '80px', background: '#E0E7FF', border: '2px dashed var(--primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
                            <span style={{ fontSize: '28px', color: 'var(--primary)' }}>+</span>
                        </div>
                        <input id="photo-input" type="file" accept="image/*" onChange={handleAddImage} style={{ display: 'none' }} />
                    </div>
                </div>

                <div>
                    <label style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Item Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required style={{ width: '100%', padding: '12px', boxSizing: 'border-box', marginTop: '5px' }} />
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Retail Price</label>
                        <input type="text" placeholder="e.g. 100 per doz" value={retailPrice} onChange={e => setRetailPrice(e.target.value)} required style={{ width: '100%', padding: '12px', boxSizing: 'border-box', marginTop: '5px' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Wholesale Price</label>
                        <input type="text" placeholder="e.g. 50 per pkt" value={wholesalePrice} onChange={e => setWholesalePrice(e.target.value)} required style={{ width: '100%', padding: '12px', boxSizing: 'border-box', marginTop: '5px' }} />
                    </div>
                </div>

                <div>
                    <label style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Comments / Details</label>
                    <textarea value={comments} onChange={e => setComments(e.target.value)} rows="3" style={{ width: '100%', padding: '12px', boxSizing: 'border-box', marginTop: '5px' }}></textarea>
                </div>

                <button type="submit" disabled={isSubmitting} className="btn-success" style={{ padding: '15px', fontSize: '18px', marginTop: '10px' }}>
                    {isSubmitting ? 'Saving...' : 'Save Item'}
                </button>
            </form>
        </div>
    )
}