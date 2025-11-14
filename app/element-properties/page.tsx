"use client";

import dynamic from "next/dynamic";

const ElementPropertiesContent = dynamic(
  () => import("./element-properties-content"),
  { ssr: false }
);

export default function ElementPropertiesPage() {
  return <ElementPropertiesContent />;
}
