require(["esri/config", "esri/WebMap", "esri/layers/GeoJSONLayer","esri/views/SceneView"], function (
  esriConfig, WebMap, GeoJSONLayer, SceneView) {
  esriConfig.apiKey =
    "AAPK458453f872f04d9883da057b3cf03fd9MtYiqYcCKy61WkYFI1ySlxP2u5WcoIkzfswoHiArIWHaDMyRWDgAX7Xa-pxhh7Zy";

  const url = "./cities.geojson";
  const buttonBack = document.querySelector(".back");
  let isZommed = false;

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

  // Set up a click event handler and retrieve the screen x, y coordinates
  view.on("click", function(event) {
    view.hitTest(event)
      .then(zoomAndCenter);
  });

  function zoomAndCenter(response) {
    const graphic = response.results.find(element => element.graphic?.geometry !== null || undefined);
    if (graphic) {
      view.goTo({
        center: graphic.graphic.geometry,
        zoom: 15,
        tilt: 70
      });
      isZommed = true;
    } 
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
    view.on("drag", (event) => {
      if (!isZommed) stopEvtPropagation(event)
    });

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

  buttonBack.addEventListener('click', () => {
    view.goTo({
      center: [12.5538812361089167, 41.07347248726621],
      zoom: 5.014714022182407,
      tilt: 0
    });
  })
});
