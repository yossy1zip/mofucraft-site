import React from "react";
import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => [
  { title: "マップ - MOFUCRAFT!!!" }
];

export default function MapPage() {
  return (
    <div className="w-full h-full">
      <iframe
        src="//static.mofucraft.net/dynmap/main"
        title="マップ - MOFUCRAFT!!!"
        width="100%"
        height="100%"
        loading="lazy"
        style={{ border: "none", display: "block" }}
        allowFullScreen
      />
    </div>
  );
}