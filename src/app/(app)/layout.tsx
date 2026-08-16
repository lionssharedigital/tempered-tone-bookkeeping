import Sidebar from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="w-full flex-1 px-6 py-8 md:px-10 md:py-10">{children}</main>
    </div>
  );
}
