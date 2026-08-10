"use client";

import { useState, useEffect } from "react";
import { authClient } from "../../../lib/auth-client";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [orgName, setOrgName] = useState("");
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const session = await authClient.getSession();
    if (session?.data?.user) {
      setUser(session.data.user);
    } else {
      window.location.href = "/login";
    }
    setLoading(false);
  };

  const createOrg = async () => {
    if (!orgName.trim()) return;
    const result = await authClient.organization.create({
      name: orgName,
      slug: orgName.toLowerCase().replace(/\s+/g, "-"),
    });
    if (result.data) {
      alert("Organization created!");
      setOrgName("");
      // Refresh orgs list
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-3xl font-bold mb-2">Welcome, {user?.name}!</h1>
          <p className="text-gray-600">{user?.email}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Create Organization</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="My Agency"
              className="flex-1 px-4 py-2 border border-gray-300 rounded"
            />
            <button
              onClick={createOrg}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Your Organizations</h2>
          <p className="text-gray-500">You'll see your organizations here once created.</p>
        </div>
      </div>
    </div>
  );
}