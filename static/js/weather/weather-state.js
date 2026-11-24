// =========================================================
// static/js/weather/weather-state.js
// =========================================================
//
// Central state for Weather mode.
//
// Weather visualization is allowed ONLY when:
// 1. Weather mode is active.
// 2. A location was explicitly searched.
//
// =========================================================


let weatherModeActive = false;


// =========================================================
// ENABLE WEATHER MODE
// =========================================================

export function enableWeatherMode() {

    if (weatherModeActive) {
        return;
    }

    weatherModeActive = true;

    console.log("🌦️ Weather mode ON");

    window.dispatchEvent(
        new CustomEvent(
            "weather-mode-changed",
            {
                detail: {
                    active: true
                }
            }
        )
    );
}


// =========================================================
// DISABLE WEATHER MODE
// =========================================================

export function disableWeatherMode() {

    if (!weatherModeActive) {
        return;
    }

    weatherModeActive = false;

    console.log("🌦️ Weather mode OFF");

    window.dispatchEvent(
        new CustomEvent(
            "weather-mode-changed",
            {
                detail: {
                    active: false
                }
            }
        )
    );
}


// =========================================================
// CHECK WEATHER MODE
// =========================================================

export function isWeatherModeActive() {

    return weatherModeActive;
}


// =========================================================
// SET WEATHER MODE
// =========================================================

export function setWeatherMode(active) {

    if (active) {
        enableWeatherMode();
    } else {
        disableWeatherMode();
    }
}