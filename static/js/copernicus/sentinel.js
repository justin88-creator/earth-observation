
/* =========================================================
   COPERNICUS SENTINEL-2 IMAGERY CONTROLLER
   static/js/copernicus/sentinel.js
========================================================= */

const Cesium = window.Cesium;

const DEFAULT_WMS =
    "https://sh.dataspace.copernicus.eu/ogc/wms";

const PRODUCTS = Object.freeze({
    natural: "NATURAL-COLOR",
    ndvi: "NDVI",
    moisture: "MOISTURE-INDEX",
    agriculture: "AGRICULTURE",
    falseColor: "FALSE-COLOR",
    urban: "FALSE-COLOR-URBAN",
    geology: "GEOLOGY",
    swir: "SWIR"
});

const ENABLE_HEIGHT = 60000;
const DISABLE_HEIGHT = 90000;

let viewer = null;
let instanceId = "";
let wmsUrl = DEFAULT_WMS;

let imageryLayer = null;
let provider = null;

let initialized = false;
let enabled = false;

let currentProduct = "natural";
let opacity = 0.7;

let loading = false;
let dateRange = null;

const boundElements = new WeakSet();


/* =========================================================
   DOM HELPERS
========================================================= */

function element(id) {
    return document.getElementById(id);
}

function setStatus(message) {
    const target = element("mapStatusText");

    if (target) {
        target.textContent = message;
    }

    console.log("🛰️", message);
}

function setSatelliteStatus(message) {
    const target =
        element("sentinelStatus");

    if (!target) return;

    target.textContent = message;

    target.classList.toggle(
        "online",
        message === "ON"
    );

    target.classList.toggle(
        "offline",
        message !== "ON"
    );
}

function clamp(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return opacity;
    }

    return Math.max(0, Math.min(1, number));
}


/* =========================================================
   DATE UTILITIES
========================================================= */

function formatDate(date) {
    return date.toISOString().slice(0, 10);
}

function defaultDates() {
    const end = new Date();
    const start = new Date(end);

    start.setUTCDate(start.getUTCDate() - 90);

    return {
        startDate: formatDate(start),
        endDate: formatDate(end)
    };
}

function validateDateRange(startDate, endDate) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;

    if (
        !regex.test(startDate) ||
        !regex.test(endDate)
    ) {
        throw new Error(
            "Dates must use YYYY-MM-DD."
        );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime()) ||
        start.toISOString().slice(0, 10) !== startDate ||
        end.toISOString().slice(0, 10) !== endDate ||
        start > end
    ) {
        throw new Error(
            "Invalid satellite date range."
        );
    }
}


/* =========================================================
   PRODUCT HELPERS
========================================================= */

function normalizeProduct(product) {
    if (PRODUCTS[product]) {
        return product;
    }

    const found = Object.keys(PRODUCTS).find(
        key => PRODUCTS[key] === product
    );

    if (!found) {
        throw new Error(
            `Unknown Copernicus product: ${product}`
        );
    }

    return found;
}

function getEndpoint() {
    if (!instanceId) {
        throw new Error(
            "Copernicus instance ID is missing."
        );
    }

    const base = wmsUrl.replace(/\/+$/, "");

    if (base.endsWith(`/${instanceId}`)) {
        return base;
    }

    return (
        `${base}/${encodeURIComponent(instanceId)}`
    );
}


/* =========================================================
   INITIALIZATION
========================================================= */

export function initializeSentinel(
    cesiumViewer,
    configuration = {}
) {
    if (!Cesium || !cesiumViewer) {
        throw new Error(
            "Cesium viewer is required."
        );
    }

    const config =
        typeof configuration === "string"
            ? {
                copernicusInstanceId:
                    configuration
            }
            : configuration || {};

    const nextInstanceId = String(
        config.copernicusInstanceId || ""
    ).trim();

    if (!nextInstanceId) {
        console.warn(
            "⚠️ Copernicus instance ID missing."
        );

        setSatelliteStatus("ERROR");

        return;
    }

    if (initialized) {
        disposeSentinel();
    }

    viewer = cesiumViewer;

    instanceId = nextInstanceId;

    wmsUrl = String(
        config.copernicusUrl || DEFAULT_WMS
    ).trim();

    dateRange = defaultDates();

    initialized = true;

    connectControls();

    viewer.camera.moveEnd.addEventListener(
        evaluateSentinel
    );

    syncControls();

    setSatelliteStatus("OFF");

    console.log(
        "✅ Sentinel-2 initialized."
    );
}


/* =========================================================
   WMS PROVIDER
========================================================= */

function createProvider() {
    const { startDate, endDate } = dateRange;

    validateDateRange(startDate, endDate);

    const imageryProvider =
        new Cesium.WebMapServiceImageryProvider({
            url: getEndpoint(),

            layers: PRODUCTS[currentProduct],

            parameters: {
                service: "WMS",
                version: "1.1.1",
                format: "image/png",
                transparent: true,
                styles: "",
                time: `${startDate}/${endDate}`,
                maxcc: 80,
                priority: "leastCC",
                showlogo: false
            },

            tilingScheme:
                new Cesium.GeographicTilingScheme(),

            minimumLevel: 8,
            maximumLevel: 18,

            enablePickFeatures: false,

            credit: "Copernicus Sentinel-2"
        });

    imageryProvider.errorEvent.addEventListener(
        error => {
            console.error(
                "❌ Sentinel WMS tile error:",
                error
            );

            setSatelliteStatus("ERROR");

            setStatus(
                "Sentinel-2 imagery request failed"
            );
        }
    );

    return imageryProvider;
}


/* =========================================================
   LAYER MANAGEMENT
========================================================= */

function removeLayer() {
    if (
        imageryLayer &&
        viewer &&
        !viewer.isDestroyed()
    ) {
        viewer.imageryLayers.remove(
            imageryLayer,
            true
        );
    }

    imageryLayer = null;
    provider = null;
}

async function createLayer() {
    if (
        !initialized ||
        !enabled ||
        !viewer ||
        loading
    ) {
        return;
    }

    loading = true;

    setSatelliteStatus("LOADING");

    setStatus(
        `Loading ${PRODUCTS[currentProduct]}...`
    );

    try {
        provider = createProvider();

        imageryLayer =
            viewer.imageryLayers.addImageryProvider(
                provider
            );

        imageryLayer.alpha = opacity;
        imageryLayer.show = true;

        setSatelliteStatus("ON");

        setStatus(
            `${PRODUCTS[currentProduct]} imagery requested`
        );

    } catch (error) {
        console.error(
            "Sentinel layer creation failed:",
            error
        );

        setSatelliteStatus("ERROR");

        throw error;

    } finally {
        loading = false;
    }
}

async function evaluateSentinel() {
    if (
        !initialized ||
        !viewer ||
        !enabled
    ) {
        return;
    }

    const height =
        viewer.camera.positionCartographic?.height;

    if (!Number.isFinite(height)) {
        return;
    }

    const currentlyVisible =
        Boolean(imageryLayer?.show);

    const threshold = currentlyVisible
        ? DISABLE_HEIGHT
        : ENABLE_HEIGHT;

    if (height > threshold) {
        if (imageryLayer) {
            imageryLayer.show = false;
        }

        setSatelliteStatus("READY");

        return;
    }

    if (imageryLayer) {
        imageryLayer.show = true;
        imageryLayer.alpha = opacity;

        setSatelliteStatus("ON");

        return;
    }

    await createLayer();
}


/* =========================================================
   ENABLE / DISABLE
========================================================= */

export async function enableSentinel() {
    if (!initialized) {
        throw new Error(
            "Sentinel controller is not initialized."
        );
    }

    enabled = true;

    syncControls();

    await evaluateSentinel();

    return getSentinelState();
}

export function disableSentinel() {
    enabled = false;

    if (imageryLayer) {
        imageryLayer.show = false;
    }

    syncControls();

    setSatelliteStatus("OFF");

    setStatus(
        "Sentinel-2 imagery disabled"
    );
}


/* =========================================================
   PRODUCT SELECTION
========================================================= */

export async function setSentinelProduct(
    product,
    options = {}
) {
    if (!initialized) {
        throw new Error(
            "Initialize Sentinel first."
        );
    }

    const requested =
        normalizeProduct(product);

    let changed =
        requested !== currentProduct;

    if (options.startDate || options.endDate) {
        const next = {
            startDate:
                options.startDate ||
                dateRange.startDate,

            endDate:
                options.endDate ||
                dateRange.endDate
        };

        validateDateRange(
            next.startDate,
            next.endDate
        );

        if (
            next.startDate !== dateRange.startDate ||
            next.endDate !== dateRange.endDate
        ) {
            dateRange = next;
            changed = true;
        }
    }

    currentProduct = requested;

    if (options.enable === true) {
        enabled = true;
    }

    if (changed) {
        removeLayer();
    }

    syncControls();

    if (enabled) {
        await evaluateSentinel();
    }

    return getSentinelState();
}


/* =========================================================
   OPACITY
========================================================= */

export function setSentinelOpacity(value) {
    opacity = clamp(value);

    if (imageryLayer) {
        imageryLayer.alpha = opacity;
    }

    syncControls();
}


/* =========================================================
   DATE RANGE
========================================================= */

export async function setSentinelDateRange(
    startDate,
    endDate
) {
    validateDateRange(startDate, endDate);

    if (
        dateRange.startDate === startDate &&
        dateRange.endDate === endDate
    ) {
        return;
    }

    dateRange = {
        startDate,
        endDate
    };

    removeLayer();

    if (enabled) {
        await evaluateSentinel();
    }
}


/* =========================================================
   SYNC HTML CONTROLS
========================================================= */

function syncControls() {
    const toggle = element("sentinelToggle");
    const productSelect = element("sentinelProduct");

    const slider = element("sentinelOpacity");
    const label = element("opacityValue");

    const trueColor = element("trueColorToggle");
    const ndvi = element("ndviToggle");
    const moisture = element("moistureToggle");

    if (toggle) {
        toggle.checked = enabled;
    }

    if (productSelect) {
        productSelect.value =
            PRODUCTS[currentProduct];
    }

    if (slider) {
        slider.value =
            String(Math.round(opacity * 100));
    }

    if (label) {
        label.textContent =
            `${Math.round(opacity * 100)}%`;
    }

    if (trueColor) {
        trueColor.checked =
            enabled &&
            currentProduct === "natural";
    }

    if (ndvi) {
        ndvi.checked =
            enabled &&
            currentProduct === "ndvi";
    }

    if (moisture) {
        moisture.checked =
            enabled &&
            currentProduct === "moisture";
    }
}


/* =========================================================
   CONNECT HTML CONTROLS
========================================================= */

function bindChange(id, handler) {
    const control = element(id);

    if (
        !control ||
        boundElements.has(control)
    ) {
        return;
    }

    boundElements.add(control);

    control.addEventListener(
        "change",
        async () => {
            try {
                await handler(control);
            } catch (error) {
                console.error(error);

                setStatus(error.message);

                syncControls();
            }
        }
    );
}

function connectControls() {

    // Master Sentinel toggle
    bindChange(
        "sentinelToggle",
        async control => {
            if (control.checked) {
                await enableSentinel();
            } else {
                disableSentinel();
            }
        }
    );

    // Product selector
    bindChange(
        "sentinelProduct",
        async control => {
            await setSentinelProduct(
                control.value,
                { enable: true }
            );
        }
    );

    // Natural Color
    bindChange(
        "trueColorToggle",
        async control => {
            if (control.checked) {
                await setSentinelProduct(
                    "natural",
                    { enable: true }
                );
            } else if (
                currentProduct === "natural"
            ) {
                disableSentinel();
            }
        }
    );

    // NDVI
    bindChange(
        "ndviToggle",
        async control => {
            if (control.checked) {
                await setSentinelProduct(
                    "ndvi",
                    { enable: true }
                );
            } else if (
                currentProduct === "ndvi"
            ) {
                disableSentinel();
            }
        }
    );

    // Moisture
    bindChange(
        "moistureToggle",
        async control => {
            if (control.checked) {
                await setSentinelProduct(
                    "moisture",
                    { enable: true }
                );
            } else if (
                currentProduct === "moisture"
            ) {
                disableSentinel();
            }
        }
    );

    const slider = element("sentinelOpacity");

    if (
        slider &&
        !boundElements.has(slider)
    ) {
        boundElements.add(slider);

        slider.addEventListener(
            "input",
            () => {
                setSentinelOpacity(
                    Number(slider.value) / 100
                );
            }
        );
    }

    console.log(
        "🎛️ Sentinel HTML controls connected."
    );
}


/* =========================================================
   PUBLIC STATE
========================================================= */

export function getSentinelState() {
    return {
        initialized,
        enabled,
        product: currentProduct,
        layerName: PRODUCTS[currentProduct],
        opacity,
        dateRange: dateRange
            ? { ...dateRange }
            : null,
        visible: Boolean(imageryLayer?.show),
        loading
    };
}


/* =========================================================
   CLEANUP
========================================================= */

export function disposeSentinel() {
    if (
        viewer &&
        !viewer.isDestroyed()
    ) {
        viewer.camera.moveEnd.removeEventListener(
            evaluateSentinel
        );
    }

    removeLayer();

    initialized = false;
    enabled = false;
    loading = false;

    viewer = null;
    instanceId = "";
}
