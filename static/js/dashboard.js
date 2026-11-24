
/* ==========================================
   GLOBAL EARTH OBSERVATION DASHBOARD
   static/js/dashboard.js
========================================== */

import { createEarth } from "./earth/viewer.js";
import { initializeImagery } from "./earth/imagery.js";
import { initializeCamera } from "./earth/camera.js";
import { initializeTerrain } from "./earth/terrain.js";

import { initializeControls } from "./ui/controls.js";
import { initializeSearch } from "./ui/search.js";

import { initializeSentinel } from "./copernicus/sentinel.js";
import { initializeNDVI } from "./earth/ndvi.js";

import { initializeWeather } from "./weather/weather.js";
import { initializeWeatherMarker } from "./weather/weather-marker.js";
import { initializeWeatherEffects } from "./weather/weather-effects.js";

import {
    initializeFlood,
    analyzeFlood,
    disableFlood
} from "./flood/flood.js";

const Cesium = window.Cesium;
const config = window.APP_CONFIG || {};

let viewer = null;
let initialized = false;
let activeMode = "earth";
let selectedLocation = null;
let floodReady = false;

function setStatus(message) {
    const status = document.getElementById("mapStatusText");

    if (status) {
        status.textContent = message;
    }
}

function setSystemStatus(message) {
    const status = document.getElementById("systemStatus");

    if (status) {
        status.textContent = message;
    }
}

async function initializeModule(name, callback) {
    try {
        await callback();
        console.log(`✅ ${name} initialized.`);
        return true;
    } catch (error) {
        console.error(`❌ ${name} failed:`, error);
        return false;
    }
}

function validLocation(location) {
    if (!location) return false;

    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);

    return (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
    );
}

function handleLocationSelected(location) {
    if (!validLocation(location)) {
        console.warn("Invalid selected location:", location);
        return;
    }

    selectedLocation = {
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        name: location.name || "Selected location"
    };

    console.log("📍 Dashboard location:", selectedLocation);

    if (activeMode === "flood") {
        runFloodAnalysis();
    }
}

async function runFloodAnalysis() {
    if (!floodReady) {
        setStatus("Flood monitoring is unavailable");
        return;
    }

    if (!selectedLocation) {
        const panel = document.getElementById("floodPanel");

        if (panel) panel.hidden = false;

        const location = document.getElementById("floodLocation");

        if (location) {
            location.textContent = "Search for a location";
        }

        setStatus("Select a location for flood screening");
        return;
    }

    try {
        setStatus(
            `Analyzing rainfall: ${selectedLocation.name}`
        );

        const result = await analyzeFlood(
            selectedLocation.latitude,
            selectedLocation.longitude,
            selectedLocation.name
        );

        if (result && activeMode === "flood") {
            setStatus(
                `Rainfall screening ready: ${result.location}`
            );
        }
    } catch (error) {
        console.error("Flood analysis failed:", error);

        if (activeMode === "flood") {
            setStatus(
                `Flood analysis failed: ${error.message}`
            );
        }
    }
}

function changeDashboardMode(mode) {
    const nextMode = String(mode || "earth").toLowerCase();

    activeMode = nextMode;

    console.log("🛰️ Dashboard mode:", activeMode);

    const floodPanel = document.getElementById("floodPanel");
    const weatherPanel = document.getElementById("weatherPanel");

    if (activeMode === "flood") {
        if (weatherPanel) weatherPanel.hidden = true;
        if (floodPanel) floodPanel.hidden = false;

        runFloodAnalysis();
    } else {
        disableFlood();

        if (floodPanel) floodPanel.hidden = true;

        if (activeMode !== "weather" && weatherPanel) {
            weatherPanel.hidden = true;
        }
    }
}

function connectDashboardEvents() {
    // IMPORTANT:
    // This is the event emitted by your uploaded search.js.
    window.addEventListener(
        "searched-location-selected",
        event => handleLocationSelected(event.detail)
    );

    // Also support other search modules using this name.
    window.addEventListener(
        "earth-location-selected",
        event => handleLocationSelected(event.detail)
    );

    window.addEventListener(
        "dashboard-mode-changed",
        event => {
            const detail = event.detail;

            const mode =
                typeof detail === "string"
                    ? detail
                    : detail?.mode || "earth";

            changeDashboardMode(mode);
        }
    );

    // Close flood panel without changing the active map.
    document.getElementById("floodClose")
        ?.addEventListener("click", () => {
            changeDashboardMode("earth");
        });
}

function initializeCoordinates() {
    if (!viewer || !Cesium) return;

    const latitudeElement =
        document.getElementById("latitudeValue");

    const longitudeElement =
        document.getElementById("longitudeValue");

    if (!latitudeElement && !longitudeElement) return;

    const handler = new Cesium.ScreenSpaceEventHandler(
        viewer.scene.canvas
    );

    handler.setInputAction(movement => {
        const position = viewer.camera.pickEllipsoid(
            movement.endPosition,
            viewer.scene.globe.ellipsoid
        );

        if (!position) return;

        const coordinates =
            Cesium.Cartographic.fromCartesian(position);

        const latitude =
            Cesium.Math.toDegrees(coordinates.latitude);

        const longitude =
            Cesium.Math.toDegrees(coordinates.longitude);

        if (latitudeElement) {
            latitudeElement.textContent = latitude.toFixed(4);
        }

        if (longitudeElement) {
            longitudeElement.textContent = longitude.toFixed(4);
        }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
}

async function initializeDashboard() {
    if (initialized) return;

    setSystemStatus("INITIALIZING");
    setStatus("Initializing Earth Observation Dashboard...");

    if (!Cesium) {
        console.error("CesiumJS is not loaded.");
        setSystemStatus("ERROR");
        return;
    }

    try {
        viewer = await createEarth(config.cesiumToken);

        if (!viewer) {
            throw new Error("Cesium viewer was not created.");
        }

        window.earthViewer = viewer;

        await initializeModule("Imagery", () =>
            initializeImagery(
                viewer,
                config.googleSatelliteAssetId
            )
        );

        await initializeModule("Camera", () =>
            initializeCamera(viewer)
        );

        await initializeModule("Terrain", () =>
            initializeTerrain(viewer)
        );

        await initializeModule("Sentinel", () =>
            initializeSentinel(viewer, config)
        );

        await initializeModule("NDVI", () =>
            initializeNDVI(viewer)
        );

        await initializeModule("Weather", () =>
            initializeWeather(viewer)
        );

        await initializeModule("Weather Marker", () =>
            initializeWeatherMarker(viewer)
        );

        await initializeModule("Weather Effects", () =>
            initializeWeatherEffects(viewer)
        );

        floodReady = await initializeModule("Flood", () =>
            initializeFlood(viewer)
        );

        // Connect events before search and controls become active.
        connectDashboardEvents();

        await initializeModule("Search", () =>
            initializeSearch(viewer)
        );

        await initializeModule("Controls", () =>
            initializeControls(viewer)
        );

        initializeCoordinates();

        initialized = true;

        setSystemStatus("ONLINE");
        setStatus("Earth Observation Dashboard ready");

        console.log("🌍 Dashboard initialized successfully.");

    } catch (error) {
        console.error("Dashboard initialization failed:", error);

        setSystemStatus("ERROR");
        setStatus(`Initialization error: ${error.message}`);
    }
}

export function getDashboardViewer() {
    return viewer;
}

export function isDashboardReady() {
    return initialized;
}

export function getDashboardMode() {
    return activeMode;
}

export function getSelectedLocation() {
    return selectedLocation;
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeDashboard,
        { once: true }
    );
} else {
    initializeDashboard();
}

