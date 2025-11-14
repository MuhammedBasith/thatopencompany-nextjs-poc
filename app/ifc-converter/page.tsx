"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as FRAGS from "@thatopen/fragments";
import { DragControls } from "three/examples/jsm/controls/DragControls.js";
import Stats from "stats.js";

export default function IFCConverterPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [loadedModel, setLoadedModel] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState<string | null>(null);

  const componentsRef = useRef<OBC.Components | null>(null);
  const fragmentsRef = useRef<FRAGS.FragmentsModels | null>(null);
  const serializerRef = useRef<FRAGS.IfcImporter | null>(null);
  const dragControlsRef = useRef<DragControls | null>(null);
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

    // Setting up a Simple Scene
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

      // Dispose previous drag controls
      if (dragControlsRef.current) {
        dragControlsRef.current.dispose();
        dragControlsRef.current = null;
      }

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
        model.useCamera(world.camera.three);
        world.scene.three.add(model.object);
        await fragments.update(true);

        // Store reference to current model
        currentModelObjectRef.current = model.object;

        // Create a bounding box for the model to use with drag controls
        const box = new THREE.Box3();
        box.setFromObject(model.object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Create an invisible box mesh for drag interaction
        const dragHelperGeometry = new THREE.BoxGeometry(
          size.x,
          size.y,
          size.z
        );
        const dragHelperMaterial = new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false,
        });
        const dragHelper = new THREE.Mesh(
          dragHelperGeometry,
          dragHelperMaterial
        );
        dragHelper.position.copy(center);
        world.scene.three.add(dragHelper);

        // Setup drag controls on the invisible helper
        const dragControls = new DragControls(
          [dragHelper],
          world.camera.three,
          world.renderer.three.domElement
        );

        dragControlsRef.current = dragControls;

        // Variables to track the offset between model and helper
        const initialModelPos = model.object.position.clone();
        const initialHelperPos = dragHelper.position.clone();
        const offset = initialModelPos.clone().sub(initialHelperPos);

        // Enable/disable camera controls when dragging
        dragControls.addEventListener("dragstart", () => {
          world.camera.controls.enabled = false;
        });

        dragControls.addEventListener("dragend", () => {
          world.camera.controls.enabled = true;
        });

        // Update model position when dragging the helper
        dragControls.addEventListener("drag", (event) => {
          if (event.object && model.object) {
            // Keep helper on grid plane
            event.object.position.y = initialHelperPos.y;
            // Update model position with offset
            model.object.position.copy(event.object.position).add(offset);
          }
        });

        // Fit camera to model
        const maxDim = Math.max(size.x, size.y, size.z);
        const distance = maxDim * 1.5;

        await world.camera.controls.setLookAt(
          center.x + distance,
          center.y + distance,
          center.z + distance,
          center.x,
          center.y,
          center.z
        );
      }

      setLoadedModel(modelId);
    } catch (error) {
      console.error("Error loading IFC:", error);
      alert("Error loading IFC file. Check console for details.");
    } finally {
      setLoadingFile(null);
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
        }}
      >
        <div style={{ display: "flex", gap: "10px" }}>
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
          <div
            style={{
              fontSize: "12px",
              color: "#6b7280",
              textAlign: "center",
              fontStyle: "italic",
            }}
          >
            💡 Click and drag the object to move it around the grid
          </div>
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
          ✓ Loaded: {loadedModel}
        </div>
      )}
    </div>
  );
}
