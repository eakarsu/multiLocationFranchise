import React, { useState, useEffect, useRef } from 'react';
import { aiAPI, locationsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FiCpu, FiTrendingUp, FiBarChart2, FiCheckCircle, FiCalendar, FiStar, FiAlertTriangle, FiFileText, FiPlay, FiZap, FiTarget, FiShield, FiInfo, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import toast from 'react-hot-toast';

// Modern Date Picker Component
const DatePicker = ({ value, onChange, placeholder }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShowCalendar(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  const selectDate = (day) => {
    const selected = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const formatted = selected.toISOString().split('T')[0];
    onChange(formatted);
    setShowCalendar(false);
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const cells = [];
    const today = new Date().toISOString().split('T')[0];

    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} style={{ padding: '8px' }}></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toISOString().split('T')[0];
      const isSelected = value === dateStr;
      const isToday = today === dateStr;

      cells.push(
        <button
          key={day}
          type="button"
          onClick={() => selectDate(day)}
          style={{
            width: '32px',
            height: '32px',
            border: isToday && !isSelected ? '2px solid var(--primary)' : '2px solid transparent',
            borderRadius: '50%',
            background: isSelected ? 'var(--primary)' : 'transparent',
            color: isSelected ? 'white' : 'var(--text-primary)',
            cursor: 'pointer',
            fontWeight: isSelected || isToday ? 600 : 400,
            fontSize: '0.85rem',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            if (!isSelected) {
              e.target.style.background = 'var(--primary)';
              e.target.style.color = 'white';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected) {
              e.target.style.background = 'transparent';
              e.target.style.color = 'var(--text-primary)';
            }
          }}
        >
          {day}
        </button>
      );
    }
    return cells;
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => setShowCalendar(!showCalendar)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          cursor: 'pointer',
          userSelect: 'none',
          color: 'var(--text-primary)'
        }}
      >
        <FiCalendar size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: '0.9rem', color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          {value ? formatDisplayDate(value) : (placeholder || 'Select date...')}
        </span>
      </div>

      {showCalendar && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: 0,
          zIndex: 1000,
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          width: '280px'
        }}>
          {/* Month/Year Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 16px',
            background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
            color: 'white'
          }}>
            <button
              type="button"
              onClick={prevMonth}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '6px',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}
            >
              <FiChevronLeft size={18} />
            </button>
            <span style={{ fontSize: '1rem', fontWeight: 600 }}>
              {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '6px',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}
            >
              <FiChevronRight size={18} />
            </button>
          </div>

          {/* Day Names */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            padding: '10px 12px 6px',
            gap: '2px'
          }}>
            {days.map(d => (
              <div key={d} style={{
                textAlign: 'center',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                padding: '4px'
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            padding: '0 12px 12px',
            gap: '2px',
            justifyItems: 'center'
          }}>
            {renderCalendar()}
          </div>

          {/* Quick Actions */}
          <div style={{
            padding: '10px 12px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: '8px',
            background: 'var(--bg-secondary)'
          }}>
            <button
              type="button"
              onClick={() => {
                onChange(new Date().toISOString().split('T')[0]);
                setShowCalendar(false);
              }}
              style={{
                flex: 1,
                padding: '8px',
                border: 'none',
                borderRadius: '6px',
                background: 'var(--primary)',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.8rem'
              }}
            >
              Today
            </button>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setShowCalendar(false);
                }}
                style={{
                  padding: '8px 12px',
                  border: '1px solid var(--danger)',
                  borderRadius: '6px',
                  background: 'transparent',
                  color: 'var(--danger)',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '0.8rem'
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper to safely render any value that might be a string, number, or object
const safeRender = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.map(v => safeRender(v)).join(', ');
  if (typeof value === 'object') {
    // Try to extract meaningful string from common keys
    if (value.overall) return safeRender(value.overall);
    if (value.message) return value.message;
    if (value.text) return value.text;
    if (value.description) return value.description;
    if (value.status) return value.status;
    if (value.summary) return value.summary;
    // For other objects, format as key-value pairs
    return Object.entries(value)
      .map(([k, v]) => `${k.replace(/([A-Z])/g, ' $1').trim()}: ${safeRender(v)}`)
      .join(' | ');
  }
  return String(value);
};

// Helper to safely render insight/recommendation items that might be strings or objects
const renderItem = (item) => {
  if (typeof item === 'string') return item;
  if (typeof item === 'number') return item.toString();
  if (typeof item === 'object' && item !== null) {
    // Handle various object formats from AI
    if (item.insight) return item.insight;
    if (item.recommendation) return item.recommendation;
    if (item.riskFactor) return item.riskFactor;
    if (item.text) return item.text;
    if (item.message) return item.message;
    if (item.finding) return item.finding;
    if (item.description) return item.description;
    if (item.overall) return safeRender(item.overall);
    // For any other object, try to extract the first string value
    const values = Object.values(item);
    const firstString = values.find(v => typeof v === 'string');
    if (firstString) return firstString;
    // Last resort: format as readable text
    return safeRender(item);
  }
  return String(item);
};

// Helper to get supporting data from an item
const getSupportData = (item) => {
  if (typeof item === 'object' && item !== null) {
    const support = item.dataSupport || item.expectedOutcome || item.impact || item.details || item.evidence || item.comments;
    return support ? safeRender(support) : null;
  }
  return null;
};

const AITools = () => {
  const { isCorporate } = useAuth();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedTool, setSelectedTool] = useState(null);
  const [formData, setFormData] = useState({ locationId: '', period: 'month', startDate: '', endDate: '' });

  useEffect(() => {
    locationsAPI.getAll().then(res => setLocations(res.data)).catch(() => {});
  }, []);

  const tools = [
    { id: 'performance', name: 'Performance Analyzer', icon: FiTrendingUp, description: 'Analyze location performance metrics', corporate: false, color: '#6366f1' },
    { id: 'benchmarking', name: 'Benchmarking', icon: FiBarChart2, description: 'Compare locations against each other', corporate: true, color: '#8b5cf6' },
    { id: 'compliance', name: 'Compliance Checker', icon: FiCheckCircle, description: 'Audit brand standard compliance', corporate: false, color: '#10b981' },
    { id: 'forecast', name: 'Demand Forecaster', icon: FiCalendar, description: 'Predict future demand', corporate: false, color: '#f59e0b' },
    { id: 'bestpractices', name: 'Best Practice Finder', icon: FiStar, description: 'Identify successful practices', corporate: false, color: '#ec4899' },
    { id: 'anomaly', name: 'Anomaly Detector', icon: FiAlertTriangle, description: 'Flag unusual patterns', corporate: true, color: '#ef4444' },
    { id: 'report', name: 'Report Generator', icon: FiFileText, description: 'Generate comprehensive reports', corporate: true, color: '#06b6d4' }
  ];

  const runAnalysis = async () => {
    if (!selectedTool) return toast.error('Select a tool first');
    setLoading(true);
    setResult(null);
    try {
      let res;
      switch (selectedTool) {
        case 'performance': res = await aiAPI.performanceAnalysis(formData); break;
        case 'benchmarking': res = await aiAPI.benchmarking({ period: formData.period }); break;
        case 'compliance': res = await aiAPI.complianceCheck({ locationId: formData.locationId || null }); break;
        case 'forecast': res = await aiAPI.demandForecast({ locationId: formData.locationId || null, forecastDays: 30 }); break;
        case 'bestpractices': res = await aiAPI.bestPractices({}); break;
        case 'anomaly': res = await aiAPI.anomalyDetection({ lookbackDays: 30 }); break;
        case 'report': res = await aiAPI.generateReport({ locationId: formData.locationId || null, startDate: formData.startDate, endDate: formData.endDate }); break;
        default: throw new Error('Unknown tool');
      }
      setResult(res.data);
      toast.success('Analysis complete');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Analysis failed');
    } finally { setLoading(false); }
  };

  const currentTool = tools.find(t => t.id === selectedTool);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Assistant</h1>
          <p className="page-subtitle">AI-powered insights and analysis</p>
        </div>
      </div>

      <div className="grid-2">
        {/* Tool Selection */}
        <div>
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiCpu style={{ color: 'var(--primary)' }} /> Select Analysis Tool
          </h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {tools.filter(t => !t.corporate || isCorporate()).map(tool => {
              const Icon = tool.icon;
              const isSelected = selectedTool === tool.id;
              return (
                <div
                  key={tool.id}
                  className="card"
                  style={{
                    cursor: 'pointer',
                    border: isSelected ? `2px solid ${tool.color}` : '2px solid transparent',
                    background: isSelected ? `linear-gradient(135deg, ${tool.color}15, ${tool.color}05)` : undefined,
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => setSelectedTool(tool.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: isSelected ? tool.color : 'var(--dark-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}>
                      <Icon size={24} style={{ color: isSelected ? 'white' : 'var(--text-muted)' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: isSelected ? tool.color : undefined }}>{tool.name}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{tool.description}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Analysis Panel */}
        <div>
          {selectedTool && (
            <div className="card" style={{
              background: `linear-gradient(135deg, ${currentTool?.color || 'var(--primary)'} 0%, ${currentTool?.color}dd 100%)`,
              marginBottom: '20px'
            }}>
              <h3 style={{ color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiZap /> {currentTool?.name}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {['performance', 'compliance', 'forecast', 'report'].includes(selectedTool) && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Location (optional)</label>
                    <select className="form-select" value={formData.locationId} onChange={(e) => setFormData({...formData, locationId: e.target.value})}>
                      <option value="">All Locations</option>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                )}
                {selectedTool === 'benchmarking' && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Period</label>
                    <select className="form-select" value={formData.period} onChange={(e) => setFormData({...formData, period: e.target.value})}>
                      <option value="month">This Month</option>
                      <option value="quarter">This Quarter</option>
                      <option value="year">This Year</option>
                    </select>
                  </div>
                )}
                {selectedTool === 'report' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Start Date</label>
                      <DatePicker
                        value={formData.startDate}
                        onChange={(date) => setFormData({...formData, startDate: date})}
                        placeholder="Select start date"
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ color: 'rgba(255,255,255,0.9)' }}>End Date</label>
                      <DatePicker
                        value={formData.endDate}
                        onChange={(date) => setFormData({...formData, endDate: date})}
                        placeholder="Select end date"
                      />
                    </div>
                  </div>
                )}
                <button
                  className="btn"
                  onClick={runAnalysis}
                  disabled={loading}
                  style={{
                    marginTop: '8px',
                    background: 'white',
                    color: currentTool?.color,
                    fontWeight: 600
                  }}
                >
                  {loading ? (
                    <><span className="spinner" style={{ width: '16px', height: '16px', marginRight: '8px' }}></span> Analyzing...</>
                  ) : (
                    <><FiPlay style={{ marginRight: '8px' }} /> Run Analysis</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Results Display */}
          {result && (
            <div className="card" style={{ border: '1px solid var(--border)' }}>
              <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: `linear-gradient(135deg, ${currentTool?.color}20, ${currentTool?.color}10)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FiCpu style={{ color: currentTool?.color }} size={20} />
                </div>
                Analysis Results
              </h3>

              {/* Summary */}
              {result.summary && (
                <div style={{
                  padding: '16px 20px',
                  background: 'linear-gradient(135deg, var(--primary)10, var(--primary)05)',
                  borderRadius: '12px',
                  marginBottom: '20px',
                  borderLeft: '4px solid var(--primary)'
                }}>
                  <p style={{ fontSize: '1.05rem', lineHeight: 1.6, margin: 0 }}>{safeRender(result.summary)}</p>
                </div>
              )}

              {/* Key Insights */}
              {result.insights && result.insights.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiTrendingUp style={{ color: '#6366f1' }} /> Key Insights
                  </h4>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {result.insights.map((insight, i) => (
                      <div key={i} style={{
                        display: 'flex',
                        gap: '12px',
                        padding: '14px 16px',
                        background: 'var(--bg-secondary)',
                        borderRadius: '10px',
                        alignItems: 'flex-start'
                      }}>
                        <div style={{
                          minWidth: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}>
                          {i + 1}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{renderItem(insight)}</div>
                          {getSupportData(insight) && (
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                              <FiInfo size={12} style={{ marginRight: '4px' }} />
                              {getSupportData(insight)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations && result.recommendations.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiTarget style={{ color: '#10b981' }} /> Recommendations
                  </h4>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {result.recommendations.map((rec, i) => (
                      <div key={i} style={{
                        display: 'flex',
                        gap: '12px',
                        padding: '14px 16px',
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05))',
                        borderRadius: '10px',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        alignItems: 'flex-start'
                      }}>
                        <div style={{
                          minWidth: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: '#10b981',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white'
                        }}>
                          <FiCheckCircle size={14} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{renderItem(rec)}</div>
                          {getSupportData(rec) && (
                            <div style={{ fontSize: '0.85rem', color: 'var(--secondary)', marginTop: '4px' }}>
                              Expected: {getSupportData(rec)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Predictions/Forecast */}
              {result.predictions && Array.isArray(result.predictions) && result.predictions.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiCalendar style={{ color: '#f59e0b' }} /> Forecast
                  </h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ marginBottom: 0 }}>
                      <thead>
                        <tr>
                          <th>Period</th>
                          <th>Expected Revenue</th>
                          <th>Confidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.predictions.map((p, i) => {
                          const confidence = typeof p.confidence === 'number' ? p.confidence : 0;
                          const revenue = typeof p.expectedRevenue === 'number' ? p.expectedRevenue : 0;
                          return (
                            <tr key={i}>
                              <td style={{ fontWeight: 500 }}>{safeRender(p.period)}</td>
                              <td style={{ color: 'var(--secondary)', fontWeight: 600 }}>
                                ${revenue.toLocaleString()}
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{
                                    flex: 1,
                                    maxWidth: '100px',
                                    height: '8px',
                                    background: 'var(--bg-secondary)',
                                    borderRadius: '4px',
                                    overflow: 'hidden'
                                  }}>
                                    <div style={{
                                      width: `${confidence * 100}%`,
                                      height: '100%',
                                      background: confidence > 0.8 ? '#10b981' : confidence > 0.6 ? '#f59e0b' : '#ef4444',
                                      borderRadius: '4px'
                                    }}></div>
                                  </div>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                                    {(confidence * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Anomalies */}
              {result.anomalies && Array.isArray(result.anomalies) && result.anomalies.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiAlertTriangle style={{ color: '#ef4444' }} /> Detected Anomalies
                  </h4>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {result.anomalies.map((a, i) => {
                      const severityColors = { HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#10b981' };
                      const severity = a.severity || 'MEDIUM';
                      const severityColor = severityColors[severity] || '#6366f1';
                      return (
                        <div key={i} style={{
                          padding: '16px',
                          background: 'var(--bg-secondary)',
                          borderRadius: '12px',
                          borderLeft: `4px solid ${severityColor}`
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div style={{ fontWeight: 600, fontSize: '1rem' }}>{safeRender(a.type || 'Anomaly')}</div>
                            <span className={`badge badge-${severity === 'HIGH' ? 'danger' : severity === 'MEDIUM' ? 'warning' : 'success'}`}>
                              {severity}
                            </span>
                          </div>
                          {a.location && (
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                              <strong>Location:</strong> {safeRender(a.location)}
                            </div>
                          )}
                          {a.description && (
                            <div style={{ fontSize: '0.9rem', marginBottom: '8px' }}>{safeRender(a.description)}</div>
                          )}
                          {a.recommendation && (
                            <div style={{
                              fontSize: '0.85rem',
                              padding: '8px 12px',
                              background: 'var(--card-bg)',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              <FiShield style={{ color: 'var(--secondary)' }} />
                              <span><strong>Recommendation:</strong> {safeRender(a.recommendation)}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Critical Findings */}
              {result.criticalFindings && result.criticalFindings.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiAlertTriangle style={{ color: '#ef4444' }} /> Critical Findings
                  </h4>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {result.criticalFindings.map((finding, i) => (
                      <div key={i} style={{
                        display: 'flex',
                        gap: '12px',
                        padding: '12px 16px',
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05))',
                        borderRadius: '10px',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        alignItems: 'center'
                      }}>
                        <FiAlertTriangle style={{ color: '#ef4444', flexShrink: 0 }} />
                        <div>{renderItem(finding)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Performers & Underperformers */}
              {(result.topPerformers?.length > 0 || result.underperformers?.length > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  {result.topPerformers?.length > 0 && (
                    <div style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05))', borderRadius: '12px' }}>
                      <h4 style={{ marginBottom: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiStar /> Top Performers
                      </h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {result.topPerformers.map((l, i) => (
                          <span key={l.id || i} className="badge badge-success" style={{ padding: '6px 12px' }}>
                            {l.name || l}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.underperformers?.length > 0 && (
                    <div style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05))', borderRadius: '12px' }}>
                      <h4 style={{ marginBottom: '12px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiAlertTriangle /> Need Attention
                      </h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {result.underperformers.map((l, i) => (
                          <span key={l.id || i} className="badge badge-warning" style={{ padding: '6px 12px' }}>
                            {l.name || l}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Risk Factors */}
              {result.riskFactors && result.riskFactors.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiShield style={{ color: '#f59e0b' }} /> Risk Factors
                  </h4>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {result.riskFactors.map((risk, i) => (
                      <div key={i} style={{
                        display: 'flex',
                        gap: '12px',
                        padding: '14px 16px',
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05))',
                        borderRadius: '10px',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        alignItems: 'flex-start'
                      }}>
                        <div style={{
                          minWidth: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: '#f59e0b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white'
                        }}>
                          <FiAlertTriangle size={14} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{renderItem(risk)}</div>
                          {getSupportData(risk) && (
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                              Impact: {getSupportData(risk)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Identified Practices (for Best Practices) */}
              {result.identifiedPractices && Array.isArray(result.identifiedPractices) && result.identifiedPractices.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiStar style={{ color: '#ec4899' }} /> Identified Best Practices
                  </h4>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {result.identifiedPractices.map((p, i) => (
                      <div key={i} style={{
                        padding: '16px',
                        background: 'var(--bg-secondary)',
                        borderRadius: '12px',
                        borderLeft: '4px solid #ec4899'
                      }}>
                        <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '8px' }}>
                          {safeRender(p.practice || p.name || p.title)}
                        </div>
                        {p.impact && (
                          <div style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
                            <strong style={{ color: 'var(--secondary)' }}>Impact:</strong> {safeRender(p.impact)}
                          </div>
                        )}
                        {p.adoptionRate && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Adoption Rate:</span>
                            <div style={{
                              flex: 1,
                              maxWidth: '150px',
                              height: '8px',
                              background: 'var(--card-bg)',
                              borderRadius: '4px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: safeRender(p.adoptionRate),
                                height: '100%',
                                background: 'linear-gradient(90deg, #ec4899, #8b5cf6)',
                                borderRadius: '4px'
                              }}></div>
                            </div>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{safeRender(p.adoptionRate)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Metrics (for Reports) */}
              {result.keyMetrics && typeof result.keyMetrics === 'object' && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiBarChart2 style={{ color: '#06b6d4' }} /> Key Metrics
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                    {Object.entries(result.keyMetrics).map(([key, value]) => (
                      <div key={key} style={{
                        padding: '16px',
                        background: 'var(--bg-secondary)',
                        borderRadius: '12px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'capitalize' }}>
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                          {typeof value === 'number' ? (
                            key.toLowerCase().includes('rate') || key.toLowerCase().includes('satisfaction')
                              ? `${value.toFixed(1)}%`
                              : `$${value.toLocaleString()}`
                          ) : safeRender(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* System Health */}
              {result.systemHealth && (
                <div style={{
                  padding: '16px 20px',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05))',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <FiCheckCircle style={{ color: '#10b981' }} size={24} />
                  <div>
                    <div style={{ fontWeight: 600 }}>System Health</div>
                    <div style={{ color: 'var(--text-muted)' }}>{safeRender(result.systemHealth)}</div>
                  </div>
                </div>
              )}

              {/* Data Analyzed Summary */}
              {result.dataAnalyzed && (
                <div style={{
                  padding: '16px 20px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '12px',
                  marginTop: '16px'
                }}>
                  <div style={{ fontWeight: 600, marginBottom: '8px' }}>Data Analyzed</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{safeRender(result.dataAnalyzed)}</div>
                </div>
              )}

              {/* Records Analyzed (for anomaly detection) */}
              {(result.financialRecordsAnalyzed || result.performanceRecordsAnalyzed || result.complianceRecordsAnalyzed) && (
                <div style={{
                  padding: '16px 20px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '12px',
                  marginTop: '16px'
                }}>
                  <div style={{ fontWeight: 600, marginBottom: '12px' }}>Records Analyzed</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    {result.financialRecordsAnalyzed !== undefined && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                          {safeRender(result.financialRecordsAnalyzed)}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Financial</div>
                      </div>
                    )}
                    {result.performanceRecordsAnalyzed !== undefined && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--secondary)' }}>
                          {safeRender(result.performanceRecordsAnalyzed)}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Performance</div>
                      </div>
                    )}
                    {result.complianceRecordsAnalyzed !== undefined && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>
                          {safeRender(result.complianceRecordsAnalyzed)}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Compliance</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Factors (for demand forecast) */}
              {result.factors && Array.isArray(result.factors) && result.factors.length > 0 && (
                <div style={{ marginBottom: '24px', marginTop: '16px' }}>
                  <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiInfo style={{ color: '#6366f1' }} /> Contributing Factors
                  </h4>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {result.factors.map((factor, i) => (
                      <div key={i} style={{
                        padding: '12px 16px',
                        background: 'var(--bg-secondary)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}>
                        <div style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: 'var(--primary)'
                        }}></div>
                        {safeRender(factor)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Overall Score (for compliance) */}
              {result.overallScore !== undefined && (
                <div style={{
                  padding: '20px',
                  background: 'linear-gradient(135deg, var(--primary)15, var(--primary)05)',
                  borderRadius: '12px',
                  marginBottom: '24px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Overall Compliance Score</div>
                  <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {typeof result.overallScore === 'number' ? `${result.overallScore.toFixed(1)}%` : safeRender(result.overallScore)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!selectedTool && (
            <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <FiCpu size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
              <h3 style={{ marginBottom: '8px' }}>Select an Analysis Tool</h3>
              <p style={{ color: 'var(--text-muted)' }}>Choose a tool from the left to get AI-powered insights</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AITools;
