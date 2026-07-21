import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';
import { FiMail, FiKey, FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [step, setStep] = useState(token ? 'reset' : 'email');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      setStep('sent');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    if (!token) return toast.error('This password reset link is invalid');
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
    if (newPassword.length < 12) return toast.error('Password must be at least 12 characters');
    setLoading(true);
    try {
      await authAPI.resetPassword({ token, newPassword });
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
              Enter your email address and we will send a time-limited reset link.
            </p>
            <div className="form-group">
              <label className="form-label" htmlFor="reset-email">Email</label>
              <input id="reset-email" type="email" className="form-input" value={email}
                onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
            </div>
            <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
              <FiMail /> {loading ? 'Sending...' : 'Send reset link'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <Link to="/login"><FiArrowLeft /> Back to Login</Link>
            </div>
          </form>
        )}

        {step === 'sent' && (
          <div style={{ textAlign: 'center' }}>
            <p>If an active account matches that address, a reset link is on its way.</p>
            <Link to="/login" className="btn btn-primary" style={{ marginTop: '24px' }}>Back to Login</Link>
          </div>
        )}

        {step === 'reset' && (
          <form onSubmit={handleResetPassword} className="login-form">
            <div className="form-group">
              <label className="form-label" htmlFor="new-password">New Password</label>
              <input id="new-password" type="password" className="form-input" value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)} required minLength={12}
                maxLength={128} autoComplete="new-password" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="confirm-password">Confirm Password</label>
              <input id="confirm-password" type="password" className="form-input" value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)} required minLength={12}
                maxLength={128} autoComplete="new-password" />
            </div>
            <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        {step === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <h3>Password reset</h3>
            <p style={{ color: 'var(--text-muted)', margin: '8px 0 24px' }}>You can now sign in with your new password.</p>
            <Link to="/login" className="btn btn-primary">Go to Login</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
