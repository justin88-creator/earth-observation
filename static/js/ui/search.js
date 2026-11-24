// =========================================================
// static/js/ui/search.js
// =========================================================
//
// GLOBAL EARTH OBSERVATION — LOCATION SEARCH
//
// PRIMARY:
//   Geoapify
//
// FALLBACK:
//   OpenStreetMap Nominatim
//
// FEATURES:
//   ✓ Countries
//   ✓ States
//   ✓ Cities
//   ✓ Towns
//   ✓ Villages
//   ✓ Suburbs
//   ✓ Neighbourhoods
//   ✓ Streets
//   ✓ Addresses
//   ✓ Buildings / POIs where provider data supports them
//   ✓ Multiple result suggestions
//   ✓ Precise camera zoom
//   ✓ Exact location marker
//   ✓ Weather event integration
//
// =========================================================

const Cesium = window.Cesium;


// =========================================================
// STATE
// =========================================================

let viewer = null;
let initialized = false;

let searchController = null;

let searchInput = null;
let searchButton = null;
let suggestionsContainer = null;

let searchMarker = null;

let currentResults = [];


// =========================================================
// CONFIG
// =========================================================

const GEOAPIFY_URL =
    "https://api.geoapify.com/v1/geocode/search";

const NOMINATIM_URL =
    "https://nominatim.openstreetmap.org/search";

const RESULT_LIMIT = 10;


// =========================================================
// INITIALIZE
// =========================================================

export function initializeSearch(cesiumViewer) {

    if (initialized) {
        return;
    }


    if (!cesiumViewer) {

        throw new Error(
            "Cesium viewer is required by search.js"
        );
    }


    viewer = cesiumViewer;


    searchInput =
        document.getElementById(
            "locationSearch"
        );


    searchButton =
        document.getElementById(
            "searchButton"
        );


    if (!searchInput) {

        console.warn(
            "⚠️ #locationSearch not found."
        );

        return;
    }


    createSuggestionsContainer();


    // =====================================================
    // SEARCH BUTTON
    // =====================================================

    searchButton?.addEventListener(
        "click",
        () => {

            searchLocation(
                searchInput.value
            );
        }
    );


    // =====================================================
    // ENTER / ESCAPE
    // =====================================================

    searchInput.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                event.preventDefault();

                searchLocation(
                    searchInput.value
                );
            }


            if (event.key === "Escape") {

                hideSuggestions();
            }
        }
    );


    // =====================================================
    // CLICK OUTSIDE
    // =====================================================

    document.addEventListener(
        "click",
        event => {

            if (
                !suggestionsContainer?.contains(
                    event.target
                ) &&
                event.target !== searchInput &&
                event.target !== searchButton
            ) {

                hideSuggestions();
            }
        }
    );


    initialized = true;


    console.log(
        "🔎 Geoapify worldwide search ready."
    );
}


// =========================================================
// SEARCH
// =========================================================

export async function searchLocation(query) {

    query =
        String(
            query || ""
        ).trim();


    if (!query) {

        setStatus(
            "Enter a location"
        );

        return;
    }


    // =====================================================
    // CANCEL PREVIOUS REQUEST
    // =====================================================

    searchController?.abort();


    searchController =
        new AbortController();


    hideSuggestions();


    setStatus(
        `Searching ${query}...`
    );


    console.log(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );


    console.log(
        "🔎 Searching:",
        query
    );


    try {

        // =================================================
        // GEOAPIFY FIRST
        // =================================================

        let results = [];


        const geoapifyKey =
            getGeoapifyKey();


        if (geoapifyKey) {

            try {

                results =
                    await searchGeoapify(
                        query,
                        geoapifyKey,
                        searchController.signal
                    );


                console.log(
                    `🌍 Geoapify returned ${results.length} result(s).`
                );

            }

            catch (error) {

                if (
                    error.name ===
                    "AbortError"
                ) {

                    throw error;
                }


                console.warn(
                    "⚠️ Geoapify search failed:",
                    error
                );
            }

        } else {

            console.warn(
                "⚠️ Geoapify API key not available in frontend config."
            );
        }


        // =================================================
        // NOMINATIM FALLBACK
        // =================================================

        if (results.length === 0) {

            console.log(
                "🔄 Trying OpenStreetMap fallback..."
            );


            results =
                await searchNominatim(
                    query,
                    searchController.signal
                );


            console.log(
                `🗺️ Nominatim returned ${results.length} result(s).`
            );
        }


        // =================================================
        // NOTHING FOUND
        // =================================================

        if (results.length === 0) {

            setStatus(
                `Location not found: ${query}`
            );


            console.warn(
                "⚠️ Location not found:",
                query
            );


            return;
        }


        // =================================================
        // REMOVE DUPLICATES
        // =================================================

        results =
            removeDuplicates(
                results
            );


        // =================================================
        // RANK
        // =================================================

        results =
            rankResults(
                results,
                query
            );


        currentResults =
            results.slice(
                0,
                RESULT_LIMIT
            );


        console.log(
            `📍 ${currentResults.length} candidate(s) available.`
        );


        // =================================================
        // AUTO SELECT
        //
        // Only automatically select when there is literally
        // one result.
        //
        // Otherwise user chooses the precise place.
        // =================================================

        if (
            currentResults.length === 1
        ) {

            selectResult(
                currentResults[0],
                query
            );


            return;
        }


        showSuggestions(
            currentResults,
            query
        );


        setStatus(
            `Select the correct location for "${query}"`
        );

    }

    catch (error) {

        if (
            error.name ===
            "AbortError"
        ) {

            return;
        }


        console.error(
            "❌ Search error:",
            error
        );


        setStatus(
            "Location search failed"
        );
    }
}


// =========================================================
// GEOAPIFY SEARCH
// =========================================================

async function searchGeoapify(
    query,
    apiKey,
    signal
) {

    const params =
        new URLSearchParams({

            text:
                query,

            format:
                "json",

            limit:
                String(
                    RESULT_LIMIT
                ),

            apiKey
        });


    const response =
        await fetch(
            `${GEOAPIFY_URL}?${params}`,
            {
                headers: {

                    Accept:
                        "application/json"
                },

                signal
            }
        );


    if (!response.ok) {

        throw new Error(
            `Geoapify returned HTTP ${response.status}`
        );
    }


    const data =
        await response.json();


    const rawResults =
        Array.isArray(data.results)
            ? data.results
            : [];


    return rawResults
        .map(
            result =>
                normalizeGeoapifyResult(
                    result
                )
        )
        .filter(Boolean);
}


// =========================================================
// NORMALIZE GEOAPIFY
// =========================================================

function normalizeGeoapifyResult(
    result
) {

    const latitude =
        Number(
            result.lat
        );


    const longitude =
        Number(
            result.lon
        );


    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
    ) {

        return null;
    }


    const categories =
        Array.isArray(
            result.category
        )
            ? result.category
            : [];


    let type =
        result.result_type ||
        result.type ||
        "location";


    if (
        categories.some(
            category =>
                category.includes(
                    "building"
                )
        )
    ) {

        type =
            "building";
    }


    return {

        provider:
            "geoapify",

        lat:
            latitude,

        lon:
            longitude,

        name:

            result.name ||

            result.address_line1 ||

            result.city ||

            result.suburb ||

            result.county ||

            result.state ||

            result.country ||

            "Location",

        displayName:

            result.formatted ||

            [
                result.address_line1,
                result.address_line2
            ]
                .filter(Boolean)
                .join(", "),

        type,

        class:

            getGeoapifyClass(
                result
            ),

        importance:

            Number(
                result.rank?.importance
            ) || 0,

        address: {

            houseNumber:
                result.housenumber,

            street:
                result.street,

            neighbourhood:
                result.neighbourhood,

            suburb:
                result.suburb,

            district:
                result.district,

            city:
                result.city,

            county:
                result.county,

            state:
                result.state,

            postcode:
                result.postcode,

            country:
                result.country,

            countryCode:
                result.country_code
        },

        boundingBox:
            normalizeGeoapifyBoundingBox(
                result
            ),

        placeId:

            result.place_id ||
            null,

        raw:
            result
    };
}


// =========================================================
// GEOAPIFY CLASS
// =========================================================

function getGeoapifyClass(
    result
) {

    const type =
        String(
            result.result_type || ""
        ).toLowerCase();


    if (
        type === "amenity"
    ) {

        return "amenity";
    }


    if (
        type === "building"
    ) {

        return "building";
    }


    if (
        type === "street"
    ) {

        return "highway";
    }


    if (
        type === "postcode"
    ) {

        return "postcode";
    }


    return "place";
}


// =========================================================
// GEOAPIFY BOUNDING BOX
// =========================================================

function normalizeGeoapifyBoundingBox(
    result
) {

    const bbox =
        result.bbox;


    if (!bbox) {
        return null;
    }


    // Geoapify may return:
    //
    // lon1, lat1, lon2, lat2
    //
    // depending on response structure.


    if (
        Number.isFinite(
            Number(bbox.lon1)
        ) &&
        Number.isFinite(
            Number(bbox.lat1)
        ) &&
        Number.isFinite(
            Number(bbox.lon2)
        ) &&
        Number.isFinite(
            Number(bbox.lat2)
        )
    ) {

        return {

            west:
                Number(
                    bbox.lon1
                ),

            south:
                Number(
                    bbox.lat1
                ),

            east:
                Number(
                    bbox.lon2
                ),

            north:
                Number(
                    bbox.lat2
                )
        };
    }


    return null;
}


// =========================================================
// NOMINATIM FALLBACK
// =========================================================

async function searchNominatim(
    query,
    signal
) {

    const params =
        new URLSearchParams({

            q:
                query,

            format:
                "jsonv2",

            limit:
                String(
                    RESULT_LIMIT
                ),

            addressdetails:
                "1",

            namedetails:
                "1",

            dedupe:
                "1"
        });


    const response =
        await fetch(
            `${NOMINATIM_URL}?${params}`,
            {
                headers: {

                    Accept:
                        "application/json"
                },

                signal
            }
        );


    if (!response.ok) {

        throw new Error(
            `Nominatim returned HTTP ${response.status}`
        );
    }


    const data =
        await response.json();


    if (!Array.isArray(data)) {

        return [];
    }


    return data
        .map(
            result =>
                normalizeNominatimResult(
                    result
                )
        )
        .filter(Boolean);
}


// =========================================================
// NORMALIZE NOMINATIM
// =========================================================

function normalizeNominatimResult(
    result
) {

    const latitude =
        Number(
            result.lat
        );


    const longitude =
        Number(
            result.lon
        );


    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
    ) {

        return null;
    }


    let boundingBox =
        null;


    if (
        Array.isArray(
            result.boundingbox
        ) &&
        result.boundingbox.length === 4
    ) {

        boundingBox = {

            south:
                Number(
                    result.boundingbox[0]
                ),

            north:
                Number(
                    result.boundingbox[1]
                ),

            west:
                Number(
                    result.boundingbox[2]
                ),

            east:
                Number(
                    result.boundingbox[3]
                )
        };
    }


    return {

        provider:
            "nominatim",

        lat:
            latitude,

        lon:
            longitude,

        name:

            result.namedetails?.name ||

            result.name ||

            getNominatimName(
                result
            ),

        displayName:

            result.display_name ||
            "Location",

        type:

            result.type ||
            "location",

        class:

            result.class ||
            "place",

        importance:

            Number(
                result.importance
            ) || 0,

        address:

            result.address ||
            {},

        boundingBox,

        placeId:

            result.place_id ||
            null,

        raw:
            result
    };
}


// =========================================================
// NOMINATIM NAME
// =========================================================

function getNominatimName(
    result
) {

    const address =
        result.address || {};


    return (

        address.amenity ||

        address.building ||

        address.road ||

        address.neighbourhood ||

        address.suburb ||

        address.village ||

        address.town ||

        address.city ||

        address.state ||

        result.display_name ||

        "Location"
    );
}


// =========================================================
// SELECT RESULT
// =========================================================

function selectResult(
    result,
    originalQuery
) {

    hideSuggestions();


    const latitude =
        Number(
            result.lat
        );


    const longitude =
        Number(
            result.lon
        );


    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
    ) {

        console.error(
            "❌ Invalid search coordinates."
        );

        return;
    }


    const name =
        result.name ||
        originalQuery;


    const displayName =
        result.displayName ||
        name;


    console.log(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );


    console.log(
        "✅ Location selected:",
        displayName
    );


    console.log(
        "📍",
        latitude,
        longitude
    );


    console.log(
        "🏷️ Type:",
        result.type
    );


    console.log(
        "🌐 Provider:",
        result.provider
    );


    // =====================================================
    // SEARCH FIELD
    // =====================================================

    if (searchInput) {

        searchInput.value =
            name;
    }


    // =====================================================
    // EXACT MARKER
    // =====================================================

    createSearchMarker(
        latitude,
        longitude,
        name
    );


    // =====================================================
    // CAMERA
    // =====================================================

    flyToSearchResult(
        result
    );


    // =====================================================
    // STATUS
    // =====================================================

    setStatus(
        displayName
    );


    // =====================================================
    // WEATHER EVENT
    // =====================================================

    window.dispatchEvent(

        new CustomEvent(

            "searched-location-selected",

            {
                detail: {

                    latitude,

                    longitude,

                    name:
                        displayName,

                    query:
                        originalQuery,

                    type:
                        result.type,

                    class:
                        result.class,

                    address:
                        result.address || {},

                    provider:
                        result.provider,

                    placeId:
                        result.placeId,

                    boundingBox:
                        result.boundingBox
                }
            }
        )
    );


    console.log(
        "📡 Searched location dispatched."
    );
}


// =========================================================
// CAMERA
// =========================================================

function flyToSearchResult(
    result
) {

    const latitude =
        Number(
            result.lat
        );


    const longitude =
        Number(
            result.lon
        );


    const type =
        String(
            result.type || ""
        ).toLowerCase();


    const placeClass =
        String(
            result.class || ""
        ).toLowerCase();


    // =====================================================
    // PRECISE LOCATIONS
    //
    // Do NOT fit bounding boxes for these.
    //
    // We want the camera directly over the coordinate.
    // =====================================================

    if (
        isPreciseResult(
            type,
            placeClass
        )
    ) {

        flyToPoint(
            longitude,
            latitude,
            getPreciseHeight(
                type,
                placeClass
            )
        );


        return;
    }


    // =====================================================
    // SMALL LOCAL AREAS
    // =====================================================

    if (
        [
            "neighbourhood",
            "neighborhood",
            "quarter",
            "suburb",
            "district"
        ].includes(type)
    ) {

        flyToPoint(
            longitude,
            latitude,
            type === "suburb"
                ? 12000
                : 7000
        );


        return;
    }


    // =====================================================
    // LARGE GEOGRAPHIC AREAS
    //
    // For states/countries/cities we CAN use the bbox.
    // =====================================================

    const box =
        result.boundingBox;


    if (
        box &&
        isValidBoundingBox(box)
    ) {

        viewer.camera.flyTo({

            destination:

                Cesium.Rectangle
                    .fromDegrees(

                        box.west,

                        box.south,

                        box.east,

                        box.north
                    ),


            duration:
                2
        });


        return;
    }


    // =====================================================
    // FALLBACK POINT ZOOM
    // =====================================================

    flyToPoint(
        longitude,
        latitude,
        getGeneralHeight(
            type
        )
    );
}


// =========================================================
// FLY DIRECTLY TO POINT
// =========================================================

function flyToPoint(
    longitude,
    latitude,
    height
) {

    viewer.camera.flyTo({

        destination:

            Cesium.Cartesian3
                .fromDegrees(

                    longitude,

                    latitude,

                    height
                ),


        orientation: {

            heading:
                0,

            pitch:
                Cesium.Math.toRadians(
                    -82
                ),

            roll:
                0
        },


        duration:
            2
    });
}


// =========================================================
// PRECISE RESULT?
// =========================================================

function isPreciseResult(
    type,
    placeClass
) {

    const preciseTypes = [

        "building",

        "amenity",

        "address",

        "house",

        "street",

        "road",

        "poi",

        "commercial",

        "residential",

        "tourism",

        "office",

        "shop"
    ];


    const preciseClasses = [

        "building",

        "amenity",

        "highway",

        "shop",

        "tourism",

        "office",

        "leisure"
    ];


    return (

        preciseTypes.includes(type) ||

        preciseClasses.includes(
            placeClass
        )
    );
}


// =========================================================
// PRECISE CAMERA HEIGHT
// =========================================================

function getPreciseHeight(
    type,
    placeClass
) {

    if (
        type === "building" ||
        type === "house" ||
        type === "address" ||
        placeClass === "building"
    ) {

        // Close enough to see individual structures.

        return 650;
    }


    if (
        type === "street" ||
        type === "road" ||
        placeClass === "highway"
    ) {

        return 1800;
    }


    // POI / business / amenity

    return 900;
}


// =========================================================
// GENERAL HEIGHT
// =========================================================

function getGeneralHeight(
    type
) {

    switch (type) {

        case "country":

            return 2500000;


        case "state":

        case "region":

            return 700000;


        case "county":

            return 300000;


        case "city":

            return 90000;


        case "town":

            return 45000;


        case "village":

            return 22000;


        case "suburb":

            return 12000;


        case "neighbourhood":

        case "neighborhood":

        case "quarter":

            return 7000;


        default:

            return 15000;
    }
}


// =========================================================
// SEARCH MARKER
// =========================================================

function createSearchMarker(
    latitude,
    longitude,
    name
) {

    clearSearchMarker();


    searchMarker =
        viewer.entities.add({

            position:

                Cesium.Cartesian3
                    .fromDegrees(

                        longitude,

                        latitude,

                        15
                    ),


            point: {

                pixelSize:
                    13,

                color:
                    Cesium.Color.CYAN,

                outlineColor:
                    Cesium.Color.WHITE,

                outlineWidth:
                    3,

                disableDepthTestDistance:
                    Number.POSITIVE_INFINITY
            },


            label: {

                text:
                    name,

                font:
                    "14px sans-serif",

                fillColor:
                    Cesium.Color.WHITE,

                outlineColor:
                    Cesium.Color.BLACK,

                outlineWidth:
                    4,

                style:
                    Cesium.LabelStyle
                        .FILL_AND_OUTLINE,

                pixelOffset:

                    new Cesium.Cartesian2(
                        0,
                        -30
                    ),

                verticalOrigin:
                    Cesium.VerticalOrigin.BOTTOM,

                disableDepthTestDistance:
                    Number.POSITIVE_INFINITY,


                distanceDisplayCondition:

                    new Cesium.DistanceDisplayCondition(
                        0,
                        150000
                    )
            }
        });


    viewer.scene
        .requestRender();
}


// =========================================================
// CLEAR MARKER
// =========================================================

export function clearSearchMarker() {

    if (
        viewer &&
        searchMarker
    ) {

        viewer.entities.remove(
            searchMarker
        );
    }


    searchMarker =
        null;
}


// =========================================================
// RESULT RANKING
// =========================================================

function rankResults(
    results,
    query
) {

    const normalizedQuery =
        normalizeText(
            query
        );


    return [...results]

        .map(
            result => {

                let score =
                    Number(
                        result.importance
                    ) || 0;


                const name =
                    normalizeText(
                        result.name
                    );


                const display =
                    normalizeText(
                        result.displayName
                    );


                // Exact primary-name match.

                if (
                    name ===
                    normalizedQuery
                ) {

                    score +=
                        100;
                }


                // Name starts with query.

                if (
                    name.startsWith(
                        normalizedQuery
                    )
                ) {

                    score +=
                        40;
                }


                // Display starts with query.

                if (
                    display.startsWith(
                        normalizedQuery
                    )
                ) {

                    score +=
                        25;
                }


                // Contains query.

                if (
                    display.includes(
                        normalizedQuery
                    )
                ) {

                    score +=
                        10;
                }


                // Precise places get a slight boost.

                if (
                    isPreciseResult(

                        String(
                            result.type || ""
                        ).toLowerCase(),

                        String(
                            result.class || ""
                        ).toLowerCase()
                    )
                ) {

                    score +=
                        5;
                }


                return {

                    ...result,

                    searchScore:
                        score
                };
            }
        )

        .sort(
            (a, b) =>

                b.searchScore -
                a.searchScore
        );
}


// =========================================================
// REMOVE DUPLICATES
// =========================================================

function removeDuplicates(
    results
) {

    const seen =
        new Set();


    return results.filter(
        result => {

            const latitude =
                Number(
                    result.lat
                );


            const longitude =
                Number(
                    result.lon
                );


            const key =

                `${latitude.toFixed(5)}|` +

                `${longitude.toFixed(5)}|` +

                normalizeText(
                    result.name
                );


            if (seen.has(key)) {

                return false;
            }


            seen.add(key);


            return true;
        }
    );
}


// =========================================================
// CREATE SUGGESTIONS
// =========================================================

function createSuggestionsContainer() {

    let existing =
        document.getElementById(
            "locationSuggestions"
        );


    if (existing) {

        suggestionsContainer =
            existing;

        return;
    }


    suggestionsContainer =
        document.createElement(
            "div"
        );


    suggestionsContainer.id =
        "locationSuggestions";


    suggestionsContainer.className =
        "location-suggestions";


    suggestionsContainer.hidden =
        true;


    const parent =
        searchInput.parentElement;


    if (!parent) {
        return;
    }


    if (
        getComputedStyle(parent)
            .position === "static"
    ) {

        parent.style.position =
            "relative";
    }


    parent.appendChild(
        suggestionsContainer
    );
}


// =========================================================
// SHOW SUGGESTIONS
// =========================================================

function showSuggestions(
    results,
    query
) {

    if (!suggestionsContainer) {
        return;
    }


    suggestionsContainer.innerHTML =
        "";


    for (
        const result of results
    ) {

        const button =
            document.createElement(
                "button"
            );


        button.type =
            "button";


        button.className =
            "location-suggestion";


        // =================================================
        // NAME
        // =================================================

        const name =
            document.createElement(
                "span"
            );


        name.className =
            "location-suggestion-name";


        name.textContent =
            result.name ||
            query;


        // =================================================
        // ADDRESS
        // =================================================

        const address =
            document.createElement(
                "span"
            );


        address.className =
            "location-suggestion-address";


        address.textContent =
            result.displayName ||
            buildAddress(
                result.address
            );


        // =================================================
        // META
        // =================================================

        const meta =
            document.createElement(
                "span"
            );


        meta.className =
            "location-suggestion-type";


        meta.textContent =
            `${formatType(result.type)} • ${formatProvider(result.provider)}`;


        button.append(
            name,
            address,
            meta
        );


        button.addEventListener(
            "click",
            () => {

                selectResult(
                    result,
                    query
                );
            }
        );


        suggestionsContainer
            .appendChild(
                button
            );
    }


    suggestionsContainer.hidden =
        false;
}


// =========================================================
// HIDE SUGGESTIONS
// =========================================================

function hideSuggestions() {

    if (
        suggestionsContainer
    ) {

        suggestionsContainer.hidden =
            true;
    }
}


// =========================================================
// BUILD ADDRESS
// =========================================================

function buildAddress(
    address = {}
) {

    const values = [

        address.street ||
        address.road,

        address.neighbourhood,

        address.suburb,

        address.city,

        address.county,

        address.state,

        address.country
    ];


    const unique =
        [];


    for (
        const value of values
    ) {

        if (
            value &&
            !unique.includes(value)
        ) {

            unique.push(
                value
            );
        }
    }


    return unique
        .slice(0, 5)
        .join(", ");
}


// =========================================================
// VALID BOUNDING BOX
// =========================================================

function isValidBoundingBox(
    box
) {

    return (

        Number.isFinite(
            Number(box.west)
        ) &&

        Number.isFinite(
            Number(box.south)
        ) &&

        Number.isFinite(
            Number(box.east)
        ) &&

        Number.isFinite(
            Number(box.north)
        ) &&

        Number(box.east) >
        Number(box.west) &&

        Number(box.north) >
        Number(box.south)
    );
}


// =========================================================
// GEOAPIFY KEY
// =========================================================

function getGeoapifyKey() {

    const config =
        window.APP_CONFIG || {};


    return String(

        config.geoapifyApiKey ||

        config.geoapify_api_key ||

        window.GEOAPIFY_API_KEY ||

        document.querySelector(
            'meta[name="geoapify-api-key"]'
        )?.content ||

        ""

    ).trim();
}


// =========================================================
// NORMALIZE TEXT
// =========================================================

function normalizeText(
    value
) {

    return String(
        value || ""
    )

        .normalize(
            "NFD"
        )

        .replace(
            /[\u0300-\u036f]/g,
            ""
        )

        .toLowerCase()

        .trim()

        .replace(
            /\s+/g,
            " "
        );
}


// =========================================================
// FORMAT TYPE
// =========================================================

function formatType(
    value
) {

    return String(
        value || "location"
    )

        .replaceAll(
            "_",
            " "
        )

        .replace(
            /\b\w/g,
            letter =>
                letter.toUpperCase()
        );
}


// =========================================================
// FORMAT PROVIDER
// =========================================================

function formatProvider(
    provider
) {

    if (
        provider ===
        "geoapify"
    ) {

        return "Geoapify";
    }


    if (
        provider ===
        "nominatim"
    ) {

        return "OpenStreetMap";
    }


    return "Search";
}


// =========================================================
// STATUS
// =========================================================

function setStatus(
    message
) {

    const status =
        document.getElementById(
            "mapStatusText"
        );


    if (status) {

        status.textContent =
            message;
    }
}