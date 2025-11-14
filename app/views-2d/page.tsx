"use client";

import dynamic from "next/dynamic";

const Views2DContent = dynamic(
  () => import("./views-2d-content"),
  { ssr: false }
);

export default function Views2DPage() {
  return <Views2DContent />;
}
