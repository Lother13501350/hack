import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-16">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Hackathon</h1>
        <Badge variant="secondary">starter</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Ready to build</CardTitle>
          <CardDescription>
            Replace this page with the project. Components live in{" "}
            <code>src/components/ui</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Health check: <code>/api/health</code>
        </CardContent>
      </Card>
    </main>
  );
}
