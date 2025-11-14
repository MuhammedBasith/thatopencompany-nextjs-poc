"use client";

import dynamic from "next/dynamic";

const WorldContent = dynamic(
  () => import("./world-content"),
  { ssr: false }
);

export default function WorldPage() {
  return <WorldContent />;
}
