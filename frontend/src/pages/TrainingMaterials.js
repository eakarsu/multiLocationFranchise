import React, { useState, useEffect } from 'react';
import { brandAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useMetadata } from '../hooks/useMetadata';
import { FiPlus, FiEdit2, FiTrash2, FiAward, FiPlay, FiFile, FiHelpCircle, FiClock, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';

const TrainingMaterials = () => {
  const { isCorporate } = useAuth();
  const { enums } = useMetadata();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ title: '', category: '', description: '', contentType: 'video', contentUrl: '', duration: '', isRequired: false });
  const [videoModal, setVideoModal] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try { const res = await brandAPI.getTraining(); setItems(res.data); }
    catch (error) { toast.error('Failed to load training materials'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...formData, duration: formData.duration ? parseInt(formData.duration) : null };
      if (editing) { await brandAPI.updateTraining(editing.id, data); toast.success('Updated'); }
      else { await brandAPI.createTraining(data); toast.success('Created'); }
      setShowModal(false); loadData();
    } catch (error) { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this training material?')) return;
    try { await brandAPI.deleteTraining(id); toast.success('Deleted'); loadData(); }
    catch (error) { toast.error('Failed'); }
  };

  const handleStart = (item) => {
    if (!item.contentUrl) return;

    // Check if it's a YouTube URL (embed or watch)
    if (item.contentUrl.includes('youtube.com') || item.contentUrl.includes('youtu.be')) {
      setVideoModal(item);
    } else {
      // For non-YouTube URLs, open in new tab
      window.open(item.contentUrl, '_blank');
    }
  };

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return '';
    // Already an embed URL
    if (url.includes('/embed/')) return url;
    // Convert watch URL to embed
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
    return url;
  };

  const typeIcon = { video: FiPlay, document: FiFile, quiz: FiHelpCircle };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Training Materials</h1><p className="page-subtitle">{items.length} materials</p></div>
        {isCorporate() && <button className="btn btn-primary" onClick={() => { setEditing(null); setFormData({ title: '', category: '', description: '', contentType: 'video', contentUrl: '', duration: '', isRequired: false }); setShowModal(true); }}><FiPlus /> Add Material</button>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {items.map(item => {
          const Icon = typeIcon[item.contentType] || FiAward;
          const isYouTube = item.contentUrl && (item.contentUrl.includes('youtube.com') || item.contentUrl.includes('youtu.be'));
          return (
            <div key={item.id} className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={24} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '1rem', margin: 0 }}>{item.title}</h3>
                    {item.isRequired && <span className="badge badge-danger">Required</span>}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>{item.description || 'No description'}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span className="badge badge-info">{item.category}</span>
                    <span className="badge badge-primary">{item.contentType}</span>
                    {item.duration && <span><FiClock size={12} /> {item.duration} min</span>}
                    {isYouTube && <span className="badge badge-success">Video Ready</span>}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', gap: '8px' }}>
                <button className="btn btn-sm btn-primary" onClick={() => handleStart(item)} disabled={!item.contentUrl}><FiPlay /> Start</button>
                {isCorporate() && <>
                  <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(item); setFormData({ title: item.title, category: item.category, description: item.description || '', contentType: item.contentType, contentUrl: item.contentUrl, duration: item.duration?.toString() || '', isRequired: item.isRequired }); setShowModal(true); }}><FiEdit2 /></button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}><FiTrash2 /></button>
                </>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit/Add Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">{editing ? 'Edit Material' : 'Add Material'}</h3><button className="modal-close" onClick={() => setShowModal(false)}>&times;</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Title *</label><input type="text" className="form-input" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Category *</label><input type="text" className="form-input" required value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Type *</label><select className="form-select" value={formData.contentType} onChange={(e) => setFormData({...formData, contentType: e.target.value})}>{enums.contentTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Content URL *</label><input type="text" className="form-input" required value={formData.contentUrl} onChange={(e) => setFormData({...formData, contentUrl: e.target.value})} placeholder="YouTube URL or file path" /></div>
                  <div className="form-group"><label className="form-label">Duration (min)</label><input type="number" className="form-input" value={formData.duration} onChange={(e) => setFormData({...formData, duration: e.target.value})} /></div>
                </div>
                <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} /></div>
                <div className="form-group"><label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input type="checkbox" checked={formData.isRequired} onChange={(e) => setFormData({...formData, isRequired: e.target.checked})} /> Required for all employees</label></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      {videoModal && (
        <div className="modal-overlay" onClick={() => setVideoModal(null)} style={{ zIndex: 1001 }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#000',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '900px',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
              color: 'white'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{videoModal.title}</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', opacity: 0.8 }}>{videoModal.category} - {videoModal.duration} min</p>
              </div>
              <button
                onClick={() => setVideoModal(null)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <FiX size={20} />
              </button>
            </div>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
              <iframe
                src={getYouTubeEmbedUrl(videoModal.contentUrl) + '?autoplay=1'}
                title={videoModal.title}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingMaterials;
