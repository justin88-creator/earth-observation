# IMPORTS

import os 
from flask import ( Flask, render_template,jsonify)
from dotenv import load_dotenv


# Load environment variables from .env file
load_dotenv()


# =========================================================
# CREATE APP
# Initialize Flask application with static and template folders
app = Flask( __name__, static_folder="static",template_folder="templates")



# CONFIGURATION
# Cesium token for 3D geospatial visualization library
app.config["CESIUM_TOKEN"] = os.getenv("CESIUM_TOKEN","")

# Geoapify API key for geocoding and location search services
app.config["GEOAPIFY_API_KEY"] = os.getenv("GEOAPIFY_API_KEY","" )


# SENTINEL / COPERNICUS
# Sentinel Hub client ID for Copernicus satellite data access
app.config["SENTINEL_CLIENT_ID"] = os.getenv( "SENTINEL_CLIENT_ID", "")

# Sentinel Hub client secret for authentication
app.config["SENTINEL_CLIENT_SECRET"] = os.getenv( "SENTINEL_CLIENT_SECRET","")

# Sentinel Hub instance ID for WMS services
app.config["SENTINEL_INSTANCE_ID"] = os.getenv(
    "SENTINEL_INSTANCE_ID",
    ""
)


# =========================================================
# GOOGLE SATELLITE ASSET
# =========================================================

# Asset ID for Google satellite imagery in Earth Engine
GOOGLE_SATELLITE_ASSET_ID = 3830182


# =========================================================
# COPERNICUS WMS URL
# =========================================================

def get_copernicus_url():
    """
    Construct the Copernicus/Sentinel WMS service URL using the configured instance ID.
    Returns empty string if instance ID is not configured.
    """
    instance_id = app.config["SENTINEL_INSTANCE_ID"]

    if not instance_id:
        return ""

    return (
        "https://sh.dataspace.copernicus.eu/ogc/wms/"
        + instance_id
    )


# =========================================================
# ROUTES
# =========================================================

# =========================================================
# HOME
# =========================================================

@app.route("/")
def index():
    """Render the main dashboard page with all required API configurations."""
    return render_template(
        "dashboard.html",
        # Cesium token for 3D mapping visualization
        cesium_token=app.config["CESIUM_TOKEN"],
        # Geoapify API key for location search functionality
        geoapify_api_key=app.config["GEOAPIFY_API_KEY"],
        # Copernicus/Sentinel configuration for satellite imagery
        copernicus_token=app.config["SENTINEL_CLIENT_ID"],
        copernicus_instance_id=app.config["SENTINEL_INSTANCE_ID"],
        copernicus_url=get_copernicus_url(),
        # Google satellite asset ID for terrain/satellite overlay
        google_satellite_asset_id=GOOGLE_SATELLITE_ASSET_ID
    )


# =========================================================
# CONFIG STATUS
# =========================================================

@app.route("/api/config/status")
def config_status():
    """Return JSON status of all configured API keys and services."""
    return jsonify({
        # Check if Cesium token is configured
        "cesium": bool(app.config["CESIUM_TOKEN"]),
        # Check if Geoapify API key is configured
        "geoapify": bool(app.config["GEOAPIFY_API_KEY"]),
        # Check if Sentinel client ID is configured
        "sentinelClientId": bool(app.config["SENTINEL_CLIENT_ID"]),
        # Check if Sentinel client secret is configured
        "sentinelClientSecret": bool(app.config["SENTINEL_CLIENT_SECRET"]),
        # Check if Sentinel instance ID is configured
        "sentinelInstanceId": bool(app.config["SENTINEL_INSTANCE_ID"]),
        # Check if Copernicus WMS URL is available
        "copernicusUrl": bool(get_copernicus_url()),
        # Google satellite asset ID
        "googleSatelliteAssetId": GOOGLE_SATELLITE_ASSET_ID
    })


# =========================================================
# HEALTH
# =========================================================

@app.route("/api/health")
def health():
    """Return health check status of the application."""
    return jsonify({
        # Application status indicator
        "status": "ok",
        # Application name/description
        "application": "Global Earth Observation Dashboard"
    })


# =========================================================
# RUN
# =========================================================

if __name__ == "__main__":
    # Print separator line
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

    # Notify that Flask configuration has been loaded
    print("🔧 Flask configuration loaded.")

    # Display Cesium token status
    print(
        "Cesium:",
        "Loaded" if app.config["CESIUM_TOKEN"] else "Missing"
    )

    # Display Geoapify API key status
    print(
        "Geoapify:",
        "Loaded" if app.config["GEOAPIFY_API_KEY"] else "Missing"
    )

    # Check if all Copernicus/Sentinel credentials are configured
    copernicus_ready = (
        bool(app.config["SENTINEL_CLIENT_ID"])
        and bool(app.config["SENTINEL_CLIENT_SECRET"])
        and bool(app.config["SENTINEL_INSTANCE_ID"])
    )

    # Display Copernicus configuration status
    print(
        "Copernicus:",
        "Loaded" if copernicus_ready else "Missing"
    )

    # Display Google Satellite Asset ID
    print(
        "Google Satellite Asset:",
        GOOGLE_SATELLITE_ASSET_ID
    )

    # Print separator line
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

    # Start Flask development server on localhost:5000
    app.run(host="127.0.0.1", port=5000, debug=True)