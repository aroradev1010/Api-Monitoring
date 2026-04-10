import IncidentFeed from "@/components/IncidentFeed";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <IncidentFeed />
      </div>
    </main>
  );
}
