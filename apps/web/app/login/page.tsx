"use client";

import { useState } from "react";
import { signIn, signUp } from "../../lib/auth-client";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isSignUp) {
        const result = await signUp.email({
          email,
          password,
          name: name || email.split("@")[0],
        });
        if (result?.error) {
          setError(result.error.message || JSON.stringify(result.error));
        } else {
          setSuccess("Account created! Redirecting...");
          setTimeout(() => { window.location.href = "/"; }, 1000);
        }
      } else {
        const result = await signIn.email({
          email,
          password,
        });
        if (result?.error) {
          setError(result.error.message || JSON.stringify(result.error));
        } else {
          setSuccess("Signed in! Redirecting...");
          setTimeout(() => { window.location.href = "/"; }, 1000);
        }
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    backgroundColor: "#374151",
    border: "1px solid #4b5563",
    borderRadius: "6px",
    color: "#f9fafb",
    fontSize: "14px",
    boxSizing: "border-box" as const,
  };

  const labelStyle = {
    display: "block",
    fontSize: "14px",
    fontWeight: "500" as const,
    marginBottom: "6px",
    color: "#f9fafb",
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#111827", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "420px", width: "100%", padding: "32px", backgroundColor: "#1f2937", borderRadius: "12px", color: "#f9fafb" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", textAlign: "center", marginBottom: "8px" }}>BrandOS</h1>
        <p style={{ textAlign: "center", color: "#9ca3af", marginBottom: "24px" }}>
          {isSignUp ? "Create your account" : "Sign in to your account"}
        </p>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ padding: "12px", backgroundColor: "#7f1d1d", border: "1px solid #dc2626", borderRadius: "6px", color: "#fecaca", fontSize: "14px", marginBottom: "16px" }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ padding: "12px", backgroundColor: "#14532d", border: "1px solid #16a34a", borderRadius: "6px", color: "#bbf7d0", fontSize: "14px", marginBottom: "16px" }}>
              {success}
            </div>
          )}

          {isSignUp && (
            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="Your name" />
            </div>
          )}

          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} placeholder="you@example.com" />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={labelStyle}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} placeholder="••••••••" />
          </div>

          <button type="submit" disabled={loading} style={{ width: "100%", padding: "12px", backgroundColor: loading ? "#4b5563" : "#2563eb", color: "white", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: "500", cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "Loading..." : isSignUp ? "Create Account" : "Sign In"}
          </button>

          <div style={{ textAlign: "center", marginTop: "16px" }}>
            <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(""); setSuccess(""); }} style={{ background: "none", border: "none", color: "#60a5fa", fontSize: "14px", cursor: "pointer" }}>
              {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}