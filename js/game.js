var w = $(window).width();
var h = $(window).height();
var period = 30; //seconds per orbit
var fps = 30;
var pezCATS = 50*Math.PI/180;
var wezCATS = 20*Math.PI/180;
var sezCATS = 70*Math.PI/180;
var blueViz = true;
var redViz = true;
var rOffset = h/2;
var iOffset = w/2
var blueRot = 0;
var blueI = -200;
var blueR = 0;
var zoom = .5;
var minZoom = .4;
var frcst = 1.0*period;
var t = 0; 
var omega = 2*Math.PI/period;

var config = {
    type: Phaser.AUTO,
    width: w,
    height: h,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    fps: fps
};

var game = new Phaser.Game(config);

function preload ()
{
    let fold = 'Media/gameimg/';
    this.load.image('stars', fold.concat('stars.jpg'));
    this.load.image('blue', fold.concat('blue.png'));
    this.load.image('red', fold.concat('red.png'));
    this.load.image('red-invisible', fold.concat('red-invisible.png'));
}

function create ()
{
    camera = this.cameras.main;
    camera.zoomTo(zoom, 1);
    
    backgroundImg = this.add.image(w/2,h/2,'stars');
    backgroundImg.displayWidth=w;
    backgroundImg.displayHeight=h;
    //backgroundImg.scaleY = backgroundImg.scaleX;
    
    bFutrTraj = this.add.graphics();
    sunVect = this.add.graphics();
    wez = this.add.graphics();
    pez = this.add.graphics();
    sez = this.add.graphics();
    bluePlayer = this.add.image(0, 0, 'blue');
    bluePlayer.rmoe = posVel2RMOE(0,.25,.125*omega,0);
    p = RMOE2Pos(bluePlayer.rmoe,bluePlayer.tburn,t);
    bluePlayer.x = w/2+(p.i * w);
    bluePlayer.y = h/2+(p.r * h);
    bluePlayer.t0 = 0;
    redPlayer = this.add.image(0, 0, 'red');
    redPlayer.rmoe = posVel2RMOE(0,-.25,-.125*omega,0);
    p = RMOE2Pos(redPlayer.rmoe,bluePlayer.t0,t);
    redPlayer.x = w/2+(p.i * w);
    redPlayer.y = h/2+(p.r * h);
    redPlayer.t0 = 0;
    
    
    collider = this.physics.add.collider(bluePlayer, redPlayer);
    cursors = this.input.keyboard.createCursorKeys();
}

function posVel2RMOE(posr,posi,velr,veli){
    return({
        rd: (4*posr) + ((2*veli)/omega),
        id0: posi - ((2*velr)/omega),
        B0: Math.atan2(velr,(3*omega*posr) + (2*veli)),
        a: 2*Math.sqrt(Math.pow((3*posr)+((2*veli)/omega),2)+Math.pow(velr/omega,2))
    })
}
function RMOE2Pos(rmoe,t0,t){
    B=rmoe.B0+(omega*(t-t0));
    return({
        r:-0.5*rmoe.a*Math.cos(B)+rmoe.rd,
        i:rmoe.a*Math.sin(B)+(rmoe.id0 - (1.5*omega*rmoe.rd*(t-t0)))
    })
}

function update ()
{
//Game Timer
    t+=1/fps;
//Update Positions
    p = RMOE2Pos(bluePlayer.rmoe,bluePlayer.t0,t);
    bluePlayer.x = w/2+(p.i * w);
    bluePlayer.y = h/2+(p.r * h);
    p = RMOE2Pos(redPlayer.rmoe,bluePlayer.t0,t);
    redPlayer.x = w/2+(p.i * w);
    redPlayer.y = h/2+(p.r * h);
//Arrow Keys
    // if (cursors.up.isDown)
    // {
    //    bluePlayer.y -= 5;
    // }
    // if (cursors.down.isDown)
    // {
    //    bluePlayer.y -= 5;
    // }
    // if (cursors.right.isDown)
    // {
    //     bluePlayer.x += 5;
    // }
    // if (cursors.left.isDown)
    // {
    //     bluePlayer.x -= 5;
    // }
    
//Auto Zoom
    // var rightBound = w/(2*zoom)-100;
    // var leftBound = -w/(2*zoom)+100;
    // if(iBlue.slice(t,t+frcst).some(el => el >= rightBound) || iBlue.slice(t,t+frcst).some(el => el <= leftBound)){
    //     zoom = zoom-0.01*zoom;
    //     camera.setZoom(zoom);
    // }else if(iBlue.slice(t,t+frcst).every(function (e) { return e < rightBound-200;}) && iBlue.slice(t,t+frcst).every(function (e) { return e > leftBound+200;}) && zoom<minZoom){
    //     zoom = zoom+0.01*zoom;
    //     camera.setZoom(zoom);
    // }
    // backgroundImg.displayWidth=w/zoom;
    // backgroundImg.scaleY = backgroundImg.scaleX;
    
//Trajectories
    // bFutrTraj.clear();
    // bFutrTraj.beginPath();
    // bFutrTraj.lineStyle(5/zoom, 0xFFFFFF, 1.0);
    // bFutrTraj.moveTo(bluePlayer.x, bluePlayer.y);
    // for(j = 1/fps; j < frcst; j+=1/fps) {
    //     bFutrTraj.lineTo(iBlue[t+j], rBlue[t+j]);
    // }
    // bFutrTraj.stroke();
    
//Sun Vector
    sunVect.clear();
    sunVect.beginPath();
    sunVect.lineStyle(5/zoom, 0xFFFF00, 0.75);
    sunVect.moveTo(redPlayer.x, redPlayer.y);
    sunVect.lineTo(redPlayer.x+(250)*Math.sin((t/period)*2*Math.PI), redPlayer.y-(250)*Math.cos((t/period)*2*Math.PI));
    sunVect.stroke();
    
    
//Auto Rotation
    if(bluePlayer.y-redPlayer.y>=0){
        bluePlayer.angle = -Math.atan((bluePlayer.x-redPlayer.x)/(bluePlayer.y-redPlayer.y))*180/Math.PI;
        redPlayer.angle = -Math.atan((bluePlayer.x-redPlayer.x)/(bluePlayer.y-redPlayer.y))*180/Math.PI-180;
        angR2B = -Math.atan((bluePlayer.x-redPlayer.x)/(bluePlayer.y-redPlayer.y)) + Math.PI;
    }else{
        bluePlayer.angle = -Math.atan((bluePlayer.x-redPlayer.x)/(bluePlayer.y-redPlayer.y))*180/Math.PI - 180;
        redPlayer.angle = -Math.atan((bluePlayer.x-redPlayer.x)/(bluePlayer.y-redPlayer.y))*180/Math.PI;
        angR2B = -Math.atan((bluePlayer.x-redPlayer.x)/(bluePlayer.y-redPlayer.y));
    }  
 
//CATS Zones
    pez.clear();
    pez.beginPath();
    pez.fillStyle(0xFFFF00, 0.3);
    pez.moveTo(redPlayer.x, redPlayer.y);
    pez.lineTo(redPlayer.x+200*Math.sin(angR2B+pezCATS), redPlayer.y-200*Math.cos(angR2B+pezCATS));
    pez.lineTo(redPlayer.x+200*Math.sin(angR2B+wezCATS), redPlayer.y-200*Math.cos(angR2B+wezCATS));
    pez.lineTo(redPlayer.x, redPlayer.y);
    pez.lineTo(redPlayer.x+200*Math.sin(angR2B-wezCATS), redPlayer.y-200*Math.cos(angR2B-wezCATS));
    pez.lineTo(redPlayer.x+200*Math.sin(angR2B-pezCATS), redPlayer.y-200*Math.cos(angR2B-pezCATS));
    pez.lineTo(redPlayer.x, redPlayer.y);
    pez.fill();
    
    wez.clear();
    wez.beginPath();
    wez.fillStyle(0xFF0000, 0.3);
    wez.moveTo(redPlayer.x, redPlayer.y);
    wez.lineTo(redPlayer.x+200*Math.sin(angR2B+wezCATS), redPlayer.y-200*Math.cos(angR2B+wezCATS));
    wez.lineTo(redPlayer.x+200*Math.sin(angR2B-wezCATS), redPlayer.y-200*Math.cos(angR2B-wezCATS));
    wez.lineTo(redPlayer.x, redPlayer.y);
    wez.fill();
    
    sez.clear();
    sez.beginPath();
    sez.fillStyle(0xaaaaaa, 0.3);
    sez.moveTo(redPlayer.x, redPlayer.y);
    sez.lineTo(redPlayer.x-200*Math.sin(angR2B+sezCATS), redPlayer.y+200*Math.cos(angR2B+sezCATS));
    for(j = 1; j < 30; j++) {
        sez.lineTo(redPlayer.x-200*Math.sin(angR2B+(sezCATS-2*j*sezCATS/30)), redPlayer.y+200*Math.cos(angR2B+(sezCATS-2*j*sezCATS/30)));
    }
    sez.lineTo(redPlayer.x, redPlayer.y);
    sez.fill();
  
//Test CATS State
    
    
}