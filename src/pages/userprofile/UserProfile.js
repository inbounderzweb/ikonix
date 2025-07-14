import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {useNavigate} from 'react-router-dom'

function UserProfile() {
  const { user, setUser, setToken } = useAuth(); // Access user and setters


  const naviagte = useNavigate()

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem('authUser');
    // localStorage.removeItem('authToken');

    // Clear context
    setUser(null);
    setToken('');
    naviagte('/');

  };

  if (!user) {
    return <div>Loading...</div>; // Show loading if user data is not available
  }

  return (
    <div className="p-4">
      <p><strong>Name:</strong> {user.name || 'Guest'}</p>
      <p><strong>Token:</strong> {user.token}</p>
      <p><strong>User ID:</strong> {user.id}</p>
      {user.email && <p><strong>User Email:</strong> {user.email}</p>}
      {user.mobile && <p><strong>Mobile Number:</strong> {user.mobile}</p>}

      <button 
        onClick={handleLogout} 
        className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Logout
      </button>
    </div>
  );
}

export default UserProfile;
