require(["esri/config", "esri/Map", "esri/views/MapView", "esri/layers/GeoJSONLayer", "esri/Basemap"], function (
  esriConfig,
  Map,
  MapView,
  GeoJSONLayer,
  Basemap
) {
  esriConfig.apiKey =
    "AAPK458453f872f04d9883da057b3cf03fd9MtYiqYcCKy61WkYFI1ySlxP2u5WcoIkzfswoHiArIWHaDMyRWDgAX7Xa-pxhh7Zy";

  const url = './cities.geojson';

  const renderer = {
    type: "simple",
    symbol: {
      type: "simple-marker",
      color: "orange",
      outline: {
        color: "white"
      }
    }    
  };




// // in this case the portalItem has to be a webmap
// let basemap = new Basemap({
//   portalItem: {
//     id: "8dda0e7b5e2d4fafa80132d59122268c"  // WGS84 Streets Vector webmap
//   }
// });

// or create the basemap from a well known ID
console.log(Basemap.fromId("arcgis-dark-gray"));

// // or create from a third party source
// let basemap = new Basemap({
//   baseLayers: [
//     new WebTileLayer(...)
//   ],
//   referenceLayers: [
//     new WebTileLayer(...)
//   ],
// });





  const geojsonLayer = new GeoJSONLayer({
    url: url,
    renderer:renderer
  });

  const map = new Map({
    basemap: "arcgis-dark-gray",
    layers: [geojsonLayer]
  });

  view = new MapView({
    map: map,
    center: [13.013, 42.026], // Longitude, latitude
    zoom: 6, // Zoom level
    container: "viewDiv", // Div element
  });

  map.allLayers.forEach(layer => {console.log(layer.title)});
});
