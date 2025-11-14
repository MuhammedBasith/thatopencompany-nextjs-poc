"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import Stats from "stats.js";
import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";

export default function WorldPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || isInitialized.current || !isReady) return;

    isInitialized.current = true;
    const container = containerRef.current;

    // Creating a components instance
    const components = new OBC.Components();

    // Setting up the world
    const worlds = components.get(OBC.Worlds);

    const world = worlds.create<
      OBC.SimpleScene,
      OBC.SimpleCamera,
      OBC.SimpleRenderer
    >();

    world.scene = new OBC.SimpleScene(components);
    world.renderer = new OBC.SimpleRenderer(components, container);
    world.camera = new OBC.SimpleCamera(components);

    components.init();

    // Setup scene with lights
    world.scene.setup();

    // Make the background transparent
    world.scene.three.background = null;

    // Add grid helper
    const gridSize = 100;
    const gridDivisions = 100;
    const gridHelper = new THREE.GridHelper(
      gridSize,
      gridDivisions,
      0x888888,
      0x444444
    );
    world.scene.three.add(gridHelper);

    // Load fragments model
    const workerUrl = "/resources/worker.mjs";
    const fragments = components.get(OBC.FragmentsManager);
    fragments.init(workerUrl);

    world.camera.controls.addEventListener("rest", () =>
      fragments.core.update(true)
    );

    fragments.list.onItemSet.add(({ value: model }) => {
      model.useCamera(world.camera.three);
      world.scene.three.add(model.object);
      fragments.core.update(true);
    });

    const fragPaths = [
      "https://thatopen.github.io/engine_components/resources/frags/school_arq.frag",
    ];

    Promise.all(
      fragPaths.map(async (path) => {
        const modelId = path.split("/").pop()?.split(".").shift();
        if (!modelId) return null;
        const file = await fetch(path);
        const buffer = await file.arrayBuffer();
        return fragments.core.load(buffer, { modelId });
      })
    ).then(() => {
      // Make the camera look at the model
      world.camera.controls.setLookAt(68, 23, -8.5, 21.5, -5.5, 23);
      fragments.core.update(true);
    });

    // Initialize UI Manager
    BUI.Manager.init();

    // Create UI panel
    const panel = BUI.Component.create<BUI.PanelSection>(() => {
      return BUI.html`
        <bim-panel label="Worlds Tutorial" class="options-menu">
          <bim-panel-section label="Controls">

            <bim-color-input
              label="Background Color" color="#202932"
              @input="${({ target }: { target: BUI.ColorInput }) => {
                world.scene.config.backgroundColor = new THREE.Color(target.color);
              }}">
            </bim-color-input>

            <bim-number-input
              slider step="0.1" label="Directional lights intensity" value="1.5" min="0.1" max="10"
              @change="${({ target }: { target: BUI.NumberInput }) => {
                world.scene.config.directionalLight.intensity = target.value;
              }}">
            </bim-number-input>

            <bim-number-input
              slider step="0.1" label="Ambient light intensity" value="1" min="0.1" max="5"
              @change="${({ target }: { target: BUI.NumberInput }) => {
                world.scene.config.ambientLight.intensity = target.value;
              }}">
            </bim-number-input>

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

  return (
    <div
      id="container"
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    />
  );
}
