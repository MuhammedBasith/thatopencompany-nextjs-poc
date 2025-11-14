"use client";

import { useEffect, useRef, useState } from "react";
import Stats from "stats.js";
import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";

export default function Views2DPage() {
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

    // Setting up a Simple Scene
    const components = new OBC.Components();

    const worlds = components.get(OBC.Worlds);
    const world = worlds.create<
      OBC.SimpleScene,
      OBC.OrthoPerspectiveCamera,
      OBC.SimpleRenderer
    >();

    world.scene = new OBC.SimpleScene(components);
    world.scene.setup();
    world.scene.three.background = null;

    world.renderer = new OBC.SimpleRenderer(components, container);
    world.camera = new OBC.OrthoPerspectiveCamera(components);
    world.camera.controls.setLookAt(78, 20, -2.2, 26, -4, 25);

    components.init();

    // Setting Up Fragments
    const workerUrl = "/resources/worker.mjs";
    const fragments = components.get(OBC.FragmentsManager);
    fragments.init(workerUrl);

    world.camera.controls.addEventListener("rest", () =>
      fragments.core.update(true)
    );

    world.onCameraChanged.add((camera) => {
      for (const [, model] of fragments.list) {
        model.useCamera(camera.three);
      }
      fragments.core.update(true);
    });

    fragments.list.onItemSet.add(({ value: model }) => {
      model.useCamera(world.camera.three);
      world.scene.three.add(model.object);
      fragments.core.update(true);
    });

    // Loading Fragments Models
    const fragPaths = [
      "https://thatopen.github.io/engine_components/resources/frags/school_arq.frag",
      "https://thatopen.github.io/engine_components/resources/frags/school_str.frag",
    ];

    Promise.all(
      fragPaths.map(async (path) => {
        const modelId = path.split("/").pop()?.split(".").shift();
        if (!modelId) return null;
        const file = await fetch(path);
        const buffer = await file.arrayBuffer();
        return fragments.core.load(buffer, { modelId });
      })
    ).then(async () => {
      // Using The Views Component
      const views = components.get(OBC.Views);

      // The range defines how far the view will "see"
      OBC.Views.defaultRange = 100;

      // Set the world for views
      views.world = world;

      // Creating Views From IFC Storeys
      await views.createFromIfcStoreys({ modelIds: [/arq/] });

      // Creating Elevation Views
      views.createElevations({ combine: true });

      // Creating Arbitrary Views
      const casters = components.get(OBC.Raycasters);
      const caster = casters.get(world);

      window.addEventListener("dblclick", async () => {
        const result = await caster.castRay();
        if (!result) return;
        const { normal, point } = result;
        if (!(normal && point)) return;
        // Invert the normal direction so the view looks inside
        const invertedNormal = normal.clone().negate();
        const view = views.create(
          invertedNormal,
          point.addScaledVector(normal, 1),
          {
            id: `View - ${views.list.size + 1}`,
            world,
          }
        );
        // You can specify a different range from the default once the view is created
        view.range = 10;
        // Displaying the helper is optional and recommended only for debugging
        view.helpersVisible = true;
      });

      // Adding UI
      BUI.Manager.init();

      type ViewsListTableData = {
        Name: string;
        Actions: string;
      };

      interface ViewsListState {
        components: OBC.Components;
      }

      const viewsTemplate: BUI.StatefullComponent<ViewsListState> = (
        state
      ) => {
        const { components } = state;
        const views = components.get(OBC.Views);

        const onCreated = (e?: Element) => {
          if (!e) return;
          const table = e as BUI.Table<ViewsListTableData>;
          table.data = [...views.list.keys()].map((key) => {
            return {
              data: {
                Name: key,
                Actions: "",
              },
            };
          });
        };

        return BUI.html`<bim-table ${BUI.ref(onCreated)}></bim-table>`;
      };

      const [viewsTable, updateViewsTable] = BUI.Component.create<
        BUI.Table<ViewsListTableData>,
        ViewsListState
      >(viewsTemplate, { components });

      viewsTable.headersHidden = true;
      viewsTable.noIndentation = true;
      viewsTable.columns = ["Name", { name: "Actions", width: "auto" }];

      viewsTable.dataTransform = {
        Actions: (_, rowData) => {
          const { Name } = rowData;
          if (!Name) return _;
          const views = components.get(OBC.Views);
          const view = views.list.get(Name);
          if (!view) return _;

          const onOpen = () => {
            views.open(Name);
          };

          const onRemove = () => {
            views.list.delete(Name);
          };

          return BUI.html`
            <bim-button label-hidden icon="solar:cursor-bold" label="Open" @click=${onOpen}></bim-button>
            <bim-button label-hidden icon="material-symbols:delete" label="Remove" @click=${onRemove}></bim-button>
          `;
        },
      };

      const updateFunction = () => updateViewsTable();
      views.list.onItemSet.add(updateFunction);
      views.list.onItemDeleted.add(updateFunction);
      views.list.onItemUpdated.add(updateFunction);
      views.list.onCleared.add(updateFunction);

      const panel = BUI.Component.create<BUI.PanelSection>(() => {
        const onCloseView = () => views.close();

        return BUI.html`
          <bim-panel active label="2D Views Tutorial" class="options-menu">
            <bim-panel-section label="Info">
              <bim-label style="width: 16rem; white-space: normal;" icon="noto-v1:light-bulb">Tip: Go inside the building and double click a wall to create a section</bim-label>
            </bim-panel-section>
            <bim-panel-section label="Views">
              <bim-button label="Close Active 2D View" @click=${onCloseView}></bim-button>
              ${viewsTable}
            </bim-panel-section>
          </bim-panel>
        `;
      });

      document.body.append(panel);

      // Mobile menu toggler
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

      // Measuring performance
      const stats = new Stats();
      stats.showPanel(2);
      document.body.append(stats.dom);
      stats.dom.style.left = "0px";
      stats.dom.style.zIndex = "unset";
      world.renderer.onBeforeUpdate.add(() => stats.begin());
      world.renderer.onAfterUpdate.add(() => stats.end());
    });

    // Cleanup function
    return () => {
      try {
        world.renderer?.dispose();
        components.dispose();
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
