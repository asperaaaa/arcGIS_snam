require([
  "esri/config",
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/GeoJSONLayer",
  "esri/WebMap",
], function (esriConfig, Map, MapView, GeoJSONLayer, WebMap, Basemap) {
  esriConfig.apiKey =
    "AAPK458453f872f04d9883da057b3cf03fd9MtYiqYcCKy61WkYFI1ySlxP2u5WcoIkzfswoHiArIWHaDMyRWDgAX7Xa-pxhh7Zy";

  const url = "./cities.geojson";

  const renderer = {
    type: "simple",
    symbol: {
      type: "simple-marker",
      color: "orange",
      outline: {
        color: "white",
      },
    },
  };

  const geojsonLayer = new GeoJSONLayer({
    url: url,
    renderer: renderer,
  });

  const map = new WebMap({
    portalItem: {
      id: "c4d9f05ae3a7485a9dec68aa1c98cf64",
    },
    layers: [geojsonLayer],
  });

  view = new MapView({
    map: map,
    center: [13.013, 42.026], // Longitude, latitude
    zoom: 5, // Zoom level
    container: "viewDiv", // Div element
  });

  view.on("click", function(event) {
    view.hitTest(event)
      .then(zoomAndCenter);
  });

  function zoomAndCenter(response) {
    const graphic = response.results.find(element => element.graphic?.geometry !== null || undefined);
    view.goTo({
      center: graphic.graphic.geometry,
      zoom: 15
    });
  }
});
