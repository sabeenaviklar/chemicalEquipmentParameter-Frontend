
import React, { useState, useEffect } from 'react';
import { datasetAPI } from '../services/api';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, LineElement, PointElement } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, LineElement, PointElement);

function Dashboard() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [error, setError] = useState('');
  const [currentDataset, setCurrentDataset] = useState(null);
  const [summary, setSummary] = useState(null);
  const [equipmentData, setEquipmentData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedRows, setSelectedRows] = useState([]);
  const [compareMode, setCompareMode] = useState(false);

  // Filter data based on search term
  useEffect(() => {
    if (searchTerm) {
      const filtered = equipmentData.filter(item =>
        item.equipment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredData(filtered);
    } else {
      setFilteredData(equipmentData);
    }
  }, [searchTerm, equipmentData]);

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
      previewFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      previewFile(e.target.files[0]);
    }
  };

  // NEW FEATURE: File Preview
  const previewFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      console.log('File preview loaded');
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');
    setUploadSuccess('');
    setUploadProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const response = await datasetAPI.upload(file);
      setUploadProgress(100);
      clearInterval(progressInterval);
      setUploadSuccess(`✓ File uploaded successfully! ${response.data.record_count} records added.`);
      setFile(null);
      loadDataset(response.data.dataset_id);
    } catch (err) {
      clearInterval(progressInterval);
      setUploadProgress(0);
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
      setFilteredData(detailResponse.data.equipment);
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

  // NEW FEATURE: Export to Excel
  const exportToExcel = () => {
    if (!equipmentData.length) return;

    const headers = ['Equipment Name', 'Type', 'Flowrate', 'Pressure', 'Temperature'];
    const csv = [
      headers.join(','),
      ...filteredData.map(item => 
        `${item.equipment_name},${item.type},${item.flowrate},${item.pressure},${item.temperature}`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `equipment_data_${Date.now()}.csv`;
    link.click();
  };

  // NEW FEATURE: Sort Table
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    const sorted = [...filteredData].sort((a, b) => {
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setFilteredData(sorted);
  };

  // NEW FEATURE: Select Rows for Comparison
  const toggleRowSelection = (id) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  // NEW FEATURE: Compare Selected Equipment
  const compareSelected = () => {
    if (selectedRows.length < 2) {
      alert('Please select at least 2 items to compare');
      return;
    }
    setCompareMode(true);
  };

  // NEW FEATURE: Get Status Badge
  const getStatusBadge = (value, type) => {
    if (type === 'flowrate') {
      if (value > 200) return <span className="badge badge-success">High</span>;
      if (value > 150) return <span className="badge badge-warning">Medium</span>;
      return <span className="badge badge-danger">Low</span>;
    }
    return null;
  };

  // NEW FEATURE: Calculate Trend
  const calculateTrend = () => {
    if (!summary || !equipmentData.length) return null;
    
    const avgFlowrate = summary.averages.flowrate;
    const maxFlowrate = Math.max(...equipmentData.map(e => e.flowrate));
    const minFlowrate = Math.min(...equipmentData.map(e => e.flowrate));
    
    return {
      max: maxFlowrate,
      min: minFlowrate,
      range: maxFlowrate - minFlowrate,
      variance: ((maxFlowrate - avgFlowrate) / avgFlowrate * 100).toFixed(2)
    };
  };

  const typeDistributionData = summary ? {
    labels: Object.keys(summary.type_distribution),
    datasets: [{
      label: 'Equipment Count',
      data: Object.values(summary.type_distribution),
      backgroundColor: [
        'rgba(99, 102, 241, 0.8)',
        'rgba(139, 92, 246, 0.8)',
        'rgba(236, 72, 153, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(16, 185, 129, 0.8)',
      ],
      borderColor: [
        'rgba(99, 102, 241, 1)',
        'rgba(139, 92, 246, 1)',
        'rgba(236, 72, 153, 1)',
        'rgba(59, 130, 246, 1)',
        'rgba(16, 185, 129, 1)',
      ],
      borderWidth: 3,
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
      backgroundColor: 'rgba(99, 102, 241, 0.8)',
      borderColor: 'rgba(99, 102, 241, 1)',
      borderWidth: 3,
    }]
  } : null;

  // NEW FEATURE: Trend Line Chart
  const trendData = equipmentData.length ? {
    labels: equipmentData.map((_, idx) => `Item ${idx + 1}`),
    datasets: [{
      label: 'Flowrate Trend',
      data: equipmentData.map(e => e.flowrate),
      borderColor: 'rgba(99, 102, 241, 1)',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      tension: 0.4,
      fill: true,
    }]
  } : null;

  const trend = calculateTrend();

  return (
    <div className="main-content">
      <h1 className="page-title">⚗️ Chemical Equipment Visualizer</h1>

      {/* Upload Section */}
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
          <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>
            {file ? `✓ ${file.name}` : 'Drag & drop your CSV file here, or click to select'}
          </p>
          <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '0.5rem' }}>
            Supported format: CSV with Equipment Name, Type, Flowrate, Pressure, Temperature
          </p>
          <input
            type="file"
            id="fileInput"
            className="file-input"
            accept=".csv"
            onChange={handleFileChange}
          />
        </div>

        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
          </div>
        )}

        <button
          className="btn-secondary"
          onClick={handleUpload}
          disabled={uploading || !file}
        >
          {uploading ? `⏳ Uploading... ${uploadProgress}%` : '📤 Upload'}
        </button>
      </div>

      {/* Summary Statistics */}
      {summary && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-label">Total Equipment</div>
              <div className="stat-value">{summary.total_count}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💧</div>
              <div className="stat-label">Avg Flowrate</div>
              <div className="stat-value">{summary.averages.flowrate.toFixed(2)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⚡</div>
              <div className="stat-label">Avg Pressure</div>
              <div className="stat-value">{summary.averages.pressure.toFixed(2)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🌡️</div>
              <div className="stat-label">Avg Temperature</div>
              <div className="stat-value">{summary.averages.temperature.toFixed(2)}</div>
            </div>
          </div>

          {/* NEW: Trend Analysis */}
          {trend && (
            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))' }}>
              <h2 className="card-title">📈 Trend Analysis</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <strong>Max Flowrate:</strong> {trend.max.toFixed(2)}
                </div>
                <div>
                  <strong>Min Flowrate:</strong> {trend.min.toFixed(2)}
                </div>
                <div>
                  <strong>Range:</strong> {trend.range.toFixed(2)}
                </div>
                <div>
                  <strong>Variance:</strong> {trend.variance}%
                </div>
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="charts-container">
            <div className="chart-card">
              <h3>🥧 Equipment Type Distribution</h3>
              {typeDistributionData && <Pie data={typeDistributionData} options={{ responsive: true, maintainAspectRatio: true }} />}
            </div>
            <div className="chart-card">
              <h3>📊 Average Parameters</h3>
              {averagesData && <Bar data={averagesData} options={{ responsive: true, maintainAspectRatio: true }} />}
            </div>
          </div>

          {/* NEW: Trend Line Chart */}
          {trendData && (
            <div className="card">
              <h2 className="card-title">📈 Flowrate Trend Analysis</h2>
              <Line data={trendData} options={{ responsive: true, maintainAspectRatio: true }} />
            </div>
          )}

          {/* Data Table */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 className="card-title" style={{ marginBottom: 0 }}>📊 Equipment Data</h2>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {selectedRows.length > 0 && (
                  <button 
                    className="btn-secondary" 
                    onClick={compareSelected}
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    🔍 Compare ({selectedRows.length})
                  </button>
                )}
              </div>
            </div>

            {/* Search Box */}
            <input
              type="text"
              className="search-box"
              placeholder="🔍 Search equipment by name or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>
                      <input 
                        type="checkbox" 
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRows(filteredData.map(item => item.id));
                          } else {
                            setSelectedRows([]);
                          }
                        }}
                      />
                    </th>
                    <th onClick={() => handleSort('equipment_name')} style={{ cursor: 'pointer' }}>
                      Equipment Name {sortConfig.key === 'equipment_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('type')} style={{ cursor: 'pointer' }}>
                      Type {sortConfig.key === 'type' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('flowrate')} style={{ cursor: 'pointer' }}>
                      Flowrate {sortConfig.key === 'flowrate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('pressure')} style={{ cursor: 'pointer' }}>
                      Pressure {sortConfig.key === 'pressure' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('temperature')} style={{ cursor: 'pointer' }}>
                      Temperature {sortConfig.key === 'temperature' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item) => (
                    <tr 
                      key={item.id}
                      style={{ 
                        background: selectedRows.includes(item.id) ? 'rgba(99, 102, 241, 0.1)' : 'transparent' 
                      }}
                    >
                      <td>
                        <input 
                          type="checkbox" 
                          checked={selectedRows.includes(item.id)}
                          onChange={() => toggleRowSelection(item.id)}
                        />
                      </td>
                      <td style={{ fontWeight: '600' }}>{item.equipment_name}</td>
                      <td>{item.type}</td>
                      <td>{item.flowrate.toFixed(2)}</td>
                      <td>{item.pressure.toFixed(2)}</td>
                      <td>{item.temperature.toFixed(2)}</td>
                      <td>{getStatusBadge(item.flowrate, 'flowrate')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '1rem', color: '#64748b', fontSize: '0.9rem' }}>
              Showing {filteredData.length} of {equipmentData.length} records
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <button className="btn-download" onClick={handleDownloadReport}>
                📥 Download PDF Report
              </button>
              <button className="btn-export" onClick={exportToExcel}>
                📊 Export to Excel
              </button>
            </div>
          </div>

          {/* NEW: Compare Mode */}
          {compareMode && selectedRows.length >= 2 && (
            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="card-title">🔍 Equipment Comparison</h2>
                <button 
                  onClick={() => setCompareMode(false)}
                  style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(250px, 1fr))`, gap: '1rem' }}>
                {selectedRows.map(id => {
                  const item = equipmentData.find(e => e.id === id);
                  return (
                    <div key={id} style={{ padding: '1rem', background: 'white', borderRadius: '12px' }}>
                      <h3 style={{ marginBottom: '1rem', color: '#6366f1' }}>{item.equipment_name}</h3>
                      <p><strong>Type:</strong> {item.type}</p>
                      <p><strong>Flowrate:</strong> {item.flowrate.toFixed(2)}</p>
                      <p><strong>Pressure:</strong> {item.pressure.toFixed(2)}</p>
                      <p><strong>Temperature:</strong> {item.temperature.toFixed(2)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Dashboard;