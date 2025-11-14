"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import * as FRAGS from "@thatopen/fragments";
import * as BUIC from "@thatopen/ui-obc";
import Stats from "stats.js";

export default function ElementPropertiesContent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [loadedModel, setLoadedModel] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState<string | null>(null);

  const componentsRef = useRef<OBC.Components | null>(null);
  const fragmentsRef = useRef<FRAGS.FragmentsModels | null>(null);
  const serializerRef = useRef<FRAGS.IfcImporter | null>(null);
  const highlighterRef = useRef<OBCF.Highlighter | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || isInitialized.current || !isReady) return;

    isInitialized.current = true;
    const container = containerRef.current;

    // Initialize UI
    BUI.Manager.init();

    // Setting up a simple scene
    const components = new OBC.Components();
    componentsRef.current = components;

    const worlds = components.get(OBC.Worlds);
    const world = worlds.create<
      OBC.SimpleScene,
      OBC.SimpleCamera,
      OBC.SimpleRenderer
    >();

    world.name = "main";

    const sceneComponent = new OBC.SimpleScene(components);
    sceneComponent.setup();
    world.scene = sceneComponent;
    world.scene.three.background = null;

    // Create a sub-container for the viewport
    const viewportContainer = document.createElement("div");
    viewportContainer.style.width = "100%";
    viewportContainer.style.height = "100%";
    viewportContainer.style.position = "relative";
    container.appendChild(viewportContainer);

    const rendererComponent = new OBC.SimpleRenderer(
      components,
      viewportContainer
    );
    world.renderer = rendererComponent;

    const cameraComponent = new OBC.SimpleCamera(components);
    world.camera = cameraComponent;
    world.camera.controls.setLookAt(5, 5, 5, 0, 0, 0);

    components.init();

    const grids = components.get(OBC.Grids);
    grids.create(world);

    // Setup Fragments - Initialize both FragmentsManager (for highlighter) and FragmentsModels
    const workerUrl = "/resources/worker.mjs";

    // Initialize FragmentsManager for the highlighter
    const fragmentsManager = components.get(OBC.FragmentsManager);
    fragmentsManager.init(workerUrl);

    // Also use FragmentsModels for loading
    const fragments = new FRAGS.FragmentsModels(workerUrl);
    fragmentsRef.current = fragments;

    world.camera.controls.addEventListener("rest", () => {
      fragments.update(true);
      fragmentsManager.core.update(true);
    });

    // Setup IFC Importer
    const serializer = new FRAGS.IfcImporter();
    serializerRef.current = serializer;
    serializer.wasm = {
      absolute: true,
      path: "https://unpkg.com/web-ifc@0.0.72/",
    };

    // Setup highlighter for selection
    const highlighter = components.get(OBCF.Highlighter);
    highlighter.setup({ world });
    highlighterRef.current = highlighter;

    // Create properties table using @thatopen/ui-obc
    const [propertiesTable, updatePropertiesTable] = BUIC.tables.itemsData({
      components,
      modelIdMap: {},
    });

    propertiesTable.preserveStructureOnFilter = true;
    propertiesTable.indentationInText = false;

    // Update properties table when selection changes
    highlighter.events.select.onHighlight.add((modelIdMap) => {
      updatePropertiesTable({ modelIdMap });
    });

    highlighter.events.select.onClear.add(() =>
      updatePropertiesTable({ modelIdMap: {} })
    );

    // Create properties panel
    const panel = BUI.Component.create<BUI.Panel>(() => {
      const onTextInput = (e: Event) => {
        const input = e.target as BUI.TextInput;
        propertiesTable.queryString = input.value !== "" ? input.value : null;
      };

      const expandTable = (e: Event) => {
        const button = e.target as BUI.Button;
        propertiesTable.expanded = !propertiesTable.expanded;
        button.label = propertiesTable.expanded ? "Collapse" : "Expand";
      };

      const copyAsTSV = async () => {
        await navigator.clipboard.writeText(propertiesTable.tsv);
      };

      return BUI.html`
        <bim-panel label="Element Properties" class="options-menu">
          <bim-panel-section label="Element Data">
            <bim-label style="white-space: normal; margin-bottom: 0.5rem;">
              Load an IFC model and click on elements to see their properties
            </bim-label>
            <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
              <bim-button @click=${expandTable} label=${propertiesTable.expanded ? "Collapse" : "Expand"}></bim-button>
              <bim-button @click=${copyAsTSV} label="Copy as TSV"></bim-button>
            </div>
            <bim-text-input @input=${onTextInput} placeholder="Search Property" debounce="250"></bim-text-input>
            ${propertiesTable}
          </bim-panel-section>
        </bim-panel>
      `;
    });

    document.body.append(panel);

    // Create mobile menu toggler
    const button = BUI.Component.create<BUI.PanelSection>(() => {
      return BUI.html`
        <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
          @click="${() => {
            if (panel.classList.contains("options-menu-visible")) {
              panel.classList.remove("options-menu-visible");
            } else {
              panel.classList.add("options-menu-visible");
            }
          }}">
        </bim-button>
      `;
    });

    document.body.append(button);

    // Setup Stats.js for performance monitoring
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
        if (panel && panel.parentElement) {
          panel.parentElement.removeChild(panel);
        }
        if (button && button.parentElement) {
          button.parentElement.removeChild(button);
        }
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

      // Also clear FragmentsManager
      const fragmentsManager = components.get(OBC.FragmentsManager);
      fragmentsManager.list.clear();

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

        // Also add to FragmentsManager for highlighter to work
        const fragmentsManager = components.get(OBC.FragmentsManager);
        const fragmentsModel = await fragmentsManager.core.load(fragmentBytes, { modelId });
        fragmentsModel.useCamera(camera);
        fragmentsManager.core.update(true);

        // Fit camera to model
        const box = new THREE.Box3();
        box.setFromObject(model.object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
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
            Click on elements in the 3D view to see their properties in the side panel
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
