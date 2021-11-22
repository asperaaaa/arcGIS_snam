require(["esri/config", "esri/Map", "esri/views/MapView"], function (
  esriConfig,
  Map,
  MapView
) {
  esriConfig.apiKey =
    "AAPK458453f872f04d9883da057b3cf03fd9MtYiqYcCKy61WkYFI1ySlxP2u5WcoIkzfswoHiArIWHaDMyRWDgAX7Xa-pxhh7Zy";

  const map = new Map({
    basemap: "arcgis-dark-gray", // Basemap layer service
  });

  view = new MapView({
    map: map,
    center: [13.013, 42.026], // Longitude, latitude
    zoom: 6, // Zoom level
    container: "viewDiv", // Div element
  });
});
