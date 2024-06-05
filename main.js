import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { OculusHandModel } from 'three/addons/webxr/OculusHandModel.js';
import { OculusHandPointerModel } from 'three/addons/webxr/OculusHandPointerModel.js';
import { createText } from 'three/addons/webxr/Text2D.js';
import { World, System, Component, TagComponent, Types } from 'three/addons/libs/ecsy.module.js';
import { userData, userDataGroupings, userImageTextureBySize } from './src/js/users.js';
import { floor, table, menuMesh, exitButton, instructionText, exitText, scanner, dataScreenMesh } from './src/js/worldMesh.js';

class Object3D extends Component { }

Object3D.schema = {
  object: { type: Types.Ref }
};

class Button extends Component { }

Button.schema = {
  // button states: [none, hovered, pressed]
  currState: { type: Types.String, default: 'none' },
  prevState: { type: Types.String, default: 'none' },
  action: { type: Types.Ref, default: () => { } }
};

class ButtonSystem extends System {
  execute( /*delta, time*/ ) {
    this.queries.buttons.results.forEach( entity => {
      const button = entity.getMutableComponent( Button );
      const buttonMesh = entity.getComponent( Object3D ).object;

      if ( button.currState == 'none' ) {
        buttonMesh.scale.set( 1, 1, 1 );
      } else {
        buttonMesh.scale.set( 1.1, 1.1, 1.1 );
      }

      if ( button.currState == 'pressed' && button.prevState != 'pressed' ) {
        button.action();
      }

      // preserve prevState, clear currState
      // HandRaySystem will update currState
      button.prevState = button.currState;
      button.currState = 'none';
    } );
  }
}

ButtonSystem.queries = {
  buttons: {
    components: [ Button ]
  }
};

class Draggable extends Component { }

Draggable.schema = {
  // draggable states: [detached, hovered, to-be-attached, attached, to-be-detached]
  state: { type: Types.String, default: 'none' },
  originalParent: { type: Types.Ref, default: null },
  attachedPointer: { type: Types.Ref, default: null }
};

class DraggableSystem extends System {
  execute( /*delta, time*/ ) {
    this.queries.draggable.results.forEach( entity => {
      const draggable = entity.getMutableComponent( Draggable );
      const object = entity.getComponent( Object3D ).object;
      if ( draggable.originalParent == null ) {
        draggable.originalParent = object.parent;
      }

      switch ( draggable.state ) {
        case 'to-be-attached':
          // this attaches the object to the hand pointer for dragging
          draggable.attachedPointer.children[0].attach( object );
          draggable.state = 'attached';
          break;
        case 'to-be-detached':
          draggable.originalParent.attach( object );
          draggable.state = 'detached';

          //check if the object is in the scanner
          let userDataGrouping = userDataGroupings[object.index];
          //These values need
          if (
            // these values should be stated not magic and  checked and this should be put into a function
            (object.position.x > - 0.125 && object.position.x < 0.125) &&
            (object.position.z > -0.7 && object.position.z < - 0.5) &&
            (object.position.y > 1.1 && object.position.y < 1.6) )
            {
              userDataGroupings.forEach((grouping) => {
              grouping.visible = false;
            });
            userDataGrouping.visible = true;
          } else {
            userDataGrouping.visible = false;
          }
          break;
        default:
          object.scale.set( 1, 1, 1 );
      }
    } );
  }
}

DraggableSystem.queries = {
  draggable: {
    components: [ Draggable ]
  }
};

class Intersectable extends TagComponent { }

class HandRaySystem extends System {
  init( attributes ) {
    this.handPointers = attributes.handPointers;
  }

  execute( /*delta, time*/ ) {
    this.handPointers.forEach( hp => {
      let distance = null;
      let intersectingEntity = null;

      this.queries.intersectable.results.forEach( entity => {
        const object = entity.getComponent( Object3D ).object;
        const intersections = hp.intersectObject( object, false );

        if ( intersections && intersections.length > 0 ) {
          if ( distance == null || intersections[ 0 ].distance < distance ) {
            distance = intersections[ 0 ].distance;
            intersectingEntity = entity;
          }
        }
      });

      if ( distance ) {
        hp.setCursor( distance );
        if (intersectingEntity.hasComponent( Button ) ) {
          const button = intersectingEntity.getMutableComponent( Button );
          if ( hp.isPinched() ) {
            button.currState = 'pressed';
          } else if ( button.currState != 'pressed' ) {
            button.currState = 'hovered';
          }
        }

        if ( intersectingEntity.hasComponent( Draggable ) ) {
          const draggable = intersectingEntity.getMutableComponent( Draggable );
          const object = intersectingEntity.getComponent( Object3D ).object;

          object.scale.set( 1.1, 1.1, 1.1 );
          if ( hp.isPinched() ) {
            if ( ! hp.isAttached() && draggable.state != 'attached' ) {
              draggable.state = 'to-be-attached';
              draggable.attachedPointer = hp;
              hp.setAttached( true );
            }
          } else {
            if ( hp.isAttached() && draggable.state == 'attached' ) {
              draggable.state = 'to-be-detached';
              draggable.attachedPointer = null;
              hp.setAttached( false );
            }
          }
        }
      } else {
        hp.setCursor( 1.5 );
      }
    } );
  }
}

HandRaySystem.queries = {
  intersectable: {
    components: [ Intersectable ]
  }
};

class HandsInstructionText extends TagComponent { }

class InstructionSystem extends System {
  init( attributes ) {
    this.controllers = attributes.controllers;
  }

  execute( /*delta, time*/ ) {
    let visible = false;
    this.controllers.forEach( controller => {
      if ( controller.visible ) {
        visible = true;
      }
    } );

    this.queries.instructionTexts.results.forEach( entity => {
      const object = entity.getComponent( Object3D ).object;
      object.visible = visible;
    } );
  }
}

InstructionSystem.queries = {
  instructionTexts: {
    components: [ HandsInstructionText ]
  }
};

class OffsetFromCamera extends Component { }

OffsetFromCamera.schema = {
  x: { type: Types.Number, default: 0 },
  y: { type: Types.Number, default: 0 },
  z: { type: Types.Number, default: 0 },
};

class NeedCalibration extends TagComponent { }

class CalibrationSystem extends System {
  init( attributes ) {
    this.camera = attributes.camera;
    this.renderer = attributes.renderer;
  }

  execute( /*delta, time*/ ) {
    this.queries.needCalibration.results.forEach( entity => {
      if ( this.renderer.xr.getSession() ) {
        const offset = entity.getComponent( OffsetFromCamera );
        const object = entity.getComponent( Object3D ).object;
        const xrCamera = this.renderer.xr.getCamera();
        object.position.x = xrCamera.position.x + offset.x;
        object.position.y = xrCamera.position.y + offset.y;
        object.position.z = xrCamera.position.z + offset.z;
        entity.removeComponent( NeedCalibration );
      }
    });
  }
}

CalibrationSystem.queries = {
  needCalibration: {
    components: [ NeedCalibration ]
  }
};


const world = new World();
const clock = new THREE.Clock();
let camera, scene, renderer;

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0xffffff );

  camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 10 );
  camera.position.set( 0, 1.2, 0.3 );

  scene.add( new THREE.HemisphereLight( 0xcccccc, 0x999999, 3 ) );

  const light = new THREE.DirectionalLight( 0xffffff, 3 );
  light.position.set( 0, 6, 0 );
  light.castShadow = true;
  scene.add( light );

  renderer = new THREE.WebGLRenderer( { antialias: false, alpha: true} );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.shadowMap.enabled = true;

  // initializing webxr renderer and controllers. Adding the vr button to the users element
  document.body.appendChild( renderer.domElement );

  renderer.xr.enabled = true;
  renderer.xr.cameraAutoUpdate = false;

  const sessionInit = {
    requiredFeatures: [ 'hand-tracking' ]
  };

  // WebXr entry point
  document.body.appendChild( VRButton.createButton( renderer, sessionInit ) );


  // controllers
  const controller1 = renderer.xr.getController( 0 );
  const controller2 = renderer.xr.getController( 1 );
  scene.add( controller1, controller2 );

  const controllerModelFactory = new XRControllerModelFactory();

  // Hand 1
  const controllerGrip1 = renderer.xr.getControllerGrip( 0 );
  controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
  scene.add( controllerGrip1 );

  const hand1 = renderer.xr.getHand( 0 );
  hand1.add( new OculusHandModel( hand1 ) );
  const handPointer1 = new OculusHandPointerModel( hand1, controller1 );
  hand1.add( handPointer1 );
  scene.add( hand1 );

  // Hand 2
  const controllerGrip2 = renderer.xr.getControllerGrip( 1 );
  controllerGrip2.add( controllerModelFactory.createControllerModel( controllerGrip2 ) );
  scene.add( controllerGrip2 );

  const hand2 = renderer.xr.getHand( 1 );
  hand2.add( new OculusHandModel( hand2 ) );
  const handPointer2 = new OculusHandPointerModel( hand2, controller2 );
  hand2.add( handPointer2 );
  scene.add( hand2 );

  // setup objects in scene and entities
  // floor
  scene.add(floor);
  //table
  scene.add(table);
  // menu
  scene.add(menuMesh);
  menuMesh.add(exitButton);
  // instruction text
  scene.add(instructionText);
  // exit text
  scene.add(exitText);
  //scanner
  scene.add(scanner);
  // data screen
  scene.add(dataScreenMesh);

  // world components and systems
  world
    .registerComponent( Object3D )
    .registerComponent( Button )
    .registerComponent( Intersectable )
    .registerComponent( HandsInstructionText )
    .registerComponent( OffsetFromCamera )
    .registerComponent( NeedCalibration )
    .registerComponent( Draggable )

  world
    .registerSystem( InstructionSystem, { controllers: [ controllerGrip1, controllerGrip2 ] } )
    .registerSystem( CalibrationSystem, { renderer: renderer, camera: camera } )
    .registerSystem( ButtonSystem )
    .registerSystem( DraggableSystem )
    .registerSystem( HandRaySystem, { handPointers: [ handPointer1, handPointer2 ] } );


  //Create and position cubes from user data
  for (const user of userData) {
    const i = userData.indexOf(user);
    const cubeSize = 0.075;
    const cubePositioningStep = 0.3;

    const dataCubeGeometry = new THREE.BoxGeometry( cubeSize, cubeSize, cubeSize);
    const dataCubeMaterial = new THREE.MeshBasicMaterial( {map: userImageTextureBySize(user, 'medium')});
    const userDataCube = new THREE.Mesh( dataCubeGeometry, dataCubeMaterial );
    userDataCube.position.set(0, 1.15, -0.6)

    userDataCube.position.x = (i * cubePositioningStep -cubePositioningStep) - cubePositioningStep;

    // posiiton the cubes in the center of the screen but bypass the scanner
    if ( userDataCube.position.x > -cubePositioningStep && userDataCube.position.x < cubePositioningStep ) {
        userDataCube.position.x = userDataCube.position.x + 0.175;
      }

    //user data being added to the screen mesh
    let userDataIndex = 1;
    const dataGroup = new THREE.Group();

    for (const data in user) {
      let textStep = 0.1 * userDataIndex;

      const userDataTextGeometry = new THREE.PlaneGeometry( 0.4, 0.4 );
      const userDataTextMaterial= new THREE.MeshBasicMaterial( { opacity: 0, transparent: true, color:0x000cccc });
      const userDataTextMesh = new THREE.Mesh( userDataTextGeometry, userDataTextMaterial);
      const userDataText = createText( `${data}: ${user[data]}`, 0.03 );

      userDataTextMesh.add(userDataText);
      userDataText.position.set(0, 0, 0.09);
      const userImgGeometryXL = new THREE.PlaneGeometry( 0.35, 0.35 );
      const userImgMaterialXL = new THREE.MeshBasicMaterial( {map: userImageTextureBySize(user, 'large')});
      const userImgMeshXL = new THREE.Mesh( userImgGeometryXL, userImgMaterialXL );
      userImgMeshXL.position.set( -0.75, 1.75, -0.99);

      if (userDataIndex < 6) {
        let posY = 1.17 + textStep;
        userDataTextMesh.position.set(-0.35, posY, -0.99);
      } else if (userDataIndex >= 7) {
        let posY = 0.5 + textStep;
        userDataTextMesh.position.set(0.1725, posY, -0.99);
      }

      dataGroup.add(userDataTextMesh, userImgMeshXL);
      userDataIndex += 1;
    }

    userDataCube.index = i;
    dataGroup.visible = false;
    userDataGroupings.push(dataGroup);
    scene.add( userDataCube, dataGroup );

    const entity = world.createEntity();
    entity.addComponent( Intersectable );
    entity.addComponent( Object3D, { object: userDataCube } );
    entity.addComponent( Draggable );
  }

  // world functions
  // menu
  const menuEntity = world.createEntity();
  menuEntity.addComponent( Intersectable );
  menuEntity.addComponent( OffsetFromCamera, { x: 1, y: 0, z: - 1 } );
  menuEntity.addComponent( NeedCalibration );
  menuEntity.addComponent( Object3D, { object: menuMesh } );

  // exit button
  const exitButtonEntity = world.createEntity();
  exitButtonEntity.addComponent( Intersectable );
  exitButtonEntity.addComponent( Object3D, { object: exitButton } );

  const exitButtonAction = function () {
    exitText.visible = true;
    setTimeout( function () {
      exitText.visible = false; renderer.xr.getSession().end();
    }, 2000 );
  };
  exitButtonEntity.addComponent( Button, { action: exitButtonAction } );

  // instruction text
  const itEntity = world.createEntity();
  itEntity.addComponent( HandsInstructionText );
  itEntity.addComponent( Object3D, { object: instructionText } );

  window.addEventListener( 'resize', onWindowResize );
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
  renderer.setAnimationLoop( render );
}

function render() {
  const delta = clock.getDelta();
  const elapsedTime = clock.elapsedTime;
  renderer.xr.updateCamera( camera );
  world.execute( delta, elapsedTime );
  renderer.render( scene, camera );
}

