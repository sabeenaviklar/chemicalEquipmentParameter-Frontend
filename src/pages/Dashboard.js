import React, { useState } from 'react';
import { datasetAPI } from '../services/api';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

function Dashboard() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [error, setError] = useState('');
  const [currentDataset, setCurrentDataset] = useState(null);
  const [summary, setSummary] = useState(null);
  const [equipmentData, setEquipmentData] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');
    setUploadSuccess('');

    try {
      const response = await datasetAPI.upload(file);
      setUploadSuccess(`File uploaded successfully! ${response.data.record_count} records added.`);
      setFile(null);
      loadDataset(response.data.dataset_id);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const loadDataset = async (id) => {
    try {
      const [detailResponse, summaryResponse] = await Promise.all([
        datasetAPI.getDetail(id),
        datasetAPI.getSummary(id)
      ]);

      setCurrentDataset(detailResponse.data);
      setEquipmentData(detailResponse.data.equipment);
      setSummary(summaryResponse.data);
    } catch (err) {
      console.error('Error loading dataset:', err);
    }
  };

  const handleDownloadReport = async () => {
    if (!currentDataset) return;

    try {
      const response = await datasetAPI.downloadReport(currentDataset.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `equipment_report_${currentDataset.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading report:', err);
      setError('Failed to download report');
    }
  };

  const typeDistributionData = summary ? {
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
      borderColor: [
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)',
      ],
      borderWidth: 2,
    }]
  } : null;

  const averagesData = summary ? {
    labels: ['Flowrate', 'Pressure', 'Temperature'],
    datasets: [{
      label: 'Average Values',
      data: [
        summary.averages.flowrate,
        summary.averages.pressure,
        summary.averages.temperature
      ],
      backgroundColor: 'rgba(102, 126, 234, 0.8)',
      borderColor: 'rgba(102, 126, 234, 1)',
      borderWidth: 2,
    }]
  } : null;

  return (
    <div className="main-content">
      <h1 className="page-title">Chemical Equipment Visualizer</h1>

      <div className="card">
        <h2 className="card-title">📤 Upload CSV File</h2>
        {error && <div className="error-message">{error}</div>}
        {uploadSuccess && <div className="success-message">{uploadSuccess}</div>}
        
        <div
          className={`upload-area ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById('fileInput').click()}
        >
          <div className="upload-icon">📁</div>
          <p>{file ? file.name : 'Drag & drop your CSV file here, or click to select'}</p>
          <input
            type="file"
            id="fileInput"
            className="file-input"
            accept=".csv"
            onChange={handleFileChange}
          />
        </div>

        <button
          className="btn-secondary"
          onClick={handleUpload}
          disabled={uploading || !file}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>

      {summary && (
        <>
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
              {typeDistributionData && <Pie data={typeDistributionData} />}
            </div>
            <div className="chart-card">
              <h3>Average Parameters</h3>
              {averagesData && <Bar data={averagesData} options={{ responsive: true }} />}
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
                  {equipmentData.map((item) => (
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
        </>
      )}
    </div>
  );
}

export default Dashboard;