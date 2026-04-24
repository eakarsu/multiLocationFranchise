import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { FiMail, FiKey, FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [step, setStep] = useState('email'); // email | token | success
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authAPI.forgotPassword({ email });
      if (res.data.resetToken) {
        setResetToken(res.data.resetToken);
      }
      toast.success('Reset token generated');
      setStep('token');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await authAPI.resetPassword({ token: token || resetToken, newPassword });
      toast.success('Password reset successfully!');
      setStep('success');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <FiKey size={40} color="var(--primary)" />
          <h1>Reset Password</h1>
        </div>

        {step === 'email' && (
          <form onSubmit={handleRequestReset} className="login-form">
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px', textAlign: 'center' }}>
              Enter your email address to receive a password reset token.
            </p>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
              />
            </div>
            <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
              <FiMail /> {loading ? 'Sending...' : 'Send Reset Token'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <Link to="/login" style={{ fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <FiArrowLeft /> Back to Login
              </Link>
            </div>
          </form>
        )}

        {step === 'token' && (
          <form onSubmit={handleResetPassword} className="login-form">
            {resetToken && (
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--secondary)', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '0.85rem' }}>
                <strong>Demo Mode:</strong> Your reset token is:<br />
                <code style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>{resetToken}</code>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Reset Token</label>
              <input
                type="text"
                className="form-input"
                value={token || resetToken}
                onChange={(e) => setToken(e.target.value)}
                required
                placeholder="Paste your reset token"
              />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                placeholder="At least 6 characters"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm new password"
              />
            </div>
            <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        {step === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--secondary)', fontSize: '1.5rem' }}>
              &#10003;
            </div>
            <h3 style={{ marginBottom: '8px' }}>Password Reset!</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Your password has been reset successfully.</p>
            <Link to="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Go to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
