import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './VersionHistory.css'; // Importing CSS file

const VersionHistory = ({ documentId }) => {
  const [versions, setVersions] = useState([]);

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const { data } = await axios.get(`http://localhost:5000/documents/${documentId}/versions`);
        setVersions(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchVersions();
  }, [documentId]);

  const restoreVersion = async (index) => {
    try {
      await axios.post(`http://localhost:5000/documents/${documentId}/restore`, { versionIndex: index });
      alert('Document restored to the selected version');
      window.location.reload(); // Reload the page
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="version-history">
      <h3 className="version-title">Version History</h3>
      <ol className="version-list">
        {versions.map((version, index) => (
          <li key={index} className="version-item">
            <span className="version-timestamp">
              {new Date(version.timestamp).toLocaleString()}
            </span>
            <span className="version-user">by User: {version.userId}</span>
            <button className="restore-btn" onClick={() => restoreVersion(index)}>
              Restore
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default VersionHistory;
