"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as FRAGS from "@thatopen/fragments";
import Stats from "stats.js";

export default function DimensionEditorContent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [loadedModel, setLoadedModel] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState<string | null>(null);

  // Dimension states
  const [width, setWidth] = useState<number>(1.0);
  const [height, setHeight] = useState<number>(2.0);
  const [depth, setDepth] = useState<number>(0.1);

  // Original dimensions for reset
  const [originalWidth, setOriginalWidth] = useState<number>(1.0);
  const [originalHeight, setOriginalHeight] = useState<number>(2.0);
  const [originalDepth, setOriginalDepth] = useState<number>(0.1);
  const [originalScale, setOriginalScale] = useState<THREE.Vector3>(new THREE.Vector3(1, 1, 1));

  const componentsRef = useRef<OBC.Components | null>(null);
  const fragmentsRef = useRef<FRAGS.FragmentsModels | null>(null);
  const serializerRef = useRef<FRAGS.IfcImporter | null>(null);
  const currentModelObjectRef = useRef<THREE.Object3D | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || isInitialized.current || !isReady) return;

    isInitialized.current = true;
    const container = containerRef.current;

    // Setting up a simple scene
    const components = new OBC.Components();
    componentsRef.current = components;

    const worlds = components.get(OBC.Worlds);
    const world = worlds.create<
      OBC.SimpleScene,
      OBC.SimpleCamera,
      OBC.SimpleRenderer
    >();

    world.scene = new OBC.SimpleScene(components);
    world.scene.setup();
    world.scene.three.background = null;

    world.renderer = new OBC.SimpleRenderer(components, container);
    world.camera = new OBC.SimpleCamera(components);
    world.camera.controls.setLookAt(5, 5, 5, 0, 0, 0);

    components.init();

    // Add grid
    const grids = components.get(OBC.Grids);
    grids.create(world);

    // Setting Up Fragments
    const workerUrl = "/resources/worker.mjs";
    const fragments = new FRAGS.FragmentsModels(workerUrl);
    fragmentsRef.current = fragments;

    world.camera.controls.addEventListener("rest", () =>
      fragments.update(true)
    );

    // Setup IFC Importer
    const serializer = new FRAGS.IfcImporter();
    serializerRef.current = serializer;
    serializer.wasm = {
      absolute: true,
      path: "https://unpkg.com/web-ifc@0.0.72/",
    };

    // Measuring performance
    const stats = new Stats();
    stats.showPanel(2);
    document.body.append(stats.dom);
    stats.dom.style.left = "0px";
    stats.dom.style.zIndex = "unset";
    world.renderer.onBeforeUpdate.add(() => stats.begin());
    world.renderer.onAfterUpdate.add(() => stats.end());

    // Cleanup function
    return () => {
      try {
        world.renderer?.dispose();
        components.dispose();
        if (stats.dom && stats.dom.parentElement) {
          stats.dom.parentElement.removeChild(stats.dom);
        }
      } catch (error) {
        console.error("Error during cleanup:", error);
      }
    };
  }, [isReady]);

  const loadIFCFile = async (fileName: string) => {
    if (!fragmentsRef.current || !serializerRef.current || !componentsRef.current)
      return;

    setLoadingFile(fileName);
    setLoadedModel(null);

    try {
      const fragments = fragmentsRef.current;
      const serializer = serializerRef.current;
      const components = componentsRef.current;

      // Remove previous model if exists
      const models = [...fragments.models.list.keys()];
      for (const modelId of models) {
        await fragments.disposeModel(modelId);
      }

      // Load IFC file
      const url = `/objects/${fileName}`;
      const ifcFile = await fetch(url);
      const ifcBuffer = await ifcFile.arrayBuffer();
      const ifcBytes = new Uint8Array(ifcBuffer);

      // Convert to Fragments
      const fragmentBytes = await serializer.process({
        bytes: ifcBytes,
        progressCallback: (progress, data) => {
          console.log(`Conversion progress: ${progress}%`, data);
        },
      });

      // Load the model
      const modelId = fileName.replace(".ifc", "");
      const model = await fragments.load(fragmentBytes, { modelId });

      const worlds = components.get(OBC.Worlds);
      const world = worlds.list.values().next().value;
      if (world) {
        const camera = world.camera.three as THREE.PerspectiveCamera;
        model.useCamera(camera);
        world.scene.three.add(model.object);
        await fragments.update(true);

        // Store reference to current model
        currentModelObjectRef.current = model.object;

        // Calculate original dimensions from bounding box
        const box = new THREE.Box3();
        box.setFromObject(model.object);
        const size = box.getSize(new THREE.Vector3());

        // Store original dimensions
        const origWidth = size.x;
        const origHeight = size.z; // Assuming Z is height
        const origDepth = size.y;

        setWidth(parseFloat(origWidth.toFixed(2)));
        setHeight(parseFloat(origHeight.toFixed(2)));
        setDepth(parseFloat(origDepth.toFixed(2)));

        setOriginalWidth(parseFloat(origWidth.toFixed(2)));
        setOriginalHeight(parseFloat(origHeight.toFixed(2)));
        setOriginalDepth(parseFloat(origDepth.toFixed(2)));
        setOriginalScale(model.object.scale.clone());

        // Fit camera to model
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const distance = maxDim * 1.5;

        if (world.camera.controls) {
          await world.camera.controls.setLookAt(
            center.x + distance,
            center.y + distance,
            center.z + distance,
            center.x,
            center.y,
            center.z
          );
        }
      }

      setLoadedModel(modelId);
    } catch (error) {
      console.error("Error loading IFC:", error);
      alert("Error loading IFC file. Check console for details.");
    } finally {
      setLoadingFile(null);
    }
  };

  const applyDimensions = () => {
    if (!currentModelObjectRef.current) return;

    // Calculate scale factors based on original dimensions
    const scaleX = width / originalWidth;
    const scaleY = depth / originalDepth;
    const scaleZ = height / originalHeight;

    // Apply scaling
    currentModelObjectRef.current.scale.set(
      originalScale.x * scaleX,
      originalScale.y * scaleY,
      originalScale.z * scaleZ
    );

    // Update fragments
    if (fragmentsRef.current) {
      fragmentsRef.current.update(true);
    }
  };

  const resetDimensions = () => {
    if (!currentModelObjectRef.current) return;

    setWidth(originalWidth);
    setHeight(originalHeight);
    setDepth(originalDepth);

    // Reset scale
    currentModelObjectRef.current.scale.copy(originalScale);

    // Update fragments
    if (fragmentsRef.current) {
      fragmentsRef.current.update(true);
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          zIndex: 10,
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          padding: "15px 20px",
          borderRadius: "12px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          minWidth: "400px",
        }}
      >
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <button
            onClick={() =>
              loadIFCFile("GEALAN_S9000_Door_1100x2000-IFC4.ifc")
            }
            disabled={loadingFile !== null}
            style={{
              padding: "10px 20px",
              backgroundColor:
                loadedModel === "GEALAN_S9000_Door_1100x2000-IFC4"
                  ? "#4ade80"
                  : "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: loadingFile !== null ? "not-allowed" : "pointer",
              fontWeight: "500",
              fontSize: "14px",
              opacity: loadingFile !== null ? 0.6 : 1,
              transition: "all 0.2s",
            }}
          >
            {loadingFile === "GEALAN_S9000_Door_1100x2000-IFC4.ifc"
              ? "Loading..."
              : "Load Door"}
          </button>

          <button
            onClick={() =>
              loadIFCFile("GEALAN_S9000_Double_Vent_Window_1400x1200-IFC4.ifc")
            }
            disabled={loadingFile !== null}
            style={{
              padding: "10px 20px",
              backgroundColor:
                loadedModel ===
                "GEALAN_S9000_Double_Vent_Window_1400x1200-IFC4"
                  ? "#4ade80"
                  : "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: loadingFile !== null ? "not-allowed" : "pointer",
              fontWeight: "500",
              fontSize: "14px",
              opacity: loadingFile !== null ? 0.6 : 1,
              transition: "all 0.2s",
            }}
          >
            {loadingFile ===
            "GEALAN_S9000_Double_Vent_Window_1400x1200-IFC4.ifc"
              ? "Loading..."
              : "Load Window"}
          </button>
        </div>

        {loadedModel && (
          <>
            <div
              style={{
                borderTop: "1px solid #e5e7eb",
                paddingTop: "10px",
              }}
            >
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  marginBottom: "10px",
                  color: "#374151",
                }}
              >
                Dimension Editor
              </div>

              {/* Width Input */}
              <div style={{ marginBottom: "10px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "500",
                    marginBottom: "4px",
                    color: "#6b7280",
                  }}
                >
                  Width (meters)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={width}
                  onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
                  style={{
                    color: "black",
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                />
              </div>

              {/* Height Input */}
              <div style={{ marginBottom: "10px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "500",
                    marginBottom: "4px",
                    color: "#6b7280",
                  }}
                >
                  Height (meters)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={height}
                  onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
                  style={{
                    color: "black",
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                />
              </div>

              {/* Depth Input */}
              <div style={{ marginBottom: "10px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "500",
                    marginBottom: "4px",
                    color: "#6b7280",
                  }}
                >
                  Depth (meters)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={depth}
                  onChange={(e) => setDepth(parseFloat(e.target.value) || 0)}
                  style={{
                    color: "black",
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                <button
                  onClick={applyDimensions}
                  style={{
                    flex: 1,
                    padding: "10px",
                    backgroundColor: "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "500",
                    fontSize: "14px",
                  }}
                >
                  Apply Changes
                </button>
                <button
                  onClick={resetDimensions}
                  style={{
                    flex: 1,
                    padding: "10px",
                    backgroundColor: "#6b7280",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "500",
                    fontSize: "14px",
                  }}
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Disclaimer */}
            <div
              style={{
                fontSize: "11px",
                color: "#9ca3af",
                fontStyle: "italic",
                backgroundColor: "#fef3c7",
                padding: "8px",
                borderRadius: "6px",
                marginTop: "8px",
              }}
            >
              ⚠️ Note: This demonstrates visual scaling. True parametric geometry
              regeneration requires complex IFC processing not provided by @thatopen libraries.
            </div>
          </>
        )}
      </div>

      {loadedModel && (
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(34, 197, 94, 0.95)",
            color: "white",
            padding: "10px 20px",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "500",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          }}
        >
          ✓ Loaded: {loadedModel} | W: {width.toFixed(2)}m × H: {height.toFixed(2)}m × D: {depth.toFixed(2)}m
        </div>
      )}
    </div>
  );
}
