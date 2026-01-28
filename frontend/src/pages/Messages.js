import React, { useState, useEffect } from 'react';
import { communicationAPI, usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FiPlus, FiInbox, FiSend, FiMail, FiTrash2 } from 'react-icons/fi';
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

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [inboxRes, sentRes, usersRes] = await Promise.all([
        communicationAPI.getInbox(),
        communicationAPI.getSent(),
        usersAPI.getAll()
      ]);
      setInbox(inboxRes.data);
      setSent(sentRes.data);
      setUsers(usersRes.data.filter(u => u.id !== user.id));
    } catch (error) { toast.error('Failed to load messages'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await communicationAPI.sendMessage(formData);
      toast.success('Message sent');
      setShowModal(false);
      setActiveTab('sent'); // Switch to Sent tab to show the new message
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

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this message?')) return;
    try { await communicationAPI.deleteMessage(id); toast.success('Deleted'); loadData(); }
    catch (error) { toast.error('Failed'); }
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const messages = activeTab === 'inbox' ? inbox : sent;
  const unreadCount = inbox.filter(m => !m.isRead).length;

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Messages</h1><p className="page-subtitle">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p></div>
        <button className="btn btn-primary" onClick={() => { setFormData({ receiverId: '', subject: '', content: '' }); setShowModal(true); }}><FiPlus /> New Message</button>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'inbox' ? 'active' : ''}`} onClick={() => setActiveTab('inbox')}><FiInbox /> Inbox {unreadCount > 0 && <span className="badge badge-danger" style={{ marginLeft: '8px' }}>{unreadCount}</span>}</button>
        <button className={`tab ${activeTab === 'sent' ? 'active' : ''}`} onClick={() => setActiveTab('sent')}><FiSend /> Sent</button>
      </div>

      <div className="card">
        {messages.length === 0 ? (
          <div className="empty-state"><FiMail /><h3>No messages</h3><p>Your {activeTab} is empty</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {messages.map(msg => (
              <div key={msg.id} onClick={() => handleView(msg)} style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: !msg.isRead && activeTab === 'inbox' ? 'var(--dark-light)' : 'transparent' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px' }}>
                  {activeTab === 'inbox' ? msg.sender?.firstName?.[0] : msg.receiver?.firstName?.[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: !msg.isRead && activeTab === 'inbox' ? 600 : 400 }}>
                      {activeTab === 'inbox' ? `${msg.sender?.firstName} ${msg.sender?.lastName}` : `To: ${msg.receiver?.firstName} ${msg.receiver?.lastName}`}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDate(msg.createdAt)}</span>
                  </div>
                  <div style={{ fontWeight: !msg.isRead && activeTab === 'inbox' ? 500 : 400 }}>{msg.subject}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.content.substring(0, 100)}</div>
                </div>
                <button className="btn btn-sm btn-danger" style={{ marginLeft: '12px' }} onClick={(e) => { e.stopPropagation(); handleDelete(msg.id); }}><FiTrash2 /></button>
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
    </div>
  );
};

export default Messages;
