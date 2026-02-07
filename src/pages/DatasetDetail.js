import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { datasetAPI } from '../services/api';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

function DatasetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dataset, setDataset] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDataset();
  }, [id]);

  const loadDataset = async () => {
    try {
      const [detailResponse, summaryResponse] = await Promise.all([
        datasetAPI.getDetail(id),
        datasetAPI.getSummary(id)
      ]);

      setDataset(detailResponse.data);
      setSummary(summaryResponse.data);
    } catch (err) {
      setError('Failed to load dataset');
      console.error('Error loading dataset:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    try {
      const response = await datasetAPI.downloadReport(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `equipment_report_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading report:', err);
    }
  };

  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }

  if (error) {
    return (
      <div className="main-content">
        <div className="error-message">{error}</div>
        <button className="btn-secondary" onClick={() => navigate('/history')}>
          Back to History
        </button>
      </div>
    );
  }

  const typeDistributionData = {
    labels: Object.keys(summary.type_distribution),
    datasets: [{
      label: 'Equipment Count',
      data: Object.values(summary.type_distribution),
      backgroundColor: [
        'rgba(255, 99, 132, 0.8)',
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 206, 86, 0.8)',
        'rgba(75, 192, 192, 0.8)',
        'rgba(153, 102, 255, 0.8)',
      ],
    }]
  };

  const averagesData = {
    labels: ['Flowrate', 'Pressure', 'Temperature'],
    datasets: [{
      label: 'Average Values',
      data: [
        summary.averages.flowrate,
        summary.averages.pressure,
        summary.averages.temperature
      ],
      backgroundColor: 'rgba(102, 126, 234, 0.8)',
    }]
  };

  return (
    <div className="main-content">
      <button className="btn-secondary" onClick={() => navigate('/history')} style={{ marginBottom: '1rem' }}>
        ← Back to History
      </button>

      <h1 className="page-title">{dataset.filename}</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Equipment</div>
          <div className="stat-value">{summary.total_count}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Flowrate</div>
          <div className="stat-value">{summary.averages.flowrate.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Pressure</div>
          <div className="stat-value">{summary.averages.pressure.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Temperature</div>
          <div className="stat-value">{summary.averages.temperature.toFixed(2)}</div>
        </div>
      </div>

      <div className="charts-container">
        <div className="chart-card">
          <h3>Equipment Type Distribution</h3>
          <Pie data={typeDistributionData} />
        </div>
        <div className="chart-card">
          <h3>Average Parameters</h3>
          <Bar data={averagesData} options={{ responsive: true }} />
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">📊 Equipment Data</h2>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Equipment Name</th>
                <th>Type</th>
                <th>Flowrate</th>
                <th>Pressure</th>
                <th>Temperature</th>
              </tr>
            </thead>
            <tbody>
              {dataset.equipment.map((item) => (
                <tr key={item.id}>
                  <td>{item.equipment_name}</td>
                  <td>{item.type}</td>
                  <td>{item.flowrate.toFixed(2)}</td>
                  <td>{item.pressure.toFixed(2)}</td>
                  <td>{item.temperature.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn-download" onClick={handleDownloadReport}>
          📥 Download PDF Report
        </button>
      </div>
    </div>
  );
}

export default DatasetDetail;