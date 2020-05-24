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

cube.position.z = -5;
var controls = new THREE.TrackballControls(camera);
var render = function() {
    controls.update();
    requestAnimationFrame(render);
    renderer.render(scene,camera);
    cube.rotation.y += 0.01;
}

render();