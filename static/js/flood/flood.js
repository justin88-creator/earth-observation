
/* ==========================================
   FLOOD MONITORING SYSTEM
   static/js/flood/flood.js
========================================== */

const Cesium = window.Cesium;

const API_URL = "https://api.open-meteo.com/v1/forecast";

let viewer = null;
let floodEntity = null;
let requestNumber = 0;

function element(id) {
    return document.getElementById(id);
}

function setText(id, value) {
    const target = element(id);
    if (target) target.textContent = value;
}

// These are illustrative rainfall bands,
// NOT validated flood-risk thresholds.
function classifyRainfall(mm) {
    if (mm >= 50) {
        return {
            level: "HIGH",
            color: Cesium.Color.RED
        };
    }

    if (mm >= 20) {
        return {
            level: "ELEVATED",
            color: Cesium.Color.ORANGE
        };
    }

    return {
        level: "LOW",
        color: Cesium.Color.LIME
    };
}

export function initializeFlood(cesiumViewer) {
    if (!Cesium || !cesiumViewer) {
        throw new Error("Cesium viewer is required.");
    }

    viewer = cesiumViewer;

    console.log("🌊 Flood monitoring initialized.");
}

export function disableFlood() {
    requestNumber++;

    if (viewer && !viewer.isDestroyed() && floodEntity) {
        viewer.entities.remove(floodEntity);
    }

    floodEntity = null;

    const panel = element("floodPanel");
    if (panel) panel.hidden = true;
}

function showLoading(locationName) {
    const panel = element("floodPanel");
    if (panel) panel.hidden = false;

    setText("floodLocation", locationName);
    setText("floodRisk", "ANALYZING...");
    setText("floodRainfall", "Loading...");
    setText("floodElevation", "Loading...");
}

function showError(locationName, message) {
    const panel = element("floodPanel");
    if (panel) panel.hidden = false;

    setText("floodLocation", locationName);
    setText("floodRisk", "UNAVAILABLE");
    setText("floodRainfall", "Unavailable");
    setText("floodElevation", "Unavailable");

    console.error("🌊 Flood monitoring:", message);
}

export async function analyzeFlood(
    latitude,
    longitude,
    locationName = "Selected location"
) {
    if (!viewer || viewer.isDestroyed()) {
        throw new Error("Initialize flood monitoring first.");
    }

    const lat = Number(latitude);
    const lon = Number(longitude);

    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon) ||
        lat < -90 ||
        lat > 90 ||
        lon < -180 ||
        lon > 180
    ) {
        throw new Error("Invalid coordinates.");
    }

    const currentRequest = ++requestNumber;

    showLoading(locationName);

    const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lon),
        daily: "precipitation_sum",
        past_days: "7",
        forecast_days: "1",
        timezone: "auto"
    });

    try {
        const response = await fetch(
            `${API_URL}?${params}`
        );

        if (!response.ok) {
            throw new Error(
                `Open-Meteo HTTP ${response.status}`
            );
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(
                data.reason || "Open-Meteo API error"
            );
        }

        if (currentRequest !== requestNumber) {
            return null;
        }

        const dates = data.daily?.time;
        const values = data.daily?.precipitation_sum;

        if (!Array.isArray(dates) || !Array.isArray(values)) {
            throw new Error("Rainfall data is missing.");
        }

        // Compare date strings in the location's timezone.
        const today = new Intl.DateTimeFormat("en-CA", {
            timeZone: data.timezone || "UTC",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        });

        const dateParts = today.formatToParts(new Date());

        const year = dateParts.find(p => p.type === "year").value;
        const month = dateParts.find(p => p.type === "month").value;
        const day = dateParts.find(p => p.type === "day").value;

        const currentDate = `${year}-${month}-${day}`;

        let rainfall = 0;
        let validDays = 0;

        for (let i = 0; i < dates.length; i++) {
            if (dates[i] >= currentDate) continue;

            const value = values[i];

            if (value === null || value === undefined) {
                continue;
            }

            const numericValue = Number(value);

            if (Number.isFinite(numericValue)) {
                rainfall += numericValue;
                validDays++;
            }
        }

        if (validDays !== 7) {
            throw new Error(
                `Expected 7 rainfall days, received ${validDays}.`
            );
        }

        const screening = classifyRainfall(rainfall);

        const elevation =
            typeof data.elevation === "number" &&
            Number.isFinite(data.elevation)
                ? data.elevation
                : null;

        const result = {
            location: locationName,
            latitude: lat,
            longitude: lon,
            rainfall7Days: rainfall,
            elevation,
            rainfallCategory: screening.level,
            dataSource: "Open-Meteo",
            screeningOnly: true
        };

        displayFloodPanel(result);
        displayFloodMarker(result, screening.color);

        console.log("🌊 Flood screening:", result);

        return result;

    } catch (error) {
        if (currentRequest !== requestNumber) {
            return null;
        }

        showError(locationName, error.message);

        throw error;
    }
}

function displayFloodPanel(result) {
    const panel = element("floodPanel");
    if (panel) panel.hidden = false;

    setText("floodLocation", result.location);
    setText("floodRisk", result.rainfallCategory);

    setText(
        "floodRainfall",
        `${result.rainfall7Days.toFixed(1)} mm`
    );

    setText(
        "floodElevation",
        result.elevation === null
            ? "Unavailable"
            : `${result.elevation.toFixed(0)} m`
    );
}

function displayFloodMarker(result, color) {
    if (!viewer || viewer.isDestroyed()) return;

    if (floodEntity) {
        viewer.entities.remove(floodEntity);
    }

    floodEntity = viewer.entities.add({
        name: "Rainfall screening location",

        position: Cesium.Cartesian3.fromDegrees(
            result.longitude,
            result.latitude
        ),

        point: {
            pixelSize: 14,
            color,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
            heightReference:
                Cesium.HeightReference.CLAMP_TO_GROUND
        },

        ellipse: {
            semiMajorAxis: 3000,
            semiMinorAxis: 3000,
            material: color.withAlpha(0.18),
            outline: true,
            outlineColor: color,
            heightReference:
                Cesium.HeightReference.CLAMP_TO_GROUND
        },

        description:
            `Previous 7 days rainfall: ${
                result.rainfall7Days.toFixed(1)
            } mm. Experimental rainfall screening only.`
    });

    viewer.scene.requestRender();
}
