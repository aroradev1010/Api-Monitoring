"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";

export default function Home() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <Card className="w-full max-w-md shadow-lg border border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            🚀 API Monitoring Dashboard
          </CardTitle>
        </CardHeader>

        <CardContent className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Monitor APIs, visualize performance, and track alerts — all in one place.
          </p>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 items-center">
          <Button
            className="w-full"
            onClick={() => router.push("/dashboard")}
          >
            Go to Dashboard
          </Button>


        </CardFooter>
      </Card>


    </main>
  );
}
