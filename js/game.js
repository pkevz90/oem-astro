//System variables
var w = $(window).width();
var h = $(window).height();
var fps = 60;
var initTime = Date.now();

//Gameplay Tunable Variables
var t = 0; 
var period = 30; //seconds per orbit (controls gamespeed)

var pezCATS = 50*Math.PI/180;
var wezCATS = 20*Math.PI/180;
var sezCATS = 45*Math.PI/180;

var ydistysunPPS = 5; //Yellow Dist, Yellow Sun, Percentage Per Second
var gdistysunPPS = 10;
var ydistgsunPPS = 15;
var gdistgsunPPS = 20;

var smallRange = .2;
var largeRange = .3;
var maxBurnDV = .0065;
var prepTime = .2; //In game seconds between burns

//Gameplay Non-Tunable Variables
var omega = 2*Math.PI/period;
var bluePerc = 0;
var winner = "";

//Graphics Variables
var frcst = 1.5*period;
var zoom = 1;
var minZoom = .4;
var sunRange = .15;
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
window.addEventListener('resize', resize);
function resize(){
    w = $(window).width();
    h = $(window).height();
    game.scale.resize(w,h);
    orig.clear(); //This seems wrong, but it may be right
    orig.fillStyle(0xFFFFFF,1);
    orig.fillCircle(i2x(0),r2y(0),6);
    orig.lineStyle(3/zoom, 0xFFFFFF, 1);
    orig.beginPath();
    orig.moveTo(i2x(0),r2y(0));
    orig.lineTo(i2x(.1),r2y(0));
    orig.lineTo(i2x(.09),r2y(.01));
    orig.moveTo(i2x(.1),r2y(0));
    orig.lineTo(i2x(.09),r2y(-.01));
    orig.moveTo(i2x(0),r2y(0));
    orig.lineTo(i2x(0),r2y(.1));
    orig.lineTo(i2x(.01),r2y(.09));
    orig.moveTo(i2x(0),r2y(.1));
    orig.lineTo(i2x(-.01),r2y(.09));
    orig.stroke()
    backgroundImg.x = w/2;
    backgroundImg.y = h/2;
    if (w/h > backgroundImg.width/backgroundImg.height){
        backgroundImg.displayWidth=w;
        backgroundImg.scaleY = backgroundImg.scaleX;
    }else{
        backgroundImg.displayHeight=h;
        backgroundImg.scaleX = backgroundImg.scaleY;
    }
    blueTimeIndicText = this.add.text(w/6,.8*h,'Preparing\n to Burn');
    let textwid = blueTimeIndicText.width;
};

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
    if (w/h > backgroundImg.width/backgroundImg.height){
        backgroundImg.displayWidth=w;
        backgroundImg.scaleY = backgroundImg.scaleX;
    }else{
        backgroundImg.displayHeight=h;
        backgroundImg.scaleX = backgroundImg.scaleY;
    }
    //Graphics in order of lyers bottom to top
    orig = this.add.graphics();  
    rFutrTraj = this.add.graphics();
    bFutrTraj = this.add.graphics();
    
    
    distReqCirc = this.add.graphics();
    pez = this.add.graphics();
    wez = this.add.graphics();
    sez = this.add.graphics();

    

    targetPtRange = this.add.graphics();
    
    bluePlayer = this.add.image(0, 0, 'blue');
    redPlayer = this.add.image(0, 0, 'red');

    targetPt = this.add.graphics();
    targetFuture = this.add.graphics();
   
    sunVect = this.add.graphics();

    blueTimeIndic = this.add.graphics();
    bluePercIndic = this.add.graphics();
    blueTimeIndicText = this.add.text(w/6,.8*h,'Preparing\n to Burn');
    blueTimeIndicText.setAlign('center')
    blueTimeIndicText.setFontSize('30px')
    blueTimeIndicText.setX(blueTimeIndicText.x-blueTimeIndicText.width/2)
    blueTimeIndicText.setY(blueTimeIndicText.y-blueTimeIndicText.height/2)


//Initialize graphics objects
    orig.fillStyle(0xFFFFFF,1)
    orig.fillCircle(i2x(0),r2y(0),6);
    orig.lineStyle(3/zoom, 0xFFFFFF, 1);
    orig.beginPath();
    orig.moveTo(i2x(0),r2y(0));
    orig.lineTo(i2x(.1),r2y(0));
    orig.lineTo(i2x(.09),r2y(.01));
    orig.moveTo(i2x(.1),r2y(0));
    orig.lineTo(i2x(.09),r2y(-.01));
    orig.moveTo(i2x(0),r2y(0));
    orig.lineTo(i2x(0),r2y(.1));
    orig.lineTo(i2x(.01),r2y(.09));
    orig.moveTo(i2x(0),r2y(.1));
    orig.lineTo(i2x(-.01),r2y(.09));
    orig.stroke()
    
    
    bluePlayer.t0 = 0;
    bluePlayer.rmoe = posVel2RMOE(0,.25,.125*omega,0);
    bluePlayer.x = i2x(0);
    bluePlayer.y = r2y(.25);
    bluePlayer.t0 = 0;
    bluePlayer.target = {idot:0,rdot:0};

    
    redPlayer.rmoe = posVel2RMOE(0,-.25,-.125*omega,0);
    p = RMOE2PosVel(redPlayer.rmoe,bluePlayer.t0,t);
    redPlayer.x = i2x(p.i);
    redPlayer.y = r2y(p.r);
    redPlayer.t0 = 0;

    
    //collider = this.physics.add.collider(bluePlayer, redPlayer);
    cursors = this.input.keyboard.createCursorKeys();
}

function posVel2RMOE(r,i,rdot,idot){
    return({
        rd: (4*r) + ((2*idot)/omega),
        id0: i - ((2*rdot)/omega),
        B0: Math.atan2(rdot,(3*omega*r) + (2*idot)),
        a: 2*Math.sqrt(Math.pow((3*r)+((2*idot)/omega),2)+Math.pow(rdot/omega,2))
    })
}
function RMOE2PosVel(rmoe,t0,t){
    B=rmoe.B0+(omega*(t-t0));
    return({
        r:-0.5*rmoe.a*Math.cos(B)+rmoe.rd,
        i:rmoe.a*Math.sin(B)+(rmoe.id0 - (1.5*omega*rmoe.rd*(t-t0))),
        rdot: 0.5*rmoe.a*Math.sin(B)*omega,
        idot: rmoe.a*Math.cos(B)*omega - (1.5*omega*rmoe.rd)
    })
}
function i2x(i){return(w/2+(i * w))};
function r2y(r){return(h/2+(r * w))};//scaling using w keeps it scaled correctly
function update ()
{
    // console.log(Date.now()-initTime)
    // initTime = Date.now();
//Game Timer
    t+=1/fps;
//Update Positions
    p = RMOE2PosVel(bluePlayer.rmoe,bluePlayer.t0,t);
    bluePlayer.x = i2x(p.i);
    bluePlayer.y = r2y(p.r);
    p = RMOE2PosVel(redPlayer.rmoe,redPlayer.t0,t);
    redPlayer.x = i2x(p.i);
    redPlayer.y = r2y(p.r);

//Pixel Value
sunPx = i2x(sunRange) - w/2;
smallPx = i2x(smallRange) - w/2;
largePx = i2x(largeRange) - w/2;
let d = math.norm([redPlayer.x-bluePlayer.x,redPlayer.y-bluePlayer.y]);
let svec_r = {x: redPlayer.x+(sunPx)*Math.sin((t/period)*2*Math.PI), 
            y: redPlayer.y-(sunPx)*Math.cos((t/period)*2*Math.PI)}

//Points
let cats = math.acos(math.dot([svec_r.x-redPlayer.x,svec_r.y-redPlayer.y],[bluePlayer.x-redPlayer.x,bluePlayer.y-redPlayer.y])/(math.norm([svec_r.x-redPlayer.x,svec_r.y-redPlayer.y])*math.norm([bluePlayer.x-redPlayer.x,bluePlayer.y-redPlayer.y])));
//Cats goes from 0 to pi (pi is bad)
if (d<=smallPx){
    if (cats<=wezCATS){
        bluePerc += gdistgsunPPS/fps;
    } else if(cats<=pezCATS){
        bluePerc += gdistysunPPS/fps;
    }
}else if(d<=largePx){
    if (cats<=wezCATS){
        bluePerc += ydistgsunPPS/fps;
    } else if(cats<=pezCATS){
        bluePerc += ydistysunPPS/fps;
    }
}

//Arrow Keys
    if (cursors.up.isDown){
       bluePlayer.target.rdot -= .02*maxBurnDV;
    }
    if (cursors.down.isDown){
       bluePlayer.target.rdot += .02*maxBurnDV;
    }
    if (cursors.right.isDown){
        bluePlayer.target.idot += .02*maxBurnDV;
    }
    if (cursors.left.isDown){
        bluePlayer.target.idot -= .02*maxBurnDV;
    }
    if (math.norm([bluePlayer.target.idot,bluePlayer.target.rdot])>maxBurnDV){
        bluePlayer.target.idot = maxBurnDV * bluePlayer.target.idot/math.norm([bluePlayer.target.idot,bluePlayer.target.rdot]);
        bluePlayer.target.rdot = maxBurnDV * bluePlayer.target.rdot/math.norm([bluePlayer.target.idot,bluePlayer.target.rdot])
    }
    if (cursors.space.isDown && bluePerc>100){
        winner = "blue"
    }
    if (cursors.space.isDown && (t-bluePlayer.t0)/prepTime >= 1){
        p = RMOE2PosVel(bluePlayer.rmoe,bluePlayer.t0,t);
        bluePlayer.rmoe = posVel2RMOE(p.r,p.i,p.rdot+bluePlayer.target.rdot,p.idot+bluePlayer.target.idot); 
        bluePlayer.target.idot=0;
        bluePlayer.target.rdot=0;
        bluePlayer.t0=t;
    }
    targetPtRange.clear();

    targetPt.clear();
    targetFuture.clear();
    let visualDVMult = .1/maxBurnDV;
    if (cursors.up.isDown || cursors.down.isDown || cursors.left.isDown || cursors.right.isDown){
        targetPtRange.fillStyle(0xCCCCCC,.6)
        targetPtRange.fillCircle(bluePlayer.x,bluePlayer.y,w*maxBurnDV*visualDVMult + 10)
    }
    if (bluePlayer.target.idot != 0 || bluePlayer.target.rdot != 0){
        targetPt.lineStyle(2/zoom, 0xFFFFFF, 1.0)
        targetPt.beginPath();
        targetPt.moveTo(bluePlayer.x,bluePlayer.y)
        targetPt.lineTo(bluePlayer.x + w*bluePlayer.target.idot*visualDVMult,
            bluePlayer.y + w*bluePlayer.target.rdot*visualDVMult);
        targetPt.stroke();
        
        targetPt.fillStyle(0x0000FF,1)
        targetPt.fillCircle(bluePlayer.x + w*bluePlayer.target.idot*visualDVMult,
                            bluePlayer.y + w*bluePlayer.target.rdot*visualDVMult,
                            8)
        targetPt.strokeCircle(bluePlayer.x + w*bluePlayer.target.idot*visualDVMult,
                              bluePlayer.y + w*bluePlayer.target.rdot*visualDVMult,
                              8);
        
        targetFuture.lineStyle(5/zoom, 0xFFFFFF, .6)
        targetFuture.beginPath()
        targetFuture.moveTo(bluePlayer.x, bluePlayer.y);
        p = RMOE2PosVel(bluePlayer.rmoe,bluePlayer.t0,t);
        burnRmoe = posVel2RMOE(p.r,p.i,p.rdot+bluePlayer.target.rdot,p.idot+bluePlayer.target.idot)
        for(j = 1/fps; j <= frcst; j+=1/fps) {
            p = RMOE2PosVel(burnRmoe,t,t+j);
            targetFuture.lineTo(i2x(p.i), r2y(p.r));
        }
        targetFuture.stroke();
    }

    blueTimeIndic.clear();
    blueTimeIndic.fillStyle(0x444444,.8)
    blueTimeIndic.fillCircle(w/6,.8*h,h/10);
    blueTimeIndic.beginPath();
    
    blueTimeIndic.lineStyle(30 /zoom,0x0000FF,1);
    blueTimeIndic.moveTo(w/6,.7*h);
    
    blueTimeIndic.arc(w/6,.8*h,h/10,-Math.PI/2,-Math.PI/2 + Math.PI*2*math.min((t-bluePlayer.t0)/prepTime,1),false)
    
    blueTimeIndic.stroke();
    if (winner=='blue'){
        blueTimeIndicText.setText("You Win")
    }
    else if (bluePerc>100){
        blueTimeIndicText.setText("Press space\nto disable\nopponent")
    }else if ((t-bluePlayer.t0)/prepTime >= 1){
        blueTimeIndicText.setText("Press space\nto burn")
    }else{
        blueTimeIndicText.setText("Preparing\n to Burn")
    }
    blueTimeIndicText.setX(w/6-blueTimeIndicText.width/2)
    blueTimeIndicText.setY(.8*h-blueTimeIndicText.height/2)

    bluePercIndic.clear();
    bluePercIndic.beginPath();
    bluePercIndic.lineStyle(30 /zoom,0xFF0000,math.max(math.min(bluePerc/100,1),.5));
    bluePercIndic.moveTo(w/6,.65*h);
    bluePercIndic.arc(w/6,.8*h,.15*h,-Math.PI/2,-Math.PI/2 + Math.PI*2*math.min(bluePerc/100,1),false)
    
    bluePercIndic.stroke();
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


//Sun Vector
sunVect.clear();
sunVect.beginPath();
sunVect.lineStyle(5/zoom, 0xFFFF00, 1);
sunVect.moveTo(redPlayer.x, redPlayer.y);

sunVect.lineTo(svec_r.x, svec_r.y);
sunVect.stroke();

//Trajectories
    bFutrTraj.clear();
    bFutrTraj.beginPath();
    bFutrTraj.lineStyle(5/zoom, 0x7777FF, 1.0);
    bFutrTraj.moveTo(bluePlayer.x, bluePlayer.y);
    for(j = 1/fps; j <= frcst; j+=1/fps) {
        p = RMOE2PosVel(bluePlayer.rmoe,bluePlayer.t0,t+j);
        bFutrTraj.lineTo(i2x(p.i), r2y(p.r));
    }
    bFutrTraj.stroke();

    //Dot = abcos(th)
    

    rFutrTraj.clear();
    rFutrTraj.beginPath();
    if (cats<Math.PI-sezCATS){
        rFutrTraj.lineStyle(5/zoom, 0xFF7777, 1.0);
        redPlayer.setTexture('red')
    }else{
        rFutrTraj.lineStyle(5/zoom, 0xFF7777, .2);
        redPlayer.setTexture('red-invisible')
    }
    bFutrTraj.moveTo(redPlayer.x, redPlayer.y);
    for(j = 1/fps; j <= frcst; j+=1/fps) {
        p = RMOE2PosVel(redPlayer.rmoe,redPlayer.t0,t+j);
        rFutrTraj.lineTo(i2x(p.i), r2y(p.r));
    }
    rFutrTraj.stroke();
    

    
    
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
    
    distReqCirc.clear();
    distReqCirc.fillStyle(0xCCCCCC,math.min(math.max((d-largePx)/largePx,0),.3));
    distReqCirc.fillCircle(redPlayer.x,redPlayer.y,largePx);
    distReqCirc.beginPath();
    distReqCirc.lineStyle(2/zoom,0xFFFF00,.6-math.min(math.max((d-largePx)/largePx,0),.55));
    distReqCirc.strokeCircle(redPlayer.x,redPlayer.y,largePx);
    distReqCirc.lineStyle(2/zoom,0x00FF00,.6-math.min(math.max((d-largePx)/largePx,0),.55));
    distReqCirc.strokeCircle(redPlayer.x,redPlayer.y,smallPx);
    distReqCirc.stroke();
    //distReqCirc.fill();

    pez.clear();
    pez.beginPath();
    pez.fillStyle(0xFFFF00, 0.3);
    pez.moveTo(redPlayer.x, redPlayer.y);
    for(j = 0; j < 31; j++) {
        pez.lineTo(redPlayer.x-sunPx*Math.sin(Math.PI + angR2B+(pezCATS-j*(pezCATS-wezCATS)/30)), redPlayer.y+sunPx*Math.cos(Math.PI + angR2B+(pezCATS-j*(pezCATS-wezCATS)/30)));
    }
    pez.moveTo(redPlayer.x, redPlayer.y);
    for(j = 0; j < 31; j++) {
        pez.lineTo(redPlayer.x-sunPx*Math.sin(Math.PI + angR2B+(-pezCATS+j*(pezCATS-wezCATS)/30)), redPlayer.y+sunPx*Math.cos(Math.PI + angR2B+(-pezCATS+j*(pezCATS-wezCATS)/30)));
    }
    pez.lineTo(redPlayer.x, redPlayer.y)
    pez.fill();
    

    wez.clear();
    wez.beginPath();
    wez.fillStyle(0x00FF00, 0.3);
    wez.moveTo(redPlayer.x, redPlayer.y);
    for(j = 0; j < 31; j++) {
        wez.lineTo(redPlayer.x-sunPx*Math.sin(Math.PI + angR2B+(wezCATS-2*j*wezCATS/30)), redPlayer.y+sunPx*Math.cos(Math.PI + angR2B+(wezCATS-2*j*wezCATS/30)));
    }
    wez.lineTo(redPlayer.x, redPlayer.y);
    wez.fill();
    
    sez.clear();
    sez.beginPath();
    sez.fillStyle(0xaaaaaa, 0.4);
    sez.moveTo(redPlayer.x, redPlayer.y);
    sez.lineTo(redPlayer.x-sunPx*Math.sin(angR2B+sezCATS), redPlayer.y+sunPx*Math.cos(angR2B+sezCATS));
    for(j = 1; j < 30; j++) {
        sez.lineTo(redPlayer.x-sunPx*Math.sin(angR2B+(sezCATS-2*j*sezCATS/30)), redPlayer.y+sunPx*Math.cos(angR2B+(sezCATS-2*j*sezCATS/30)));
    }
    sez.lineTo(redPlayer.x, redPlayer.y);
    sez.fill();
  
//Test CATS State
    
    
}