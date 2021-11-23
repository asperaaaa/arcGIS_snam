require([
  "esri/config",
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/GeoJSONLayer",
  "esri/WebMap",
], function (esriConfig, Map, MapView, GeoJSONLayer, WebMap) {
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

  const webmap = new WebMap({
    portalItem: {
      id: "c4d9f05ae3a7485a9dec68aa1c98cf64",
    },
    layers: [geojsonLayer],
  });

  view = new MapView({
    map: webmap,
    center: [13.013, 42.026],
    zoom: 6,
    container: "viewDiv",
  });

  webmap.allLayers.forEach(element => {
    console.log(element.title)
  });
});
