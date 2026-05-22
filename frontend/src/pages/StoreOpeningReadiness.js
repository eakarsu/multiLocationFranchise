import React, { useState } from 'react';
import api from '../services/api';

const sample = JSON.stringify({
  location: 'Phoenix North',
  permits: 80,
  staffing: 65,
  training: 70,
  inventory: 75,
  localMarketing: 55
}, null, 2);

export default function StoreOpeningReadiness() {
  const [payload, setPayload] = useState(sample);
  const [result, setResult] = useState(null);

  async function run() {
    const { data } = await api.post('/store-opening-readiness/score', JSON.parse(payload));
    setResult(data);
  }

  return (
    <div className="page">
      <h1>Store Opening Readiness</h1>
      <p>Score new-unit launch readiness across permits, staffing, training, inventory, and local marketing.</p>
      <textarea value={payload} onChange={(event) => setPayload(event.target.value)} rows={12} style={{ width: '100%', fontFamily: 'monospace' }} />
      <button className="btn btn-primary" onClick={run}>Score opening</button>
      {result && (
        <div className="card">
          <h2>{result.location}: {result.score}/100 ({result.status})</h2>
          <p>Blockers: {result.blockers.join(', ') || 'none'}</p>
          <ul>{result.launchPlan.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
