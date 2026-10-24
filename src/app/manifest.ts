import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Habitable",
    short_name: "Habitable",
    description: "Your NYC repair problem, on the record: photo → housing-code class → dated notice.",
    start_url: "/",
    display: "standalone",
    background_color: "#f0ede8",
    theme_color: "#f0ede8",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
