import { createFileRoute, notFound } from "@tanstack/react-router";
import { getLevel } from "@/game/levels";
import { MirrorGame } from "@/components/game/MirrorGame";

export const Route = createFileRoute("/play/$levelId")({
  loader: ({ params }) => {
    const level = getLevel(Number(params.levelId));
    if (!level) throw notFound();
    return { level };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Level not found — Mirror Maze" }, { name: "robots", content: "noindex" }] };
    const title = `Level ${loaderData.level.id} (Class ${loaderData.level.cls}) — Mirror Maze`;
    return {
      meta: [
        { title },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "description", content: "Place mirrors to bounce the light beam onto the glowing star." },
        { property: "og:title", content: title },
        { property: "og:description", content: "Can you guide the light to the star?" },
      ],
    };
  },
  component: Play,
});

function Play() {
  const { level } = Route.useLoaderData();
  return <MirrorGame key={level.id} level={level} />;
}
