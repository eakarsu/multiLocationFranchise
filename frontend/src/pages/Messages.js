import React, { useState, useEffect } from 'react';
import { communicationAPI, usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import { PageSkeleton } from '../components/LoadingSkeleton';
import { FiPlus, FiInbox, FiSend, FiMail, FiTrash2, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Messages = () => {
  const { user } = useAuth();
  const [inbox, setInbox] = useState([]);
  const [sent, setSent] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inbox');
  const [showModal, setShowModal] = useState(false);
  const [showView, setShowView] = useState(null);
  const [formData, setFormData] = useState({ receiverId: '', subject: '', content: '' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [inboxRes, sentRes, usersRes] = await Promise.all([
        communicationAPI.getInbox(),
        communicationAPI.getSent(),
        usersAPI.getAll()
      ]);
      setInbox(Array.isArray(inboxRes.data) ? inboxRes.data : inboxRes.data.data || []);
      setSent(Array.isArray(sentRes.data) ? sentRes.data : sentRes.data.data || []);
      const usersData = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.data || [];
      setUsers(usersData.filter(u => u.id !== user.id));
    } catch (error) { toast.error('Failed to load messages'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await communicationAPI.sendMessage(formData);
      toast.success('Message sent');
      setShowModal(false);
      setActiveTab('sent');
      loadData();
    } catch (error) { toast.error('Failed to send'); }
  };

  const handleView = async (message) => {
    if (!message.isRead && message.receiverId === user.id) {
      await communicationAPI.markRead(message.id);
      loadData();
    }
    setShowView(message);
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      title: 'Delete Message',
      message: 'Are you sure you want to delete this message?',
      onConfirm: async () => {
        try { await communicationAPI.deleteMessage(id); toast.success('Deleted'); setConfirmDialog(null); loadData(); }
        catch (error) { toast.error('Failed to delete'); setConfirmDialog(null); }
      }
    });
  };

  const handleBulkDelete = () => {
    setConfirmDialog({
      title: 'Delete Selected Messages',
      message: `Are you sure you want to delete ${selectedIds.length} selected message(s)?`,
      onConfirm: async () => {
        try {
          await Promise.all(selectedIds.map(id => communicationAPI.deleteMessage(id)));
          toast.success(`Deleted ${selectedIds.length} messages`);
          setSelectedIds([]);
          setConfirmDialog(null);
          loadData();
        } catch (error) { toast.error('Failed to delete some messages'); setConfirmDialog(null); }
      }
    });
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    const filtered = filteredMessages;
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(m => m.id));
    }
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const allMessages = activeTab === 'inbox' ? inbox : sent;
  const filteredMessages = search
    ? allMessages.filter(m =>
        m.subject?.toLowerCase().includes(search.toLowerCase()) ||
        m.content?.toLowerCase().includes(search.toLowerCase()) ||
        (activeTab === 'inbox'
          ? `${m.sender?.firstName} ${m.sender?.lastName}`.toLowerCase().includes(search.toLowerCase())
          : `${m.receiver?.firstName} ${m.receiver?.lastName}`.toLowerCase().includes(search.toLowerCase()))
      )
    : allMessages;
  const unreadCount = inbox.filter(m => !m.isRead).length;

  if (loading && inbox.length === 0 && sent.length === 0) return <PageSkeleton />;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Messages</h1><p className="page-subtitle">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p></div>
        <button className="btn btn-primary" onClick={() => { setFormData({ receiverId: '', subject: '', content: '' }); setShowModal(true); }}><FiPlus /> New Message</button>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'inbox' ? 'active' : ''}`} onClick={() => { setActiveTab('inbox'); setSelectedIds([]); setSearch(''); }}><FiInbox /> Inbox {unreadCount > 0 && <span className="badge badge-danger" style={{ marginLeft: '8px' }}>{unreadCount}</span>}</button>
        <button className={`tab ${activeTab === 'sent' ? 'active' : ''}`} onClick={() => { setActiveTab('sent'); setSelectedIds([]); setSearch(''); }}><FiSend /> Sent</button>
      </div>

      {/* Search bar */}
      <div className="filter-bar" style={{ marginBottom: '16px' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '36px' }}
            placeholder="Search messages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'var(--dark-light)', borderRadius: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '0.9rem' }}>{selectedIds.length} selected</span>
          <button className="btn btn-sm btn-danger" onClick={handleBulkDelete}><FiTrash2 /> Delete Selected</button>
          <button className="btn btn-sm btn-secondary" onClick={() => setSelectedIds([])}>Clear Selection</button>
        </div>
      )}

      <div className="card">
        {filteredMessages.length === 0 ? (
          <div className="empty-state"><FiMail /><h3>No messages</h3><p>{search ? 'No messages match your search' : `Your ${activeTab} is empty`}</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Select all header */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--dark-light)' }}>
              <input
                type="checkbox"
                checked={selectedIds.length === filteredMessages.length && filteredMessages.length > 0}
                onChange={toggleSelectAll}
                style={{ marginRight: '12px' }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Select All</span>
            </div>
            {filteredMessages.map(msg => (
              <div key={msg.id} onClick={() => handleView(msg)} style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: !msg.isRead && activeTab === 'inbox' ? 'var(--dark-light)' : 'transparent' }}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(msg.id)}
                  onChange={(e) => { e.stopPropagation(); toggleSelect(msg.id); }}
                  style={{ marginRight: '12px' }}
                />
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', flexShrink: 0 }}>
                  {activeTab === 'inbox' ? msg.sender?.firstName?.[0] : msg.receiver?.firstName?.[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: !msg.isRead && activeTab === 'inbox' ? 600 : 400 }}>
                      {activeTab === 'inbox' ? `${msg.sender?.firstName} ${msg.sender?.lastName}` : `To: ${msg.receiver?.firstName} ${msg.receiver?.lastName}`}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDate(msg.createdAt)}</span>
                  </div>
                  <div style={{ fontWeight: !msg.isRead && activeTab === 'inbox' ? 500 : 400 }}>{msg.subject}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.content?.substring(0, 100)}</div>
                </div>
                <button className="btn btn-sm btn-danger" style={{ marginLeft: '12px', flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); handleDelete(msg.id); }}><FiTrash2 /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showView && (
        <div className="modal-overlay" onClick={() => setShowView(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{showView.subject}</h3>
              <button className="modal-close" onClick={() => setShowView(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <div>From: {showView.sender?.firstName} {showView.sender?.lastName} ({showView.sender?.email})</div>
                <div>To: {showView.receiver?.firstName} {showView.receiver?.lastName}</div>
                <div>Date: {formatDate(showView.createdAt)}</div>
              </div>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{showView.content}</div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger" onClick={() => { setShowView(null); handleDelete(showView.id); }}><FiTrash2 /> Delete</button>
              <button className="btn btn-primary" onClick={() => { setShowView(null); setFormData({ receiverId: showView.senderId === user.id ? showView.receiverId : showView.senderId, subject: `Re: ${showView.subject}`, content: '' }); setShowModal(true); }}><FiSend /> Reply</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">New Message</h3><button className="modal-close" onClick={() => setShowModal(false)}>&times;</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">To *</label><select className="form-select" required value={formData.receiverId} onChange={(e) => setFormData({...formData, receiverId: e.target.value})}><option value="">Select recipient</option>{users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>)}</select></div>
                <div className="form-group"><label className="form-label">Subject *</label><input type="text" className="form-input" required value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Message *</label><textarea className="form-textarea" style={{ minHeight: '150px' }} required value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary"><FiSend /> Send</button></div>
            </form>
          </div>
        </div>
      )}

      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
};

export default Messages;
