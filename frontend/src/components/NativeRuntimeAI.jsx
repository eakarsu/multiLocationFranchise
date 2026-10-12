import React, { useEffect, useState } from 'react';
import NativeAIControls from './NativeAIControls';
import NativeAIReport from './NativeAIReport';
import useNativeAIRequest from './useNativeAIRequest';
import { responseRows } from '../services/api';
import './NativeRuntimeAI.css';

export default function NativeRuntimeAI({ config, request }) {
  const [fields, setFields] = useState({});
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState('');
  const [error, setError] = useState('');
  const native = useNativeAIRequest();
  const historyEndpoint = `${config.endpoint}/history`;

  useEffect(() => {
    let active = true;
    request(historyEndpoint).then((reports) => {
      if (active) setHistory(responseRows(reports));
    }).catch(() => {
      if (active) setHistoryError('Saved reports could not be loaded.');
    });
    return () => { active = false; };
  }, [historyEndpoint, request]);

  const presets = [0, 1, 2].map((index) => ({
    name: ['Quick brief', 'Team planning', 'Detailed review'][index],
    fill: () => {
      setFields(Object.fromEntries(config.fields.map((field) => [field.key, field.examples[index]])));
      return { filled: config.fields.length, manual: [] };
    },
  }));

  async function generate(event) {
    event.preventDefault();
    setError('');
    setResult(null);
    try {
      const body = Object.fromEntries(config.fields.map((field) => [field.key, fields[field.key] ?? '']));
      const response = await native.run((signal) => request(config.endpoint, body, { signal }));
      setResult(response);
      request(historyEndpoint).then((reports) => setHistory(responseRows(reports))).catch(() => setHistoryError('Saved reports could not be refreshed.'));
    } catch (failure) {
      setError(failure.name === 'AbortError' ? 'Request canceled.' : failure.response?.data?.error || failure.message);
    }
  }

  async function openSaved(id) {
    setHistoryError('');
    try {
      const report = await request(`${historyEndpoint}/${encodeURIComponent(id)}`);
      setResult(report.output);
    } catch (failure) {
      setHistoryError(failure.response?.data?.error || 'Saved report could not be opened.');
    }
  }

  return <section className="native-runtime-ai" id="ai-readiness">
    <header><p className="ai-eyebrow">Native AI workspace</p><h1>{config.title}</h1><p>{config.description}</p></header>
    <NativeAIControls busy={native.busy} onCancel={native.cancel} presets={presets} context={config.title}>
      <form onSubmit={generate}>
        <div className="native-runtime-fields">{config.fields.map((field) => <label key={field.key} htmlFor={`native-runtime-${field.key}`}>
          {field.label}{field.required ? ' *' : ' (optional)'}
          <textarea id={`native-runtime-${field.key}`} data-ai-field={field.key} rows={5} required={field.required} maxLength={field.maxLength || 4000} value={fields[field.key] ?? ''} onChange={(event) => setFields((current) => ({ ...current, [field.key]: event.target.value }))} />
        </label>)}</div>
        <button type="submit" className="native-runtime-generate" disabled={native.busy}>{native.busy ? 'Generating…' : 'Generate with OpenRouter'}</button>
        {error && <p role="alert">{error}</p>}
      </form>
    </NativeAIControls>
    {result !== null && <NativeAIReport response={result} title={config.title} />}
    <section className="ai-history" aria-label="Saved AI reports">
      <h2>Saved reports</h2>
      {historyError && <p role="alert">{historyError}</p>}
      {!history.length && !historyError && <p>No saved reports yet.</p>}
      {history.map((report) => <button className="ai-history-row" type="button" key={report.id} onClick={() => openSaved(report.id)}>
        <span>{config.title}</span><time dateTime={report.createdAt}>{new Date(report.createdAt).toLocaleString()}</time>
      </button>)}
    </section>
  </section>;
}
