// static/js/copernicus/copernicus.js

import {
    getViewer,
    setBaseImageryOpacity
} from "../earth/viewer.js";


let instanceId = null;


const layers = new Map();


// =========================================================
// INITIALIZE COPERNICUS
// =========================================================

export function initializeCopernicus(
    sentinelInstanceId
) {

    if (!sentinelInstanceId) {

        console.error(
            "❌ Copernicus instance ID missing."
        );

        return false;
    }


    instanceId =
        sentinelInstanceId.trim();


    console.log(
        "🛰️ Copernicus connected."
    );


    return true;
}


// =========================================================
// ENDPOINTS
// =========================================================

export function getWmsEndpoint() {

    if (!instanceId) {

        throw new Error(
            "Copernicus has not been initialized."
        );
    }


    return (
        "https://sh.dataspace.copernicus.eu/" +
        "ogc/wms/" +
        instanceId
    );
}


export function getWmtsEndpoint() {

    if (!instanceId) {

        throw new Error(
            "Copernicus has not been initialized."
        );
    }


    return (
        "https://sh.dataspace.copernicus.eu/" +
        "ogc/wmts/" +
        instanceId
    );
}


// =========================================================
// REGISTER LAYER
// =========================================================

export function registerLayer(
    name,
    layer
) {

    if (!name || !layer) {
        return;
    }


    layers.set(
        name,
        layer
    );
}


// =========================================================
// GET LAYER
// =========================================================

export function getLayer(name) {

    return (
        layers.get(name) || null
    );
}


// =========================================================
// REMOVE LAYER
// =========================================================

export function removeLayer(name) {

    const viewer =
        getViewer();


    const layer =
        layers.get(name);


    if (!layer) {
        return;
    }


    viewer.imageryLayers.remove(
        layer,
        true
    );


    layers.delete(name);
}


// =========================================================
// REMOVE ALL COPERNICUS LAYERS
// =========================================================

export function removeAllCopernicusLayers() {

    const viewer =
        getViewer();


    for (
        const layer of layers.values()
    ) {

        viewer.imageryLayers.remove(
            layer,
            true
        );
    }


    layers.clear();


    setBaseImageryOpacity(1);


    console.log(
        "🛰️ Copernicus layers cleared."
    );
}