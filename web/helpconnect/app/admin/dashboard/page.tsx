export default function Dashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="p-4 bg-white shadow">Total NGOs</div>
        <div className="p-4 bg-white shadow">Volunteers</div>
        <div className="p-4 bg-white shadow">Active Needs</div>
      </div>
    </div>
  );
}