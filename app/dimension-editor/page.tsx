"use client";

import dynamic from "next/dynamic";

const DimensionEditorContent = dynamic(
  () => import("./dimension-editor-content"),
  { ssr: false }
);

export default function DimensionEditorPage() {
  return <DimensionEditorContent />;
}
