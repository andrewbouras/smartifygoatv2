import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

const ProtectedContent = () => {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const { isAuthenticated, loading } = useAuth();

    const fetchProtectedData = async () => {
        try {
            setError(null);
            const result = await api.get('/api/notebooks');
            setData(result);
        } catch (error) {
            console.error('Failed to fetch protected data:', error);
            setError(error.message);
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }
  
    if (!isAuthenticated) {
        return (
            <div>
                <p>Please log in to access this content.</p>
                <a href="http://localhost:3001/api/auth/google">Login with Google</a>
            </div>
        );
    }

    return (
        <div>
            <button onClick={fetchProtectedData}>Fetch Protected Data</button>
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
            {data && (
                <div>
                    <h3>Your Notebooks:</h3>
                    {data.length === 0 ? (
                        <p>No notebooks found. Create one to get started!</p>
                    ) : (
                        <ul>
                            {data.map(notebook => (
                                <li key={notebook._id}>
                                    {notebook.title} (Created: {new Date(notebook.createdAt).toLocaleDateString()})
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProtectedContent;