import { AppShell } from "@/components/app-shell";

// V15.4: Warp Drive - Zero Blocking Skeleton
const SKELETON_DATA = {
  servers: [],
  messages: {},
  members: {}
};

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-4 text-white lg:px-6 lg:py-6">
      <AppShell initialData={SKELETON_DATA} />
    </main>
  );
}
