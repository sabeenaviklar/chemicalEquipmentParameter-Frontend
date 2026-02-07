import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { datasetAPI } from '../services/api';

function History() {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      const response = await datasetAPI.getAll();
      setDatasets(response.data);
    } catch (err) {
      console.error('Error loading datasets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDatasetClick = (id) => {
    navigate(`/dataset/${id}`);
  };

  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }

  return (
    <div className="main-content">
      <h1 className="page-title">Upload History</h1>

      <div className="card">
        <h2 className="card-title">📜 Last 5 Uploads</h2>
        {datasets.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
            No uploads yet. Upload your first CSV file!
          </p>
        ) : (
          <ul className="history-list">
            {datasets.map((dataset) => (
              <li
                key={dataset.id}
                className="history-item"
                onClick={() => handleDatasetClick(dataset.id)}
              >
                <div className="history-filename">📄 {dataset.filename}</div>
                <div className="history-meta">
                  Uploaded: {new Date(dataset.uploaded_at).toLocaleString()} | 
                  Records: {dataset.record_count}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default History;