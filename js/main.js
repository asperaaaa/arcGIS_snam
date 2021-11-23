require(["esri/config", "esri/Map", "esri/views/MapView", "esri/layers/GeoJSONLayer", "esri/Basemap","esri/views/SceneView"], function (
  esriConfig,
  Map,
  MapView,
  GeoJSONLayer,
  Basemap,
  SceneView
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

  // view = new MapView({
  //   map: map,
  //   center: [13.013, 42.026], // Longitude, latitude
  //   zoom: 5, // Zoom level
  //   container: "viewDiv", // Div element
  // });

  view = new SceneView({
    container: "viewDiv",
    map: map,
    scale: 9140598.13105315,
    center: [12.5538812361089167, 41.07347248726621],
    constraints: {
      rotationEnabled: false
    }
  });

  // map.allLayers.forEach(layer => {console.log(layer.title)});

  // Set up a click event handler and retrieve the screen x, y coordinates
  view.on("click", function(event) {
    // the hitTest() checks to see if any graphics in the view
    // intersect the given screen x, y coordinates
    view.hitTest(event)
      .then(zoomAndCenter);
  });

  function zoomAndCenter(response) {
    // the topmost graphic from the click location
    // and display select attribute values from the
    // graphic to the user
    const graphic = response.results.find(element => element.graphic?.geometry !== null || undefined);
    view.goTo({
      center: graphic.graphic.geometry,
      zoom: 15
    });  // Sets the center point of the view at a specified lon/lat
  }

  view.when(disableZooming);
  
  /**
   * Disables all zoom gestures on the given view instance.
   *
   * @param {esri/views/MapView} view - The MapView instance on which to
   *                                  disable zooming gestures.
   */
  function disableZooming(view) {
    view.popup.dockEnabled = true;

    // Removes the zoom action on the popup
    view.popup.actions = [];

    // stops propagation of default behavior when an event fires
    function stopEvtPropagation(event) {
      event.stopPropagation();
    }

    // exlude the zoom widget from the default UI
    view.ui.components = ["attribution"];

    // disable mouse wheel scroll zooming on the view
    view.on("mouse-wheel", stopEvtPropagation);

    // disable zooming via double-click on the view
    view.on("double-click", stopEvtPropagation);

    // disable zooming out via double-click + Control on the view
    view.on("double-click", ["Control"], stopEvtPropagation);

    // disables pinch-zoom and panning on the view
    view.on("drag", stopEvtPropagation);

    // disable the view's zoom box to prevent the Shift + drag
    // and Shift + Control + drag zoom gestures.
    view.on("drag", ["Shift"], stopEvtPropagation);
    view.on("drag", ["Shift", "Control"], stopEvtPropagation);

    // prevents zooming with the + and - keys
    view.on("key-down", (event) => {
      const prohibitedKeys = [
        "+",
        "-",
        "Shift",
        "_",
        "=",
        "ArrowUp",
        "ArrowDown",
        "ArrowRight",
        "ArrowLeft"
      ];
      const keyPressed = event.key;
      if (prohibitedKeys.indexOf(keyPressed) !== -1) {
        event.stopPropagation();
      }
    });

    return view;
  }
});
