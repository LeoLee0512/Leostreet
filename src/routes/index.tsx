import { createFileRoute } from "@tanstack/react-router";
import { GameRoot } from "@/components/game/GameRoot";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <GameRoot />;
}
