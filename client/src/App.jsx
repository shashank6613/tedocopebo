import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LogIn, User, Settings, Globe, Users, Home, Link, Copy, Trash2, Moon, Sun, Plus, Save, Image, BookOpen, MapPin, Camera } from 'lucide-react';
import UserManagementTable from './components/UserManagementTable';
import PublicProfileView from './components/PublicProfileView';

// --- CONFIGURATION ---
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SECRET_KEY = import.meta.env.VITE_JWT_SECRET; // Not used on frontend, but good practice.

// --- UTILS ---
const getItem = (key) => localStorage.getItem(key);
const setItem = (key, value) => localStorage.setItem(key, value);

// --- APP COMPONENT ---
function App() {
  const [isDarkMode, setIsDarkMode] = useState(getItem('darkMode') === 'true');
  const [token, setToken] = useState(getItem('token'));
  const [role, setRole] = useState(getItem('role'));
  const [username, setUsername] = useState(getItem('username'));
  const [userId, setUserId] = useState(getItem('userId')); // Secret ID for 'user' role
  const [view, setView] = useState('landing');
  
  // Profile Management State
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('about');
  
  // Login/Registration State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState(''); // Master Admin only
  const [loginSecretId, setLoginSecretId] = useState(''); // Regular User only
  const [loginType, setLoginType] = useState('user'); // 'user' or 'master'

  // Public Link State
  const [publicLink, setPublicLink] = useState('');
  const [shareMessage, setShareMessage] = useState('');

  // Apply dark mode on initial load
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    setItem('darkMode', isDarkMode);
  }, [isDarkMode]);

  // Handle URL routing for public share link
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/share/')) {
      setView('share');
    } else if (token) {
      setView('home');
    } else {
      setView('landing');
    }
  }, [token]);

  // Load profile data on login
  useEffect(() => {
    if (token && userId) {
      fetchProfile(userId);
    }
  }, [token, userId]);

  // --- API CALLS ---

  const fetchProfile = useCallback(async (uid) => {
    if (!uid) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/profile/${uid}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if(res.ok) {
        const data = await res.json();
        setProfileData(data);
        if (data.publicLinkKey) {
            setItem('publicLinkKey', data.publicLinkKey);
        }
      } else {
        console.error("Failed to fetch profile:", res.statusText);
        setProfileData(null); // Clear profile on error
      }
    } catch(e) { 
      console.error("Error fetching profile:", e); 
      setProfileData(null);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const updateProfile = async (dataToSave) => {
    if (!userId || !token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/profile/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dataToSave)
      });
      if(res.ok) {
        const updatedData = await res.json();
        setProfileData(updatedData);
        alert('Profile updated successfully!');
      } else {
        alert('Failed to update profile.');
      }
    } catch(e) {
      alert('Error updating profile.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- AUTH FUNCTIONS ---

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: loginEmail, 
          password: loginPassword, // Used for 'master' only
          secretId: loginSecretId, // Used for 'user' only
          type: loginType 
        })
      });

      if (res.ok) {
        const data = await res.json();
        const userSecretId = data.role === 'user' ? data.id : 'MASTER';

        setToken(data.token);
        setRole(data.role);
        setUsername(data.username);
        setUserId(userSecretId);
        setView('home');

        setItem('token', data.token);
        setItem('role', data.role);
        setItem('username', data.username);
        setItem('userId', userSecretId);
        
        // Immediately fetch profile for the new user
        fetchProfile(userSecretId); 

      } else {
        const error = await res.json();
        alert(`Login Failed: ${error.message}`);
      }
    } catch(e) {
      alert('Network Error during login.');
    }
  };

  const handleLogout = () => {
    setToken(null);
    setRole(null);
    setUsername(null);
    setUserId(null);
    setProfileData(null);
    setPublicLink('');
    setView('landing');
    localStorage.clear();
  };

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  // --- PROFILE SECTION HANDLERS ---
  
  const handleProfileDataChange = (section, value, field) => {
    // Helper function for nested changes
    if (section === 'about') {
        setProfileData(prev => ({ 
            ...prev, 
            about: { ...prev.about, [field]: value } 
        }));
    } else {
        // Handle array sections (Education, Projects, etc.)
        setProfileData(prev => ({ 
            ...prev, 
            [section]: value 
        }));
    }
  };

  const addItem = (section) => {
    const nextId = (profileData[section].length > 0 ? Math.max(...profileData[section].map(i => i.id)) : 0) + 1;
    let newItem = { id: nextId };

    if (section === 'education') {
        newItem = { ...newItem, level: '', name: '', year: '', grade: '' };
    } else if (section === 'projects') {
        newItem = { ...newItem, name: '', stack: '', desc: '', image: 'https://via.placeholder.com/150' };
    } else if (section === 'tours') {
        newItem = { ...newItem, details: '', image: 'https://via.placeholder.com/150' };
    } else if (section === 'bestPics') {
        newItem = { ...newItem, image: 'https://via.placeholder.com/150' };
    } else { // learnings, interests, wishlist
        newItem = { ...newItem, text: '' };
        if (section === 'wishlist') newItem.image = 'https://via.placeholder.com/150';
    }
    
    setProfileData(prev => ({
        ...prev,
        [section]: [...prev[section], newItem]
    }));
  };

  const removeItem = (section, id) => {
    setProfileData(prev => ({
        ...prev,
        [section]: prev[section].filter(item => item.id !== id)
    }));
  };

  const handleArrayChange = (section, id, field, value) => {
    setProfileData(prev => ({
        ...prev,
        [section]: prev[section].map(item => 
            item.id === id ? { ...item, [field]: value } : item
        )
    }));
  };

  // --- SHARE LINK FUNCTIONS ---
  
  const generatePublicLink = () => {
    const publicLinkKey = getItem('publicLinkKey');
    
    if (!profileData || !publicLinkKey) return setShareMessage('Please view your profile first to load the sharing key.');

    const link = `${window.location.origin}/share/${publicLinkKey}`;
    setPublicLink(link);
    
    navigator.clipboard.writeText(link).then(() => {
        setShareMessage('Link copied to clipboard!');
        setTimeout(() => setShareMessage(''), 3000);
    }).catch(() => {
        setShareMessage('Could not copy link. Copy manually.');
    });
  };

  // --- RENDER HELPERS ---

  const sections = useMemo(() => ([
    { id: 'about', name: 'About', icon: <User className="w-5 h-5" /> },
    { id: 'education', name: 'Education', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'projects', name: 'Projects', icon: <Globe className="w-5 h-5" /> },
    { id: 'learnings', name: 'Learnings', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'interests', name: 'Interests', icon: <User className="w-5 h-5" /> },
    { id: 'wishlist', name: 'Wishlist', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'tours', name: 'My Tours', icon: <MapPin className="w-5 h-5" /> }, // New
    { id: 'bestPics', name: 'My Best Pic', icon: <Camera className="w-5 h-5" /> }, // New
  ]), []);

  const getSectionTitle = (id) => sections.find(s => s.id === id)?.name || id;

  const renderSectionContent = () => {
    if (!profileData || isLoading) {
      return <p className="text-center text-gray-500">Loading profile...</p>;
    }

    const data = profileData[activeSection] || profileData;
    
    // --- 1. ABOUT SECTION ---
    if (activeSection === 'about') {
        const handleImageUpload = (e) => {
            const file = e.target.files[0];
            if (file) {
                // In a real app, you'd upload this file to S3 and get the URL.
                // For this mock, we use a FileReader to get a temporary data URL.
                const reader = new FileReader();
                reader.onloadend = () => {
                    handleProfileDataChange('about', reader.result, 'image');
                };
                reader.readAsDataURL(file);
                alert("Image uploaded. Click SAVE to finalize.");
            }
        };

        return (
            <div className="flex flex-col gap-6">
                <div className="flex items-center space-x-6">
                    {/* Image Upload Area */}
                    <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-blue-500 dark:border-blue-400 shadow-lg">
                        <img src={data.about?.image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=New'} alt="Profile" className="w-full h-full object-cover" />
                        <input 
                            type="file" 
                            accept="image/*" 
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={handleImageUpload}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 opacity-0 hover:opacity-100 transition-opacity duration-300 cursor-pointer">
                            <Camera className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    {/* Vertical Text Area (Bio) */}
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-1">About Me (Bio)</label>
                        <textarea 
                            className="w-full p-3 h-32 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-blue-500 focus:border-blue-500"
                            value={data.about?.bio || ''}
                            onChange={(e) => handleProfileDataChange('about', e.target.value, 'bio')}
                            placeholder="Tell us about yourself..."
                        />
                    </div>
                </div>
                {/* Save Button */}
                <button 
                    onClick={() => updateProfile(profileData)} 
                    className="flex items-center justify-center w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition duration-300"
                    disabled={isLoading}
                >
                    <Save className="w-5 h-5 mr-2" /> Save About
                </button>
            </div>
        );
    }
    
    // --- 2. EDUCATION & PROJECTS (Dynamic Forms) ---
    if (activeSection === 'education' || activeSection === 'projects') {
        const fields = activeSection === 'education' ? 
            [{ key: 'level', label: 'Degree/Level', type: 'text' }, { key: 'name', label: 'Institution Name', type: 'text' }, { key: 'year', label: 'Year', type: 'text' }, { key: 'grade', label: 'Grade/Score', type: 'text' }] :
            [{ key: 'name', label: 'Project Name', type: 'text' }, { key: 'stack', label: 'Tech Stack', type: 'text' }, { key: 'desc', label: 'Details', type: 'textarea' }, { key: 'image', label: 'Image URL', type: 'text' }];

        return (
            <div className="flex flex-col gap-6">
                {data.map(item => (
                    <div key={item.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm bg-gray-50 dark:bg-gray-800">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {fields.map(field => (
                                <div key={field.key}>
                                    <label className="block text-sm font-medium mb-1">{field.label}</label>
                                    {field.type === 'textarea' ? (
                                        <textarea
                                            className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700"
                                            value={item[field.key] || ''}
                                            onChange={(e) => handleArrayChange(activeSection, item.id, field.key, e.target.value)}
                                            rows="3"
                                        />
                                    ) : (
                                        <input
                                            type="text"
                                            className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700"
                                            value={item[field.key] || ''}
                                            onChange={(e) => handleArrayChange(activeSection, item.id, field.key, e.target.value)}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                        <button 
                            onClick={() => removeItem(activeSection, item.id)} 
                            className="mt-4 flex items-center text-red-500 hover:text-red-600 transition duration-300"
                        >
                            <Trash2 className="w-4 h-4 mr-1" /> Remove {getSectionTitle(activeSection)}
                        </button>
                    </div>
                ))}
                
                <button 
                    onClick={() => addItem(activeSection)} 
                    className="flex items-center justify-center w-full py-2 border border-dashed border-gray-400 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition duration-300"
                >
                    <Plus className="w-5 h-5 mr-2" /> Add More {getSectionTitle(activeSection)}
                </button>

                <button 
                    onClick={() => updateProfile(profileData)} 
                    className="flex items-center justify-center w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition duration-300"
                    disabled={isLoading}
                >
                    <Save className="w-5 h-5 mr-2" /> Save {getSectionTitle(activeSection)}
                </button>
            </div>
        );
    }

    // --- 3. LEARN & INTERESTS & WISHLIST (Simple Text Arrays) ---
    if (['learnings', 'interests', 'wishlist'].includes(activeSection)) {
        const fieldLabel = activeSection === 'learnings' ? 'Learning/Certificate Title' : activeSection === 'interests' ? 'Interest' : 'Wishlist Item';
        
        return (
            <div className="flex flex-col gap-4">
                {data.map(item => (
                    <div key={item.id} className="flex items-center space-x-3">
                        <input
                            type="text"
                            className="flex-1 p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700"
                            value={item.text || ''}
                            onChange={(e) => handleArrayChange(activeSection, item.id, 'text', e.target.value)}
                            placeholder={fieldLabel}
                        />
                        <button 
                            onClick={() => removeItem(activeSection, item.id)} 
                            className="p-2 text-red-500 hover:text-red-600"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}

                <button 
                    onClick={() => addItem(activeSection)} 
                    className="flex items-center justify-center w-full py-2 border border-dashed border-gray-400 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition duration-300"
                >
                    <Plus className="w-5 h-5 mr-2" /> Add More {getSectionTitle(activeSection)}
                </button>

                <button 
                    onClick={() => updateProfile(profileData)} 
                    className="flex items-center justify-center w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition duration-300"
                    disabled={isLoading}
                >
                    <Save className="w-5 h-5 mr-2" /> Save {getSectionTitle(activeSection)}
                </button>
            </div>
        );
    }

    // --- 4. MY TOURS (New Section) ---
    if (activeSection === 'tours') {
        return (
            <div className="flex flex-col gap-6">
                {data.map(item => (
                    <div key={item.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm bg-gray-50 dark:bg-gray-800 flex space-x-4">
                        {/* Image Upload Area */}
                        <div className="w-1/4 relative">
                            <img src={item.image || 'https://via.placeholder.com/150'} alt="Tour Stop" className="w-full h-32 object-cover rounded-lg" />
                            <input 
                                type="file" 
                                accept="image/*" 
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => handleArrayChange('tours', item.id, 'image', reader.result);
                                        reader.readAsDataURL(file);
                                    }
                                }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 opacity-0 hover:opacity-100 transition-opacity duration-300 cursor-pointer">
                                <Image className="w-5 h-5 text-white" />
                            </div>
                        </div>

                        {/* Details Text Area */}
                        <div className="flex-1 flex flex-col justify-between">
                            <textarea
                                className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 h-24"
                                value={item.details || ''}
                                onChange={(e) => handleArrayChange('tours', item.id, 'details', e.target.value)}
                                placeholder="Details about this tour stop..."
                            />
                            <button 
                                onClick={() => removeItem('tours', item.id)} 
                                className="mt-2 flex items-center text-red-500 hover:text-red-600 transition duration-300"
                            >
                                <Trash2 className="w-4 h-4 mr-1" /> Remove Tour Stop
                            </button>
                        </div>
                    </div>
                ))}
                
                <button 
                    onClick={() => addItem('tours')} 
                    className="flex items-center justify-center w-full py-2 border border-dashed border-gray-400 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition duration-300"
                >
                    <Plus className="w-5 h-5 mr-2" /> Add More Tours
                </button>

                <button 
                    onClick={() => updateProfile(profileData)} 
                    className="flex items-center justify-center w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition duration-300"
                    disabled={isLoading}
                >
                    <Save className="w-5 h-5 mr-2" /> Save My Tours
                </button>
            </div>
        );
    }
    
    // --- 5. MY BEST PIC (New Section - Grid) ---
    if (activeSection === 'bestPics') {
        const handleGridImageUpload = (e, id) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onloadend = () => handleArrayChange('bestPics', id, 'image', reader.result);
                reader.readAsDataURL(file);
            }
        };

        return (
            <div className="flex flex-col gap-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 justify-items-center">
                    {data.map(item => (
                        <div key={item.id} className="relative w-full h-24 sm:h-32 lg:h-40 overflow-hidden rounded-lg shadow-md border-2 border-gray-200 dark:border-gray-700 group">
                            <img src={item.image || 'https://via.placeholder.com/150'} alt="Best Pic" className="w-full h-full object-cover" />
                            <input 
                                type="file" 
                                accept="image/*" 
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                onChange={(e) => handleGridImageUpload(e, item.id)}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer">
                                <Image className="w-6 h-6 text-white" />
                                <button 
                                    onClick={(e) => { e.stopPropagation(); removeItem('bestPics', item.id); }} 
                                    className="absolute top-1 right-1 p-1 bg-red-600 rounded-full text-white hover:bg-red-700"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {/* Add More Button */}
                    <button 
                        onClick={() => addItem('bestPics')} 
                        className="w-full h-24 sm:h-32 lg:h-40 border border-dashed border-gray-400 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center justify-center transition duration-300"
                    >
                        <Plus className="w-6 h-6" />
                    </button>
                </div>

                <button 
                    onClick={() => updateProfile(profileData)} 
                    className="flex items-center justify-center w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition duration-300"
                    disabled={isLoading}
                >
                    <Save className="w-5 h-5 mr-2" /> Save My Best Pics
                </button>
            </div>
        );
    }
    
    return <p className="text-center text-gray-500">Select a section to begin editing.</p>;
  };

  // --- RENDER VIEWS ---

  const renderLanding = () => (
    <div 
        className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
        style={{
            backgroundImage: `url('/landing.jpg')`, 
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.6)', 
            backgroundBlendMode: 'multiply' 
        }}
    >
      <div className="z-10 text-center">
        <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-pink-200 mb-6 drop-shadow-lg">
          Welcome to the Personal Book
        </h1>
        <p className="text-xl text-white/90 mb-12 drop-shadow-md max-w-lg mx-auto">
          The central hub for documenting your career, education, and personal projects.
        </p>
        
        <button onClick={() => setView('login')} className="px-12 py-5 text-xl font-bold text-white bg-white/10 backdrop-blur-md border border-white/20 rounded-full shadow-2xl hover:scale-110 transition-all">Click me</button>
      </div>
    </div>
  );

  const renderLogin = () => (
    <div 
        className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-500"
        style={{
            backgroundImage: `url('/login.jpg')`, // <-- Use your new login image path
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.7)', // Dark overlay for readability
            backgroundBlendMode: 'multiply' 
        }}
    >
       <div className="z-10 w-full max-w-md p-8 space-y-6 bg-white/90 dark:bg-gray-800/95 rounded-xl shadow-2xl backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
                Log In
            </h2>
            <div className="flex justify-center mb-6">
                <button
                    onClick={() => setLoginType('user')}
                    className={`px-4 py-2 rounded-l-lg font-semibold transition-colors duration-200 ${loginType === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                >
                    Regular User
                </button>
                <button
                    onClick={() => setLoginType('master')}
                    className={`px-4 py-2 rounded-r-lg font-semibold transition-colors duration-200 ${loginType === 'master' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                >
                    Master Admin
                </button>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                    <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        className="w-full p-3 mt-1 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                </div>
                {loginType === 'master' ? (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                        <input
                            type="password"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            required
                            className="w-full p-3 mt-1 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>
                ) : (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Secret ID (6 digits)</label>
                        <input
                            type="text"
                            value={loginSecretId}
                            onChange={(e) => setLoginSecretId(e.target.value.slice(0, 6))}
                            maxLength="6"
                            required
                            className="w-full p-3 mt-1 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>
                )}
                <button
                    type="submit"
                    className="w-full py-3 text-lg font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition duration-300 shadow-md"
                >
                    Log In
                </button>
            </form>
            <button onClick={() => setView('landing')} className="text-center w-full text-sm text-gray-500 dark:text-gray-400 hover:text-blue-500 transition-colors duration-200">
                &larr; Back to Landing Page
            </button>
        </div>
    </div>
  );

  const renderUserManagement = () => (
    <div className="p-8">
        <UserManagementTable token={token} API_URL={API_URL} />
    </div>
  );
  
  const renderMyProfile = () => (
    <div className="p-8">
        <h2 className="text-3xl font-bold mb-6 border-b pb-2">My Profile Dashboard</h2>
        
        {/* Share Link Section */}
        <div className="mb-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-inner">
            <h3 className="text-xl font-semibold mb-3 flex items-center"><Globe className="w-5 h-5 mr-2" /> Public Share Link</h3>
            <p className="text-sm mb-4">Generate and share this link to display a read-only version of your profile to the public.</p>
            <button 
                onClick={generatePublicLink} 
                className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md transition duration-300"
            >
                <Link className="w-5 h-5 mr-2" /> Generate & Copy Link
            </button>
            {shareMessage && (
                <div className="mt-3 flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
                    <Copy className="w-4 h-4" /> <span>{shareMessage}</span>
                </div>
            )}
            {publicLink && (
                <p className="mt-2 text-sm break-all text-blue-600 dark:text-blue-400">
                    <a href={publicLink} target="_blank" rel="noopener noreferrer">{publicLink}</a>
                </p>
            )}
        </div>
        
        {/* Profile Editing Section */}
        <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:w-1/4">
                <nav className="flex flex-col p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                    <h4 className="text-lg font-bold mb-3 border-b pb-2">Edit Sections</h4>
                    {sections.map(section => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`flex items-center px-3 py-2 rounded-lg text-left transition-colors duration-200 mb-1 ${
                                activeSection === section.id 
                                ? 'bg-blue-600 text-white shadow-md' 
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            {section.icon}
                            <span className="ml-3 font-medium">{section.name}</span>
                        </button>
                    ))}
                </nav>
            </div>
            
            {/* Content Area */}
            <div className="lg:w-3/4 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg min-h-[500px]">
                <h3 className="text-2xl font-bold mb-6 border-b pb-3">{getSectionTitle(activeSection)}</h3>
                {renderSectionContent()}
            </div>
        </div>
    </div>
  );

  const renderSettings = () => (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-6 border-b pb-2">Settings</h2>

      {/* Logged-In User Info */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg shadow-md border-l-4 border-blue-600">
          <p className="font-semibold text-blue-800 dark:text-blue-300">
              Logged in as: <span className="text-blue-600 dark:text-blue-400 font-bold">{username}</span> ({role})
          </p>
      </div>
      
      {/* Dark Mode Toggle */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="flex items-center space-x-3">
          {isDarkMode ? <Moon className="w-6 h-6 text-yellow-500" /> : <Sun className="w-6 h-6 text-orange-500" />}
          <span className="text-xl font-medium">Dark Mode</span>
        </div>
        <button
          onClick={toggleDarkMode}
          className={`relative w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}
        >
          <div
            className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`}
          />
        </button>
      </div>

      <button onClick={handleLogout} className="mt-8 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition duration-300 shadow-md">
          Log Out
      </button>
    </div>
  );

  // --- NAVIGATION & LAYOUT ---
  
  const renderNav = () => (
    <nav className="sticky top-0 z-20 bg-white dark:bg-gray-900 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">Personal Book</h1>
          </div>
          <div className="flex items-center space-x-4">
            {/* Common Buttons */}
            {token && (
                <>
                    <NavButton name="Home" icon={<Home />} currentView={view} targetView="home" setView={setView} />
                    <NavButton name="My Profile" icon={<User />} currentView={view} targetView="profile" setView={() => { setView('profile'); setActiveSection('about'); }} />
                    <NavButton name="Settings" icon={<Settings />} currentView={view} targetView="settings" setView={setView} />
                </>
            )}
            
            {/* Role-Specific Buttons */}
            {role === 'master' && (
              <NavButton name="User Management" icon={<Users />} currentView={view} targetView="users-list" setView={setView} />
            )}
            
            {/* Auth Buttons */}
            {!token ? (
              <NavButton name="Log In" icon={<LogIn />} currentView={view} targetView="login" setView={setView} />
            ) : (
              <button onClick={handleLogout} className="text-gray-500 dark:text-gray-400 hover:text-red-500 transition duration-200 flex items-center text-sm font-medium">
                <LogIn className="w-5 h-5 rotate-180 mr-1" /> Logout
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );

  // NavButton Component (Defined inside App for simplicity)
  const NavButton = ({ name, icon, currentView, targetView, setView }) => (
      <button 
          onClick={() => setView(targetView)} 
          className={`flex items-center px-3 py-2 rounded-md transition-colors duration-200 ${
              currentView === targetView 
              ? 'bg-blue-500 text-white' 
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
      >
          {icon}
          <span className="ml-1 text-sm font-medium hidden sm:inline">{name}</span>
      </button>
  );

  const renderFooter = () => (
      <footer className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500 dark:text-gray-400">
              &copy; {new Date().getFullYear()} Personal Book Application. All rights reserved.
          </div>
      </footer>
  );

  // --- MAIN RENDER LOGIC ---
  let content;
  let showNav = true;
  let showFooter = true;

  if (view === 'landing') {
    content = renderLanding();
    showNav = false;
    showFooter = false;
  } else if (view === 'login') {
    content = renderLogin();
    showNav = false;
  } else if (view === 'share') {
    // Handle Public Share Route
    const publicLinkKey = window.location.pathname.split('/share/')[1];
    content = <PublicProfileView publicLinkKey={publicLinkKey} />;
  } else {
    // Authenticated views
    if (!token) {
      setView('landing'); // Redirect if token is lost
      content = renderLanding();
      showNav = false;
      showFooter = false;
    } else if (view === 'home') {
      // Default dashboard view (can be empty or a welcome screen)
      content = <div className="p-8 text-center">
                    <h2 className="text-4xl font-extrabold text-blue-600 dark:text-blue-400">Welcome back, {username}!</h2>
                    <p className="mt-4 text-lg">Use the navigation bar to manage your profile or users.</p>
                </div>;
    } else if (view === 'users-list' && role === 'master') {
      content = renderUserManagement();
    } else if (view === 'profile') {
      content = renderMyProfile();
    } else if (view === 'settings') {
      content = renderSettings();
    } else {
        content = <div className="p-8 text-center text-red-500">404 - Page Not Found</div>;
    }
  }

  // Wrapper for authenticated views to include Nav and Footer
  if (showNav) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 transition-colors duration-500">
        {renderNav()}
        <main className="flex-grow max-w-7xl mx-auto w-full">
          {content}
        </main>
        {showFooter && renderFooter()}
      </div>
    );
  }

  return content;
}

export default App;
