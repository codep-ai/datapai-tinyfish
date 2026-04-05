"use client";

export default function LogoutButton() {
  async function handleLogout() {
    try {
      await fetch("https://auth.datap.ai/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {}
    window.location.href = "/";
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm font-medium text-gray-500 hover:text-red-500 transition-colors"
      style={{ padding: "0.5rem 0.75rem" }}
    >
      Sign out
    </button>
  );
}
