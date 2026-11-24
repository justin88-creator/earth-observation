
/* ============================================
   EARTH OBSERVATION DASHBOARD CONTROLS
   static/js/ui/controls.js
============================================ */

import {
    enableWeatherMode,
    disableWeatherMode
} from "../weather/weather-state.js";

import {
    setSentinelProduct,
    enableSentinel,
    disableSentinel
} from "../copernicus/sentinel.js";

const Cesium = window.Cesium;

let viewer = null;
let initialized = false;

const boundElements = new WeakSet();
const $ = id => document.getElementById(id);

const HOME = {
    longitude: 8.6753,
    latitude: 9.0820,
    height: 5000000
};

/* ============================================
   HELPERS
============================================ */

function setStatus(message) {
    const target = $("mapStatusText");

    if (target) {
        target.textContent = message;
    }

    console.log("ℹ️", message);
}

function bind(id, event, callback) {
    const node = $(id);

    if (!node || boundElements.has(node)) {
        return;
    }

    boundElements.add(node);
    node.addEventListener(event, callback);
}

function isViewerReady() {
    return Boolean(
        viewer &&
        !viewer.isDestroyed()
    );
}

function activateNavigation(id) {
    document.querySelectorAll(
        ".nav-item[data-mode]"
    ).forEach(button => {
        button.classList.toggle(
            "active",
            button.id === id
        );
    });
}

function notifyMode(mode) {
    window.dispatchEvent(
        new CustomEvent("dashboard-mode-changed", {
            detail: { mode }
        })
    );
}

function closeSidebar() {
    $("sidebar")?.classList.remove("open");
    $("menuOverlay")?.classList.remove("active");
}

async function safeAction(name, callback) {
    try {
        await callback();
    } catch (error) {
        console.error(`${name} error:`, error);
        setStatus(`${name}: ${error.message}`);
    }
}

/* ============================================
   CAMERA TOOLS
============================================ */

export function zoomIn() {
    if (!isViewerReady()) return;

    const height =
        viewer.camera.positionCartographic.height;

    viewer.camera.zoomIn(
        Math.max(height * 0.35, 100)
    );

    viewer.scene.requestRender();
}

export function zoomOut() {
    if (!isViewerReady()) return;

    const height =
        viewer.camera.positionCartographic.height;

    viewer.camera.zoomOut(
        Math.max(height * 0.35, 100)
    );

    viewer.scene.requestRender();
}

export function homeView() {
    if (!isViewerReady()) return;

    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
            HOME.longitude,
            HOME.latitude,
            HOME.height
        ),
        duration: 1.5
    });
}

export function resetNorth() {
    if (!isViewerReady()) return;

    const camera = viewer.camera;

    const position = Cesium.Cartographic.fromCartesian(
        camera.positionWC
    );

    if (!position) return;

    camera.flyTo({
        destination: Cesium.Cartesian3.fromRadians(
            position.longitude,
            position.latitude,
            Math.max(position.height, 100)
        ),
        orientation: {
            heading: 0,
            pitch: camera.pitch,
            roll: 0
        },
        duration: 1.2
    });
}

function connectMapToolbar() {
    bind("zoomInButton", "click", zoomIn);
    bind("zoomOutButton", "click", zoomOut);
    bind("homeButton", "click", homeView);
    bind("northButton", "click", resetNorth);

    console.log("🗺️ Map toolbar buttons connected.");
}

/* ============================================
   NAVIGATION
============================================ */

function connectNavigation() {

    // EARTH
    bind("earthNav", "click", () => {
        activateNavigation("earthNav");
        disableWeatherMode();
        notifyMode("earth");
        closeSidebar();
        setStatus("Earth exploration mode active");
    });

    // AGRICULTURE
    bind("agricultureNav", "click", () => {
        safeAction("Agriculture", async () => {
            activateNavigation("agricultureNav");
            disableWeatherMode();
            notifyMode("agriculture");

            await setSentinelProduct(
                "agriculture",
                { enable: true }
            );

            closeSidebar();
            setStatus(
                "Agriculture imagery selected. Zoom into farmland."
            );
        });
    });

    // FLOOD
    bind("floodNav", "click", () => {
        activateNavigation("floodNav");
        disableWeatherMode();
        notifyMode("flood");
        closeSidebar();

        setStatus(
            "Flood monitoring active. Search for a location."
        );

        $("locationSearch")?.focus();

        console.log("🌊 Flood monitoring selected.");
    });

    // WEATHER
    bind("weatherNav", "click", () => {
        activateNavigation("weatherNav");
        enableWeatherMode();
        notifyMode("weather");
        closeSidebar();

        setStatus(
            "Weather mode active. Search for a location."
        );

        $("locationSearch")?.focus();
    });

    // VEGETATION
    bind("vegetationNav", "click", () => {
        safeAction("Vegetation", async () => {
            activateNavigation("vegetationNav");
            disableWeatherMode();
            notifyMode("vegetation");

            await setSentinelProduct(
                "ndvi",
                { enable: true }
            );

            closeSidebar();

            setStatus(
                "NDVI vegetation imagery selected."
            );
        });
    });

    console.log("🧭 Navigation buttons connected.");
}

/* ============================================
   SIDEBAR
============================================ */

function connectSidebar() {
    bind("menuButton", "click", () => {
        $("sidebar")?.classList.toggle("open");
        $("menuOverlay")?.classList.toggle("active");
    });

    bind("menuOverlay", "click", closeSidebar);

    console.log("📱 Sidebar controls connected.");
}

/* ============================================
   LAYER PANEL
============================================ */

function connectLayerPanel() {
    bind("layersButton", "click", () => {
        const panel = $("layerPanel");

        if (!panel) return;

        panel.hidden = !panel.hidden;

        if (!panel.hidden) {
            panel.classList.remove("collapsed");
        }
    });

    bind("layerCollapse", "click", () => {
        const panel = $("layerPanel");

        if (!panel) return;

        panel.classList.toggle("collapsed");
    });

    console.log("🗂️ Map layer panel connected.");
}

/* ============================================
   TERRAIN TOGGLE
============================================ */

function connectTerrainToggle() {
    bind("terrainToggle", "change", async () => {
        if (!isViewerReady()) return;

        const toggle = $("terrainToggle");

        try {
            if (toggle.checked) {
                viewer.terrainProvider =
                    await Cesium.createWorldTerrainAsync();
            } else {
                viewer.terrainProvider =
                    new Cesium.EllipsoidTerrainProvider();
            }

            setStatus(
                toggle.checked
                    ? "Terrain enabled"
                    : "Terrain disabled"
            );
        } catch (error) {
            console.error("Terrain error:", error);
            toggle.checked = false;
        }
    });
}

/* ============================================
   KEYBOARD SHORTCUTS
============================================ */

function connectKeyboardControls() {
    if (window.__earthKeyboardBound) return;

    window.__earthKeyboardBound = true;

    document.addEventListener("keydown", event => {
        const target = event.target;

        if (
            target?.matches?.(
                "input, textarea, select"
            ) ||
            target?.isContentEditable ||
            event.ctrlKey ||
            event.altKey ||
            event.metaKey
        ) {
            return;
        }

        switch (event.key) {
            case "+":
            case "=":
                event.preventDefault();
                zoomIn();
                break;

            case "-":
                event.preventDefault();
                zoomOut();
                break;

            case "Home":
                event.preventDefault();
                homeView();
                break;

            case "n":
            case "N":
                resetNorth();
                break;
        }
    });

    console.log("⌨️ Keyboard shortcuts connected.");
}

/* ============================================
   INITIALIZATION
============================================ */

export function initializeControls(cesiumViewer) {
    if (!Cesium || !cesiumViewer) {
        throw new Error(
            "A valid Cesium viewer is required."
        );
    }

    if (initialized && viewer === cesiumViewer) {
        return;
    }

    viewer = cesiumViewer;
    initialized = true;

    connectNavigation();
    connectMapToolbar();
    connectSidebar();
    connectLayerPanel();
    connectTerrainToggle();
    connectKeyboardControls();

    console.log(
        "🎛️ Dashboard controls connected to dashboard.html"
    );
}
