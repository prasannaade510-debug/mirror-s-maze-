import { createFileRoute, notFound } from "@tanstack/react-router";
import { SpaceGame } from "@/components/game/SpaceGame";
import { getSpaceLevel } from "@/game/spaceLevels";

export const Route = createFileRoute("/space/$levelId")({
  loader: ({ params }) => {
    const level = getSpaceLevel(Number(params.levelId));
    if (!level) throw notFound();
    return { level };
  },
  head: ({ params }) => ({
    meta: [
      { title: `Sun & Planets — World ${params.levelId}` },
      { name: "description", content: `Guide sunlight to every planet in world ${params.levelId} using mirrors, prisms and lenses.` },
      { property: "og:title", content: `Sun & Planets — World ${params.levelId}` },
      { property: "og:description", content: "Bend sunlight to wake up the planets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const { level } = Route.useLoaderData();
  return <SpaceGame level={level} />;
}
