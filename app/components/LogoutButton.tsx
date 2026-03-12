"use client";

export default function LogoutButton() {
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
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
