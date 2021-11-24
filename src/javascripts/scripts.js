/* eslint-disable max-len */
/* eslint-disable no-param-reassign */
import esriConfig from '@arcgis/core/config';
import WebMap from '@arcgis/core/WebMap';
import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer';
import SceneView from '@arcgis/core/views/SceneView';
import esriRequest from '@arcgis/core/request';

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
  camera: {
    position: {
      x: -9932671,
      y: 2380007,
      z: 1687219,
      spatialReference: { wkid: 102100 },
    },
    heading: 0,
    tilt: 35,
  },
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
  issScale: 400000, // scale for the iss model
  issMaterial: new THREE.MeshLambertMaterial({ color: 0xe03110 }), // material for the ISS model

  cameraPositionInitialized: false, // we focus the view on the ISS once we receive our first data point
  positionHistory: [], // all ISS positions received so far

  markerMaterial: null, // material for the markers left by the ISS
  markerGeometry: null, // geometry for the markers left by the ISS

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

    // setup the camera
    this.camera = new THREE.PerspectiveCamera();

    // setup scene lighting
    this.ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight(0xffffff, 0.5);
    this.scene.add(this.sun);

    // setup markers
    this.markerGeometry = new THREE.SphereBufferGeometry(12 * 1000, 16, 16);
    this.markerMaterial = new THREE.MeshBasicMaterial({ color: 0xe03110, transparent: true, opacity: 0.75 });

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

    // create the horizon model
    const mat = new THREE.MeshBasicMaterial({ color: 0x2194ce });
    mat.transparent = true;
    mat.opacity = 0.5;
    this.region = new THREE.Mesh(
      new THREE.TorusBufferGeometry(2294 * 1000, 100 * 1000, 16, 64),
      mat,
    );
    this.scene.add(this.region);

    // start querying the ISS position
    this.queryISSPosition();

    // cleanup after ourselfs
    context.resetWebGLState();
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
      let posEst = this.computeISSPosition();

      const renderPos = [0, 0, 0];
      externalRenderers.toRenderCoordinates(view, posEst, 0, SpatialReference.WGS84, renderPos, 0, 1);
      this.iss.position.set(renderPos[0], renderPos[1], renderPos[2]);

      // for the region, we position a torus slightly under ground
      // the torus also needs to be rotated to lie flat on the ground
      posEst = [posEst[0], posEst[1], -450 * 1000];

      const transform = new THREE.Matrix4();
      transform.fromArray(externalRenderers.renderCoordinateTransformAt(view, posEst, SpatialReference.WGS84, new Array(16)));
      transform.decompose(this.region.position, this.region.quaternion, this.region.scale);

      // if we haven't initialized the view position yet, we do so now
      if (this.positionHistory.length > 0 && !this.cameraPositionInitialized) {
        this.cameraPositionInitialized = true;
        view.goTo({
          target: [posEst[0], posEst[1]],
          zoom: 5,
        });
      }
      console.log(this.positionHistory.length);
    }

    // update lighting
    /// //////////////////////////////////////////////////////////////////////////////////////////////////
    view.environment.lighting.date = Date.now();

    const l = context.sunLight;
    this.sun.position.set(
      l.direction[0],
      l.direction[1],
      l.direction[2],
    );
    this.sun.intensity = l.diffuse.intensity;
    this.sun.color = new THREE.Color(l.diffuse.color[0], l.diffuse.color[1], l.diffuse.color[2]);

    this.ambient.intensity = l.ambient.intensity;
    this.ambient.color = new THREE.Color(l.ambient.color[0], l.ambient.color[1], l.ambient.color[2]);

    // draw the scene
    /// //////////////////////////////////////////////////////////////////////////////////////////////////
    // this.renderer.resetGLState();
    this.renderer.render(this.scene, this.camera);
    this.renderer.state.reset();

    // as we want to smoothly animate the ISS movement, immediately request a re-render
    externalRenderers.requestRender(view);

    // cleanup
    context.resetWebGLState();
  },

  lastPosition: null,
  lastTime: null,

  /**
   * Computes an estimate for the position of the ISS based on the current time.
   */
  computeISSPosition() {
    if (this.positionHistory.length === 0) { return [0, 0, 0]; }

    if (this.positionHistory.length === 1) {
      const entry1 = this.positionHistory[this.positionHistory.length - 1];
      return entry1.pos;
    }

    const now = Date.now() / 1000;
    const entry1 = this.positionHistory[this.positionHistory.length - 1];

    // initialize the remembered ISS position
    if (!this.lastPosition) {
      this.lastPosition = entry1.pos;
      this.lastTime = entry1.time;
    }

    // compute a new estimated position
    const dt1 = now - entry1.time;
    const est1 = [
      entry1.pos[0] + dt1 * entry1.vel[0],
      entry1.pos[1] + dt1 * entry1.vel[1],
    ];

    // compute the delta of current and newly estimated position
    const dPos = [
      est1[0] - this.lastPosition[0],
      est1[1] - this.lastPosition[1],
    ];

    // compute required velocity to reach newly estimated position
    // but cap the actual velocity to 1.2 times the currently estimated ISS velocity
    let dt = now - this.lastTime;
    if (dt === 0) { dt = 1.0 / 1000; }

    const catchupVel = Math.sqrt(dPos[0] * dPos[0] + dPos[1] * dPos[1]) / dt;
    const maxVel = 1.2 * Math.sqrt(entry1.vel[0] * entry1.vel[0] + entry1.vel[1] * entry1.vel[1]);
    const factor = catchupVel <= maxVel ? 1.0 : maxVel / catchupVel;

    // move the current position towards the estimated position
    const newPos = [
      this.lastPosition[0] + dPos[0] * factor,
      this.lastPosition[1] + dPos[1] * factor,
      entry1.pos[2],
    ];

    this.lastPosition = newPos;
    this.lastTime = now;

    return newPos;
  },

  /**
   * This function starts a chain of calls querying the current ISS position from open-notify.org every 5 seconds.
   */
  queryISSPosition() {
    esriRequest('//open-notify-api.herokuapp.com/iss-now.json', {
      callbackParamName: 'callback',
      responseType: 'json',
    })
      // eslint-disable-next-line prefer-arrow-callback
      .then(function (response) {
        const result = response.data;

        let vel = [0, 0];
        if (this.positionHistory.length > 0) {
          const last = this.positionHistory[this.positionHistory.length - 1];
          const deltaT = result.timestamp - last.time;
          const vLon = (result.iss_position.longitude - last.pos[0]) / deltaT;
          const vLat = (result.iss_position.latitude - last.pos[1]) / deltaT;
          vel = [vLon, vLat];
        }

        this.positionHistory.push({
          pos: [result.iss_position.longitude, result.iss_position.latitude, 400 * 1000],
          time: result.timestamp,
          vel,
        });

        // create a new marker object from the second most recent position update
        if (this.positionHistory.length >= 2) {
          const entry = this.positionHistory[this.positionHistory.length - 2];

          const renderPos = [0, 0, 0];
          externalRenderers.toRenderCoordinates(view, entry.pos, 0, SpatialReference.WGS84, renderPos, 0, 1);

          const markerObject = new THREE.Mesh(this.markerGeometry, this.markerMaterial);
          markerObject.position.set(renderPos[0], renderPos[1], renderPos[2]);
          this.scene.add(markerObject);
        }
      }.bind(this));

    setTimeout(this.queryISSPosition.bind(this), 5000);
  },
};

// register the external renderer
externalRenderers.add(view, issExternalRenderer);
