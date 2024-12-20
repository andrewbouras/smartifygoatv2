import React, { useState } from 'react';

const ProtectedContent = () => {
    const [data, setData] = useState(null);
  
    const fetchProtectedData = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/notebooks', {
          credentials: 'include'
        });
        const data = await response.json();
        setData(data);
      } catch (error) {
        console.error('Failed to fetch protected data:', error);
      }
    };
  
    return (
      <div>
        <button onClick={fetchProtectedData}>Fetch Protected Data</button>
        {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
      </div>
    );
  };

export default ProtectedContent;