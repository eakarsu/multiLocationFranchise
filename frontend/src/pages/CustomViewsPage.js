import React from 'react';
import LocationPerformanceChart from '../components/LocationPerformanceChart';
import RegionHeatmap from '../components/RegionHeatmap';
import FranchiseReportPdf from '../components/FranchiseReportPdf';
import ComplianceRulesEditor from '../components/ComplianceRulesEditor';

export default function CustomViewsPage() {
  return (
    <div data-testid="custom-views-page">
      <div className="page-header">
        <h1 className="page-title">Franchise Views</h1>
        <p style={{ opacity: 0.75 }}>
          Multi-location performance, regional heatmap, branded reports, and brand-compliance rules.
        </p>
      </div>
      <div style={{ display: 'grid', gap: '1.25rem' }}>
        <LocationPerformanceChart />
        <RegionHeatmap />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.25rem' }}>
          <FranchiseReportPdf />
          <ComplianceRulesEditor />
        </div>
      </div>
    </div>
  );
}
