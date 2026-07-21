import React, { useState, useEffect, useRef, useCallback } from 'react';
import { financialAPI, locationsAPI } from '../services/api';
import { useMetadata } from '../hooks/useMetadata';
import { FiPlus, FiEdit2, FiPercent, FiCheck, FiCalendar, FiChevronLeft, FiChevronRight, FiTrash2, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Pagination from '../components/Pagination';
import SortableHeader from '../components/SortableHeader';
import ExportButtons from '../components/ExportButtons';
import ConfirmDialog from '../components/ConfirmDialog';
import { PageSkeleton } from '../components/LoadingSkeleton';

// Modern Month Picker Component
const MonthPicker = ({ value, onChange, required }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [currentYear, setCurrentYear] = useState(value ? parseInt(value.split('-')[0]) : new Date().getFullYear());
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShowPicker(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const months = [
    { short: 'Jan', full: 'January' },
    { short: 'Feb', full: 'February' },
    { short: 'Mar', full: 'March' },
    { short: 'Apr', full: 'April' },
    { short: 'May', full: 'May' },
    { short: 'Jun', full: 'June' },
    { short: 'Jul', full: 'July' },
    { short: 'Aug', full: 'August' },
    { short: 'Sep', full: 'September' },
    { short: 'Oct', full: 'October' },
    { short: 'Nov', full: 'November' },
    { short: 'Dec', full: 'December' }
  ];

  const selectMonth = (monthIdx) => {
    const formatted = `${currentYear}-${String(monthIdx + 1).padStart(2, '0')}`;
    onChange(formatted);
    setShowPicker(false);
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month] = dateStr.split('-');
    return `${months[parseInt(month) - 1].full} ${year}`;
  };

  const selectedMonth = value ? parseInt(value.split('-')[1]) - 1 : null;
  const selectedYear = value ? parseInt(value.split('-')[0]) : null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => setShowPicker(!showPicker)}
        className="form-input"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <FiCalendar size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <span style={{ flex: 1, color: value ? 'inherit' : 'var(--text-muted)' }}>
          {value ? formatDisplayDate(value) : 'Select period...'}
        </span>
      </div>

      {showPicker && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: 0,
          zIndex: 1000,
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          width: '280px'
        }}>
          {/* Year Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            background: 'linear-gradient(135deg, var(--primary), #4f46e5)',
            color: 'white'
          }}>
            <button
              type="button"
              onClick={() => setCurrentYear(currentYear - 1)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}
            >
              <FiChevronLeft size={20} />
            </button>
            <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              {currentYear}
            </span>
            <button
              type="button"
              onClick={() => setCurrentYear(currentYear + 1)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}
            >
              <FiChevronRight size={20} />
            </button>
          </div>

          {/* Month Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            padding: '16px',
            gap: '8px'
          }}>
            {months.map((m, idx) => {
              const isSelected = selectedMonth === idx && selectedYear === currentYear;
              const isCurrentMonth = new Date().getMonth() === idx && new Date().getFullYear() === currentYear;

              return (
                <button
                  key={m.short}
                  type="button"
                  onClick={() => selectMonth(idx)}
                  style={{
                    padding: '12px 8px',
                    border: isCurrentMonth && !isSelected ? '2px solid var(--primary)' : '2px solid transparent',
                    borderRadius: '8px',
                    background: isSelected ? 'var(--primary)' : 'var(--bg-secondary)',
                    color: isSelected ? 'white' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontWeight: isSelected || isCurrentMonth ? 600 : 400,
                    fontSize: '0.9rem',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.target.style.background = 'var(--primary)';
                      e.target.style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.target.style.background = 'var(--bg-secondary)';
                      e.target.style.color = 'var(--text-primary)';
                    }
                  }}
                >
                  {m.short}
                </button>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: '8px',
            background: 'var(--bg-secondary)'
          }}>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const formatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                onChange(formatted);
                setShowPicker(false);
              }}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                borderRadius: '8px',
                background: 'var(--primary)',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                now.setMonth(now.getMonth() - 1);
                const formatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                onChange(formatted);
                setShowPicker(false);
              }}
              style={{
                flex: 1,
                padding: '10px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '0.85rem'
              }}
            >
              Last Month
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Royalties = () => {
  const { enums } = useMetadata();
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ locationId: '', period: '', amountDue: '', amountPaid: '', status: 'PENDING' });

  // New state for pagination, sort, bulk, confirm, detail
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const [detailItem, setDetailItem] = useState(null);
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [bulkUpdateData, setBulkUpdateData] = useState({});

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [royRes, locRes] = await Promise.all([
        financialAPI.getRoyalties({ status: statusFilter, page, limit: 15, sortBy, sortOrder }),
        locationsAPI.getAll()
      ]);
      setItems(royRes.data.data);
      setPagination(royRes.data.pagination);
      setLocations(locRes.data);
      setSelectedIds([]);
    } catch (error) { toast.error('Failed to load royalties'); }
    finally { setLoading(false); }
  }, [statusFilter, page, sortBy, sortOrder]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.period) {
      toast.error('Please select a period');
      return;
    }
    try {
      const data = { ...formData, amountDue: parseFloat(formData.amountDue), amountPaid: parseFloat(formData.amountPaid || 0) };
      if (editing) { await financialAPI.updateRoyalty(editing.id, data); toast.success('Updated'); }
      else { await financialAPI.createRoyalty(data); toast.success('Created'); }
      setShowModal(false); loadData();
    } catch (error) { toast.error('Failed'); }
  };

  const handleMarkPaid = async (item) => {
    try {
      await financialAPI.updateRoyalty(item.id, { amountPaid: item.amountDue, status: 'PAID', paidDate: new Date().toISOString() });
      toast.success('Marked as paid');
      loadData();
    } catch (error) { toast.error('Failed'); }
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Royalty Record',
      message: 'Are you sure you want to delete this royalty record? This action cannot be undone.',
      variant: 'danger',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await financialAPI.deleteRoyalty(id);
          toast.success('Deleted');
          setConfirmDialog({ isOpen: false });
          setDetailItem(null);
          loadData();
        } catch (error) { toast.error('Failed to delete'); setConfirmDialog({ isOpen: false }); }
      },
      onCancel: () => setConfirmDialog({ isOpen: false })
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Selected Records',
      message: `Are you sure you want to delete ${selectedIds.length} royalty record(s)? This action cannot be undone.`,
      variant: 'danger',
      confirmLabel: `Delete ${selectedIds.length}`,
      onConfirm: async () => {
        try {
          await financialAPI.bulkDeleteRoyalties(selectedIds);
          toast.success(`${selectedIds.length} records deleted`);
          setSelectedIds([]);
          setConfirmDialog({ isOpen: false });
          loadData();
        } catch (error) { toast.error('Failed to delete'); setConfirmDialog({ isOpen: false }); }
      },
      onCancel: () => setConfirmDialog({ isOpen: false })
    });
  };

  const handleBulkUpdate = async () => {
    if (selectedIds.length === 0) return;
    try {
      await financialAPI.bulkUpdateRoyalties({ ids: selectedIds, data: bulkUpdateData });
      toast.success(`${selectedIds.length} records updated`);
      setSelectedIds([]);
      setShowBulkUpdateModal(false);
      setBulkUpdateData({});
      loadData();
    } catch (error) { toast.error('Failed to update'); }
  };

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
    setPage(1);
  };

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(prev => prev.length === items.length ? [] : items.map(i => i.id));

  const statusBadge = (status) => {
    const classes = { PENDING: 'badge-warning', PAID: 'badge-success', OVERDUE: 'badge-danger', PARTIAL: 'badge-info' };
    return <span className={`badge ${classes[status]}`}>{status}</span>;
  };

  const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value || 0);
  const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  const exportColumns = [
    { label: 'Location', accessor: (d) => d.location?.name || d.locationId },
    { label: 'Period', accessor: (d) => formatDate(d.period) },
    { label: 'Amount Due', accessor: 'amountDue' },
    { label: 'Amount Paid', accessor: 'amountPaid' },
    { label: 'Status', accessor: 'status' }
  ];

  if (loading && items.length === 0) return <PageSkeleton />;

  const totalDue = items.reduce((sum, i) => sum + i.amountDue, 0);
  const totalPaid = items.reduce((sum, i) => sum + i.amountPaid, 0);

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Royalty Tracking</h1><p className="page-subtitle">{pagination?.total || items.length} records</p></div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <ExportButtons data={items} columns={exportColumns} filename="royalties" title="Royalty Tracking Report" />
          <button className="btn btn-primary" onClick={() => { setEditing(null); setFormData({ locationId: '', period: '', amountDue: '', amountPaid: '', status: 'PENDING' }); setShowModal(true); }}><FiPlus /> Add Record</button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><FiPercent /></div>
          <div className="stat-content"><h3>Total Due</h3><div className="stat-value">{formatCurrency(totalDue)}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><FiCheck /></div>
          <div className="stat-content"><h3>Total Paid</h3><div className="stat-value">{formatCurrency(totalPaid)}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><FiPercent /></div>
          <div className="stat-content"><h3>Outstanding</h3><div className="stat-value">{formatCurrency(totalDue - totalPaid)}</div></div>
        </div>
      </div>

      <div className="filter-bar">
        <select className="form-select" style={{ width: '150px' }} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {enums.paymentStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
          background: 'var(--primary)', borderRadius: '8px', marginBottom: '12px', color: 'white'
        }}>
          <span style={{ fontWeight: 600 }}>{selectedIds.length} selected</span>
          <button className="btn btn-sm btn-danger" onClick={handleBulkDelete}><FiTrash2 /> Delete Selected</button>
          <button className="btn btn-sm btn-secondary" onClick={() => { setBulkUpdateData({}); setShowBulkUpdateModal(true); }}><FiEdit2 /> Update Status</button>
          <button className="btn btn-sm btn-secondary" onClick={() => setSelectedIds([])} style={{ marginLeft: 'auto' }}><FiX /> Clear</button>
        </div>
      )}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input type="checkbox" checked={items.length > 0 && selectedIds.length === items.length} onChange={toggleSelectAll} />
              </th>
              <SortableHeader label="Location" field="locationId" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Period" field="period" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Amount Due" field="amountDue" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Amount Paid" field="amountPaid" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Status" field="status" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => setDetailItem(item)} style={{ cursor: 'pointer' }}>
                <td onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} />
                </td>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FiPercent style={{ color: 'var(--primary)' }} />{item.location?.name || '-'}</div></td>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FiCalendar size={14} style={{ color: 'var(--text-muted)' }} />{formatDate(item.period)}</div></td>
                <td>{formatCurrency(item.amountDue)}</td>
                <td>{formatCurrency(item.amountPaid)}</td>
                <td>{statusBadge(item.status)}</td>
                <td onClick={e => e.stopPropagation()}>
                  <div className="action-buttons">
                    {item.status !== 'PAID' && <button className="btn btn-sm btn-success" onClick={() => handleMarkPaid(item)}><FiCheck /> Paid</button>}
                    <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(item); setFormData({ locationId: item.locationId, period: item.period.split('T')[0].substring(0, 7), amountDue: item.amountDue.toString(), amountPaid: item.amountPaid.toString(), status: item.status }); setShowModal(true); }}><FiEdit2 /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>

      {/* Detail Modal */}
      {detailItem && (
        <div className="modal-overlay" onClick={() => setDetailItem(null)}>
          <div className="modal" style={{ maxWidth: '550px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Royalty Record Details</h3>
              <button className="modal-close" onClick={() => setDetailItem(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div><strong>Location:</strong><div>{detailItem.location?.name || '-'}</div></div>
                <div><strong>Period:</strong><div>{formatDate(detailItem.period)}</div></div>
                <div><strong>Amount Due:</strong><div>{formatCurrency(detailItem.amountDue)}</div></div>
                <div><strong>Amount Paid:</strong><div>{formatCurrency(detailItem.amountPaid)}</div></div>
                <div><strong>Status:</strong><div>{statusBadge(detailItem.status)}</div></div>
                <div><strong>Outstanding:</strong><div style={{ color: 'var(--warning)' }}>{formatCurrency(detailItem.amountDue - detailItem.amountPaid)}</div></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger" onClick={() => handleDelete(detailItem.id)}><FiTrash2 /> Delete</button>
              <button className="btn btn-primary" onClick={() => {
                setEditing(detailItem);
                setFormData({
                  locationId: detailItem.locationId,
                  period: detailItem.period.split('T')[0].substring(0, 7),
                  amountDue: detailItem.amountDue.toString(),
                  amountPaid: detailItem.amountPaid.toString(),
                  status: detailItem.status
                });
                setDetailItem(null);
                setShowModal(true);
              }}><FiEdit2 /> Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Update Modal */}
      {showBulkUpdateModal && (
        <div className="modal-overlay" onClick={() => setShowBulkUpdateModal(false)}>
          <div className="modal" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Bulk Update {selectedIds.length} Records</h3>
              <button className="modal-close" onClick={() => setShowBulkUpdateModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={bulkUpdateData.status || ''} onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, status: e.target.value })}>
                  <option value="">-- No change --</option>
                  {enums.paymentStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowBulkUpdateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleBulkUpdate}>Update</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">{editing ? 'Edit Record' : 'Add Record'}</h3><button className="modal-close" onClick={() => setShowModal(false)}>&times;</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Location *</label><select className="form-select" required value={formData.locationId} onChange={(e) => setFormData({...formData, locationId: e.target.value})}><option value="">Select Location</option>{locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Period *</label><MonthPicker value={formData.period} onChange={(period) => setFormData({...formData, period})} required /></div>
                  <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>{enums.paymentStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Amount Due *</label><input type="number" step="0.01" className="form-input" required value={formData.amountDue} onChange={(e) => setFormData({...formData, amountDue: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Amount Paid</label><input type="number" step="0.01" className="form-input" value={formData.amountPaid} onChange={(e) => setFormData({...formData, amountPaid: e.target.value})} /></div>
                </div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button></div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog {...confirmDialog} />
    </div>
  );
};

export default Royalties;
