// client/src/components/UserManagementTable.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, Trash2, Copy, AlertCircle, Loader2 } from 'lucide-react';

const UserManagementTable = ({ token, API_URL }) => {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Registration form state
    const [newUsername, setNewUsername] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [regMessage, setRegMessage] = useState('');

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/users/list`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            } else if (res.status === 403) {
                setError("Access Forbidden. You must be logged in as Master Admin.");
            } else {
                setError(`Failed to fetch users: ${res.statusText}`);
            }
        } catch (err) {
            setError("Network error while fetching user list.");
        } finally {
            setIsLoading(false);
        }
    }, [token, API_URL]);

    useEffect(() => {
        if (token) {
            fetchUsers();
        }
    }, [token, fetchUsers]);

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setRegMessage('');
        setError(null);

        try {
            const res = await fetch(`${API_URL}/users/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ username: newUsername, email: newEmail })
            });

            if (res.ok) {
                const newUser = await res.json();
                const successMsg = `Success! User ID: ${newUser.secretId}. Give this ID to the user to log in.`;
                setRegMessage(successMsg);
                alert(successMsg); 

                // Clear form and refresh list
                setNewUsername('');
                setNewEmail('');
                fetchUsers(); 
            } else {
                const errorData = await res.json();
                setRegMessage(`Registration failed: ${errorData.error || res.statusText}`);
            }
        } catch (err) {
            setRegMessage("Network error during registration.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (secretId) => {
        if (!window.confirm(`Are you sure you want to delete user with ID: ${secretId}? This is irreversible.`)) {
            return;
        }

        try {
            const res = await fetch(`${API_URL}/users/${secretId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                alert(`User ${secretId} deleted successfully.`);
                fetchUsers(); // Refresh the list
            } else {
                const errorData = await res.json();
                alert(`Deletion failed: ${errorData.error || res.statusText}`);
            }
        } catch (err) {
            alert("Network error during deletion.");
        }
    };

    const copySecretId = (secretId) => {
        navigator.clipboard.writeText(secretId);
        alert(`Secret ID ${secretId} copied to clipboard!`);
    };

    if (error) {
        return (
            <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" /> {error}
            </div>
        );
    }

    // --- UI Fix for Hover Contrast ---
    const tableRowClasses = "bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors duration-200";

    return (
        <div className="space-y-8">
            {/* 1. Registration Form */}
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                <h3 className="text-xl font-bold mb-4 flex items-center text-blue-600 dark:text-blue-400">
                    <UserPlus className="w-5 h-5 mr-2" /> Register New User
                </h3>
                <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <input
                        type="text"
                        placeholder="Username"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        required
                        className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-blue-500"
                    />
                    <input
                        type="email"
                        placeholder="Email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        required
                        className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-blue-500"
                    />
                    <button
                        type="submit"
                        className="w-full py-2 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition duration-300"
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <UserPlus className="w-5 h-5 mr-2" />}
                        Register
                    </button>
                    <div className="col-span-1 md:col-span-4 text-sm mt-2">
                        {regMessage && (
                            <p className={regMessage.startsWith('Success') ? 'text-green-600 dark:text-green-400 font-medium' : 'text-red-600 dark:text-red-400'}>
                                {regMessage}
                            </p>
                        )}
                    </div>
                </form>
            </div>

            {/* 2. User List Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-x-auto">
                <h3 className="text-xl font-bold p-6 border-b dark:border-gray-700">Registered Users ({users.length})</h3>
                {isLoading ? (
                    <div className="p-8 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Username</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Secret ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Registered</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {users.map(user => (
                                <tr key={user.secretId} className={tableRowClasses}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{user.username}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{user.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600 dark:text-blue-400 flex items-center">
                                        {user.secretId}
                                        <button 
                                            onClick={() => copySecretId(user.secretId)}
                                            className="ml-2 text-gray-400 hover:text-blue-500"
                                            title="Copy Secret ID"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.registeredAt.split(',')[0]}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button 
                                            onClick={() => handleDelete(user.secretId)}
                                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                            title="Delete User and Profile"
                                        >
                                            <Trash2 className="w-5 h-5 inline" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default UserManagementTable;
