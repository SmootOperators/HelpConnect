"use client";

import Link from "next/link";

export default function Sidebar() {
  return (
    <div className="w-64 h-screen bg-gray-900 text-white p-4">
      <h2 className="text-xl font-bold mb-6">Admin Panel</h2>

      <nav className="flex flex-col gap-4">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/ngos">NGOs</Link>
        <Link href="/users">Users</Link>
        <Link href="/needs">Needs</Link>
      </nav>
    </div>
  );
}