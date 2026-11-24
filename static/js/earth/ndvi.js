
/* =========================================================
   NDVI VEGETATION MONITOR
   static/js/earth/ndvi.js

   Uses the shared Sentinel-2 WMS controller.
========================================================= */

import {
    setSentinelProduct,
    setSentinelOpacity,
    getSentinelState
} from "../copernicus/sentinel.js";

const Cesium = window.Cesium;

let viewer = null;
let initialized = false;

let previousProduct = "natural";

const NDVI_RANGES = Object.freeze([
    {
        min: -1,
        max: 0,
        label: "Water / non-vegetated",
        color: "#64748b"
    },
    {
        min: 0,
        max: 0.2,
        label: "Bare soil / sparse vegetation",
        color: "#d97706"
    },
    {
        min: 0.2,
        max: 0.4,
        label: "Low vegetation",
        color: "#eab308"
    },
    {
        min: 0.4,
        max: 0.6,
        label: "Moderate vegetation",
        color: "#84cc16"
    },
    {
        min: 0.6,
        max: 1,
        label: "Dense green vegetation",
        color: "#15803d"
    }
]);


/* =========================================================
   INITIALIZATION
========================================================= */

export function initializeNDVI(cesiumViewer) {
    if (!Cesium || !cesiumViewer) {
        throw new Error(
            "A valid Cesium viewer is required."
        );
    }

    viewer = cesiumViewer;
    initialized = true;

    console.log(
        "🌱 NDVI vegetation monitor initialized."
    );
}


/* =========================================================
   ENABLE NDVI
========================================================= */

export async function enableNDVI({
    instanceId,
    startDate,
    endDate
} = {}) {
    if (!initialized || !viewer) {
        throw new Error(
            "Initialize NDVI before enabling it."
        );
    }

    // Sentinel initialization and configuration
    // are handled by dashboard.js.
    // Keep instanceId for compatibility with
    // the existing dashboard API.

    if (!instanceId) {
        throw new Error(
            "Copernicus instance ID is missing."
        );
    }

    if (!startDate || !endDate) {
        throw new Error(
            "Select a valid satellite date range."
        );
    }

    if (startDate > endDate) {
        throw new Error(
            "Start date cannot exceed end date."
        );
    }

    const current = getSentinelState();

    if (!current.initialized) {
        throw new Error(
            "Sentinel controller is not initialized."
        );
    }

    if (current.product !== "ndvi") {
        previousProduct = current.product;
    }

    const result = await setSentinelProduct(
        "ndvi",
        {
            startDate,
            endDate,
            enable: true
        }
    );

    console.log(
        "🌱 NDVI imagery requested."
    );

    document.dispatchEvent(
        new CustomEvent("ndvi:enabled", {
            detail: result
        })
    );

    return result;
}


/* =========================================================
   DISABLE NDVI
========================================================= */

export async function disableNDVI() {
    if (!initialized) return;

    const current = getSentinelState();

    if (current.product !== "ndvi") {
        return;
    }

    // Return to the previously selected product.
    // This keeps satellite observation enabled.

    const fallback =
        previousProduct === "ndvi"
            ? "natural"
            : previousProduct;

    await setSentinelProduct(fallback);

    console.log(
        "🌱 NDVI disabled. Previous imagery restored."
    );

    document.dispatchEvent(
        new CustomEvent("ndvi:disabled")
    );
}


/* =========================================================
   OPACITY
========================================================= */

export function setNDVIOpacity(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return;
    }

    const opacity =
        Cesium.Math.clamp(number, 0, 1);

    setSentinelOpacity(opacity);
}


/* =========================================================
   NDVI STATE
========================================================= */

export function isNDVIEnabled() {
    const current = getSentinelState();

    return (
        initialized &&
        current.enabled &&
        current.product === "ndvi"
    );
}

export function isNDVIVisible() {
    const current = getSentinelState();

    return (
        isNDVIEnabled() &&
        current.visible
    );
}


/* =========================================================
   NDVI CLASSIFICATION
========================================================= */

export function classifyNDVI(value) {
    const number = Number(value);

    if (
        !Number.isFinite(number) ||
        number < -1 ||
        number > 1
    ) {
        return null;
    }

    const category = NDVI_RANGES.find(
        range =>
            number >= range.min &&
            (
                number < range.max ||
                (range.max === 1 && number <= 1)
            )
    );

    return category
        ? { ...category }
        : null;
}


/* =========================================================
   NDVI FORMULA
========================================================= */

export function calculateNDVI(
    nearInfrared,
    red
) {
    const nir = Number(nearInfrared);
    const redBand = Number(red);

    if (
        !Number.isFinite(nir) ||
        !Number.isFinite(redBand)
    ) {
        return null;
    }

    const denominator = nir + redBand;

    if (denominator === 0) {
        return null;
    }

    const ndvi =
        (nir - redBand) / denominator;

    return ndvi >= -1 && ndvi <= 1
        ? ndvi
        : null;
}


/* =========================================================
   NDVI LEGEND
========================================================= */

export function getNDVILegend() {
    return NDVI_RANGES.map(
        range => ({ ...range })
    );
}


/* =========================================================
   CLEANUP
========================================================= */

export function disposeNDVI() {
    viewer = null;
    initialized = false;
}
