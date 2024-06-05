import * as THREE from 'three';
import { createText } from 'three/addons/webxr/Text2D.js';

//floor
const floorColor = 0x222222;
const floorGeometry = new THREE.PlaneGeometry( 4, 4 );
const floorMaterial = new THREE.MeshPhongMaterial( { color: floorColor } );
const floor = new THREE.Mesh( floorGeometry, floorMaterial );
floor.rotation.x = - Math.PI / 2;
floor.receiveShadow = true;

//table
const tableColor = 0x964B00;
const tableGeometry = new THREE.BoxGeometry( 2, 0.5, 0.05 );
const tableMaterial = new THREE.MeshPhongMaterial( { color: tableColor } );
const table = new THREE.Mesh( tableGeometry, tableMaterial );
table.rotation.x = - Math.PI / 2;
table.position.set( 0, 1.05, - 0.6)
table.receiveShadow = true;

// menuMesh
const menuGeometry = new THREE.PlaneGeometry( 0.24, 0.24 );
const menuMaterial = new THREE.MeshPhongMaterial( {
  opacity: 0,
  transparent: true,
});

const menuMesh = new THREE.Mesh( menuGeometry, menuMaterial );
menuMesh.position.set(1.5, 0.25, -0.125);
menuMesh.rotation.y = - Math.PI / 12;

// exit button
const exitButton = makeButtonMesh( 0.2, 0.1, 0.01, 0xff0000 );
const exitButtonText = createText( 'exit', 0.06 );
exitButton.add( exitButtonText );
exitButtonText.position.set( 0, 0, 0.0051 );
exitButton.position.set( 0, 0, 0);

// instruction text
const instructionText = createText( 'This is a WebXR Hands demo, please explore with hands.', 0.04 );
instructionText.position.set( 0, 1.6, - 0.6 );

// exit text
const exitText = createText( "exiting...", 0.04 );
exitText.position.set( 0, 1.5, - 0.6 );
exitText.visible = false;

 //scanner
const scannerColor = 0x00ff00;
const scannerGeometry = new THREE.BoxGeometry( 0.25, 0.25, 0.05 );
const scannerMaterial = new THREE.MeshPhongMaterial( { color: scannerColor } );
const scanner = new THREE.Mesh( scannerGeometry, scannerMaterial );
scanner.rotation.x = - Math.PI / 2;
scanner.position.set(0, 1.1, - 0.6);

const dataScreenColor = 0x000cccc;
const dataScreenGeomtery = new THREE.PlaneGeometry( 2, 1 );
const dataScreenMaterial = new THREE.MeshPhongMaterial({
  opacity: 0.5,
  color: dataScreenColor,
  transparent: true,
});

const dataScreenMesh = new THREE.Mesh( dataScreenGeomtery, dataScreenMaterial );
dataScreenMesh.position.set( 0, 1.5, -1);

function makeButtonMesh( x, y, z, color ) {
  const geometry = new THREE.BoxGeometry( x, y, z );
  const material = new THREE.MeshPhongMaterial( { color: color } );
  const buttonMesh = new THREE.Mesh( geometry, material );
  return buttonMesh;
}

export { floor, table, menuMesh, exitButton, instructionText, exitText, scanner, dataScreenMesh }