import React from 'react';
import LoginButton from './LoginButton';
import { useAuth } from '../context/AuthContext';

const AuthStatus = () => {
    const { isAuthenticated, user, loading } = useAuth();

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            {isAuthenticated ? (
                <>
                    <p>Welcome, {user?.name}</p>
                    <img src={user?.image} alt="Profile" style={{ width: '50px', borderRadius: '50%' }} />
                </>
            ) : (
                <LoginButton />
            )}
        </div>
    );
};

export default AuthStatus;