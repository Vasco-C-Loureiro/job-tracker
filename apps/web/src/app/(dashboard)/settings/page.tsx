import SettingsColumnsPanel from "./SettingsColumnsPanel";

export default function SettingsPage() {
  return (
    <main className="p-8 font-sans max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>
      <SettingsColumnsPanel />
    </main>
  );
}
