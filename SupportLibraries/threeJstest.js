// import * as THREE from 'https://github.com/mrdoob/three.js/blob/dev/build/three.module.js';
import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r115/build/three.module.js';
import {OrbitControls} from 'https://threejsfundamentals.org/threejs/resources/threejs/r115/examples/jsm/controls/OrbitControls.js';

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight);

var renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth,window.innerHeight);
$('body').append(renderer.domElement);

window.addEventListener('resize',() => {
    renderer.setSize(window.innerWidth,window.innerHeight);
    camera.aspect = window.innerWidth/window.innerHeight;

    camera.updateProjectionMatrix();
})

const loader = new THREE.TextureLoader();
var texture = new THREE.TextureLoader().load( 'https://pkevz90.github.io/pkevz.github.io/2_no_clouds_4k.jpg' );
var geometry = new THREE.SphereGeometry( 1, 40, 40 );
var material = new THREE.MeshLambertMaterial( {
    map: texture
} );
var cube = new THREE.Mesh( geometry, material );
scene.add(cube);
var starTexture = new THREE.TextureLoader().load( 'https://pkevz90.github.io/pkevz.github.io/galaxy_starfield.png' );

var stars = new THREE.Mesh(
    new THREE.SphereGeometry(90, 64, 64), 
    new THREE.MeshBasicMaterial({
        map: starTexture,     
        side: THREE.BackSide
    })
);
scene.add(stars);
var light = new THREE.PointLight(0xFFFFFF, 1, 500);
light.position.set(10,0,12);
scene.add(light);

var material = new THREE.LineBasicMaterial({
	color: 0x0000ff
});

var points = [];
for (var ii = 0; ii < 2*3.1416; ii+=0.01) {
    points.push( new THREE.Vector3( 2*Math.cos(ii), 4*Math.sin(ii), -10 ) );
}

var geometry = new THREE.BufferGeometry().setFromPoints( points );

var line = new THREE.Line( geometry, material );
scene.add( line );


cube.position.z = -10;
// var controls = new THREE.TrackballControls(camera);
var render = function() {
    // controls.update();
    requestAnimationFrame(render);
    renderer.render(scene,camera);
    cube.rotation.y += 0.01;
}

render();