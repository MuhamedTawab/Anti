import { AppShell } from "@/components/app-shell";
import { getBootstrap } from "@/lib/data";

export default async function Home() {
  return (
    <main className="min-h-screen px-4 py-4 text-white lg:px-6 lg:py-6">
      <AppShell initialData={await getBootstrap()} />
    </main>
  );
}
