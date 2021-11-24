/* eslint-disable max-len */
/* eslint-disable no-param-reassign */
import esriConfig from '@arcgis/core/config';
import WebMap from '@arcgis/core/WebMap';
import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer';
import SceneView from '@arcgis/core/views/SceneView';

import * as externalRenderers from '@arcgis/core/views/3d/externalRenderers';
import SpatialReference from '@arcgis/core/geometry/SpatialReference';

import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';

esriConfig.apiKey = 'AAPK458453f872f04d9883da057b3cf03fd9MtYiqYcCKy61WkYFI1ySlxP2u5WcoIkzfswoHiArIWHaDMyRWDgAX7Xa-pxhh7Zy';

const url = './assets/cities.geojson';
const buttonBack = document.querySelector('.back');
let isZommed = false;
const issMeshUrl = './assets/models/iss.obj';

const renderer = {
  type: 'simple',
  symbol: {
    type: 'simple-marker',
    color: 'orange',
    outline: {
      color: 'white',
    },
  },
};

const geojsonLayer = new GeoJSONLayer({
  url,
  renderer,
});

const map = new WebMap({
  portalItem: {
    id: 'fe5db31192e042debc14a96765c8bd4c',
  },
  ground: 'world-elevation',
  layers: [geojsonLayer],
});

const view = new SceneView({
  container: 'viewDiv',
  map,
  scale: 9140598.13105315,
  center: [12.5538812361089167, 41.07347248726621],
  constraints: {
    rotationEnabled: false,
  },
  viewingMode: 'global',
});

function zoomAndCenter(response) {
  const graphic = response.results.find((element) => element.graphic.geometry !== null || undefined);

  if (graphic) {
    view.goTo({
      center: graphic.graphic.geometry,
      zoom: 15,
      tilt: 70,
    });

    isZommed = true;
  }
}

// Set up a click event handler and retrieve the screen x, y coordinates
view.on('click', (event) => {
  view.hitTest(event).then(zoomAndCenter);
});

/**
 * Disables all zoom gestures on the given view instance.
 *
 * @param {esri/views/MapView} view - The MapView instance on which to
 *                                  disable zooming gestures.
 */
function disableZooming(_view) {
  _view.popup.dockEnabled = true;
  // Removes the zoom action on the popup
  _view.popup.actions = [];
  // stops propagation of default behavior when an event fires
  function stopEvtPropagation(event) {
    event.stopPropagation();
  }
  // exlude the zoom widget from the default UI
  _view.ui.components = ['attribution'];
  // disable mouse wheel scroll zooming on the view
  _view.on('mouse-wheel', (event) => {
    if (!isZommed) stopEvtPropagation(event);
  });
  // disable zooming via double-click on the view
  _view.on('double-click', stopEvtPropagation);
  // disable zooming out via double-click + Control on the view
  _view.on('double-click', ['Control'], stopEvtPropagation);
  // disables pinch-zoom and panning on the view
  _view.on('drag', (event) => {
    if (!isZommed) stopEvtPropagation(event);
  });
  // disable the view's zoom box to prevent the Shift + drag
  // and Shift + Control + drag zoom gestures.
  _view.on('drag', ['Shift'], stopEvtPropagation);
  _view.on('drag', ['Shift', 'Control'], stopEvtPropagation);
  // prevents zooming with the + and - keys
  _view.on('key-down', (event) => {
    const prohibitedKeys = [
      '+',
      '-',
      'Shift',
      '_',
      '=',
      'ArrowUp',
      'ArrowDown',
      'ArrowRight',
      'ArrowLeft',
    ];
    const keyPressed = event.key;
    if (prohibitedKeys.indexOf(keyPressed) !== -1) {
      event.stopPropagation();
    }
  });
  return _view;
}

view.when(disableZooming);

buttonBack.addEventListener('click', () => {
  isZommed = false;
  view.goTo({
    center: [12.5538812361089167, 41.07347248726621],
    zoom: 6,
    tilt: 0,
    heading: 0,
  });
});

// ////////////////////////////////////////////
// Disable lighting based on the current camera position.
// We want to display the lighting according to the current time of day.
view.environment.lighting.cameraTrackingEnabled = false;

// Create our custom external renderer
// ////////////////////////////////////////////////////////////////////////////////////

const issExternalRenderer = {
  renderer: null, // three.js renderer
  camera: null, // three.js camera
  scene: null, // three.js scene

  ambient: null, // three.js ambient light source
  sun: null, // three.js sun light source

  iss: null, // ISS model
  issScale: 200, // scale for the iss model
  issMaterial: new THREE.MeshLambertMaterial({ color: 0xe03110 }), // material for the ISS model

  /**
   * Setup function, called once by the ArcGIS JS API.
   */
  setup(context) {
    // initialize the three.js renderer
    // ////////////////////////////////////////////////////////////////////////////////////
    this.renderer = new THREE.WebGLRenderer({
      context: context.gl,
      premultipliedAlpha: false,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setViewport(0, 0, view.width, view.height);

    // prevent three.js from clearing the buffers provided by the ArcGIS JS API.
    this.renderer.autoClearDepth = false;
    this.renderer.autoClearStencil = false;
    this.renderer.autoClearColor = false;

    // The ArcGIS JS API renders to custom offscreen buffers, and not to the default framebuffers.
    // We have to inject this bit of code into the three.js runtime in order for it to bind those
    // buffers instead of the default ones.
    const originalSetRenderTarget = this.renderer.setRenderTarget.bind(this.renderer);
    this.renderer.setRenderTarget = (target) => {
      originalSetRenderTarget(target);
      if (target == null) {
        context.bindRenderTarget();
      }
    };

    // setup the three.js scene
    // /////////////////////////////////////////////////////////////////////////////////////
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera();

    this.ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight(0xffffff, 0.5);
    this.scene.add(this.sun);

    // // load ISS mesh
    // const issMeshUrl = 'data/iss.obj';
    const loader = new OBJLoader(THREE.DefaultLoadingManager);
    // eslint-disable-next-line prefer-arrow-callback
    loader.load(issMeshUrl, function (object3d) {
      console.log('ISS mesh loaded.');
      this.iss = object3d;

      // apply ISS material to all nodes in the geometry
      // eslint-disable-next-line prefer-arrow-callback
      this.iss.traverse(function (child) {
        if (child instanceof THREE.Mesh) {
          child.material = this.issMaterial;
        }
      }.bind(this));

      // set the specified scale for the model
      this.iss.scale.set(this.issScale, this.issScale, this.issScale);

      // add the model
      this.scene.add(this.iss);
    }.bind(this), undefined, (error) => {
      console.error('Error loading ISS mesh. ', error);
    });
  },

  render(context) {
    // update camera parameters
    // /////////////////////////////////////////////////////////////////////////////////
    const cam = context.camera;

    this.camera.position.set(cam.eye[0], cam.eye[1], cam.eye[2]);
    this.camera.up.set(cam.up[0], cam.up[1], cam.up[2]);
    this.camera.lookAt(new THREE.Vector3(cam.center[0], cam.center[1], cam.center[2]));

    // Projection matrix can be copied directly
    this.camera.projectionMatrix.fromArray(cam.projectionMatrix);

    // update ISS and region position
    // /////////////////////////////////////////////////////////////////////////////////
    if (this.iss) {
      let posEst = [9.1900634765625, 45.468799075209894, 200];

      const renderPos = [0, 0, 0];
      externalRenderers.toRenderCoordinates(view, posEst, 0, SpatialReference.WGS84, renderPos, 0, 1);
      this.iss.position.set(renderPos[0], renderPos[1], renderPos[2]);

      // for the region, we position a torus slightly under ground
      // the torus also needs to be rotated to lie flat on the ground
      posEst = [posEst[0], posEst[1], -450 * 1000];

      const transform = new THREE.Matrix4();
      transform.fromArray(externalRenderers.renderCoordinateTransformAt(view, posEst, SpatialReference.WGS84, new Array(16)));
    }

    // draw the scene
    /// //////////////////////////////////////////////////////////////////////////////////////////////////
    this.renderer.render(this.scene, this.camera);
    this.renderer.state.reset();
  },
};

// register the external renderer
externalRenderers.add(view, issExternalRenderer);
