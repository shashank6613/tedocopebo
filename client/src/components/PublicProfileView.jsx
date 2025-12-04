import React, { useState, useEffect } from 'react';
// Import your UI components (like ArrowLeft, Education, etc.)

const PublicProfileView = ({ publicLinkKey }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!publicLinkKeys) return;

        const fetchPublicData = async () => {
            try {
                const response = await fetch(`${API_URL}/profile/public/${publicLinkKey}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch profile.');
                }
                const result = await response.json();
                setData(result);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchPublicData();
    }, [secretId]);

    if (loading) return <div className="text-center p-20">Loading profile...</div>;
    if (error) return <div className="text-center p-20 text-red-500">Error: {error}</div>;
    if (!data) return <div className="text-center p-20">Profile Not Found.</div>;

    const { username, profile } = data;

    return (
        <div className="max-w-4xl mx-auto p-8 dark:bg-slate-900 min-h-screen">
            <h1 className="text-5xl font-extrabold mb-4">{profile.about.name || username}'s Public Profile</h1>
            <p className="text-xl text-slate-400 mb-12">{profile.about.bio}</p>

            {/* --- About Section (Public) --- */}
            <section className="mb-10 p-6 bg-slate-800 rounded-lg">
                <h2 className="text-3xl font-bold mb-4 border-b pb-2">About</h2>
                <img src={profile.about.image} className="w-48 h-48 rounded-full mb-4" alt="Profile" />
                <p>{profile.about.bio}</p>
            </section>

            {/* --- Education Section (Public) --- */}
            <section className="mb-10 p-6 bg-slate-800 rounded-lg">
                <h2 className="text-3xl font-bold mb-4 border-b pb-2">Education</h2>
                {profile.education.map((item, index) => (
                    <div key={index} className="mb-4">
                        <h3 className="text-xl font-semibold">{item.degree}</h3>
                        <p className="text-slate-400">{item.institution} ({item.year})</p>
                    </div>
                ))}
            </section>

            {/* Add other public sections (Projects, Learnings, etc.) here */}

        </div>
    );
};

export default PublicProfileView;
