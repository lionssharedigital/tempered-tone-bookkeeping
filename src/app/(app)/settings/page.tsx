import SettingsForm from "@/components/settings/SettingsForm";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-6 font-display text-lg font-semibold">Settings</h1>
      <SettingsForm />
    </div>
  );
}
