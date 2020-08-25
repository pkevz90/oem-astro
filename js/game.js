// 1 sec prep leaderboard:
//Daniels 26.704 Blue
//Daniels 20.464 Red
//System variables


var w = $(window).width();
var wdraw = math.min([math.max([w,750]),1000]);
var h = $(window).height();
var fps = 60;
var initTime;

//Network Variables
var player = "";
var gameStart = false;
var timerStart = false;
var startTime = 0;
var local = false;


var winner = "";
var winTime=math.Infinity;
var winnerNet="";
var winTimeNet=math.Infinity;


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
var prepTime = 1; //In game seconds between burns

//Gameplay Non-Tunable Variables
var omega = 2*Math.PI/period;
var p1Perc = 0;
var p2Perc = 0;
var p2PercNet = 0;
var p1Col,p2Col,p1LightCol,p2LightCol;
var blueCol = 0x0000FF;
var redCol = 0xFF0000;
var blueLightCol = 0x7777FF;
var redLightCol = 0xFF7777;
var zoom = 1;
var minMsgWait = 3;
var lastMsgT = 0;



//Graphics Variables
var frcst = 1.5*period;
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
    wdraw = math.min([math.max([w,750]),1000])
    h = $(window).height();
    game.scale.resize(w,h);
    orig.clear(); //This seems wrong, but it may be right
    orig.fillStyle(0xFFFFFF,1);
    orig.fillCircle(i2x(0),r2y(0),6);
    orig.lineStyle(3, 0xFFFFFF, 1);
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
    percText.setFontSize((.02*wdraw).toString().concat('px'))
    p2PercText.setFontSize((.02*wdraw).toString().concat('px'))
    timeIndicText.setFontSize((.02*wdraw).toString().concat('px'))
    winText.setFontSize((.035*wdraw).toString().concat('px'))
    wdraw = 1000
};

function preload ()
{
    let fold = 'Media/gameimg/';
    this.load.image('stars', fold.concat('stars.jpg'));
    this.load.image('blue', fold.concat('blue.png'));
    this.load.image('red', fold.concat('red.png'));
    this.load.image('red-invisible', fold.concat('red-invisible.png'));
    this.load.image('blue-invisible', fold.concat('blue-invisible.png'));
}

function create ()
{
    camera = this.cameras.main;
    
    backgroundImg = this.add.image(w/2,h/2,'stars');
    if (w/h > backgroundImg.width/backgroundImg.height){
        backgroundImg.displayWidth=w;
        backgroundImg.scaleY = backgroundImg.scaleX;
    }else{
        backgroundImg.displayHeight=h;
        backgroundImg.scaleX = backgroundImg.scaleY;
    }
    //Graphics in order of lyers bottom to top
    warnRegion = this.add.graphics();
    orig = this.add.graphics();  
    p2FutrTraj = this.add.graphics();
    p1FutrTraj = this.add.graphics();
    
    
    distReqCirc = this.add.graphics();
    pez = this.add.graphics();
    wez = this.add.graphics();
    sez = this.add.graphics();

    

    targetPtRange = this.add.graphics();
    pBlue = this.add.image(0, 0, 'blue');
    pRed = this.add.image(0, 0, 'red');

    pBlue.rmoe = posVel2RMOE(0,.25,.125*omega,0);
    pBlue.x = i2x(0);
    pBlue.y = r2y(.25);

    pRed.rmoe = posVel2RMOE(0,-.25,-.125*omega,0);
    pRed.x = i2x(0);
    pRed.y = r2y(-.25);

    pBlue.t0 = 0;
    pRed.t0 = 0;
    pBlue.setScale(.6);
    pRed.setScale(.6);

    targetPt = this.add.graphics();
    targetFuture = this.add.graphics();
   
    sunVect = this.add.graphics();
    
    percIndic = this.add.graphics();
    timeIndic = this.add.graphics();
    
    percText = this.add.text(w/6,.625*h,"")
    percText.setAlign('center')
    percText.setX(percText.x-percText.width/2)
    percText.setFontSize((.02*wdraw).toString().concat('px'))
    p2PercIndic = this.add.graphics();
    p2PercText = this.add.text(5*w/6,.625*h,"")
    p2PercText.setAlign('center')
    p2PercText.setX(p2PercText.x-p2PercText.width/2)
    p2PercText.setFontSize((.02*wdraw).toString().concat('px'))
    timeIndicText = this.add.text(w/6,.8*h,'');
    timeIndicText.setAlign('center')
    timeIndicText.setFontSize((.02*wdraw).toString().concat('px'))
    timeIndicText.setX(timeIndicText.x-timeIndicText.width/2)
    timeIndicText.setY(timeIndicText.y-timeIndicText.height/2)

    clock = this.add.text(0,0,"");
    winText = this.add.text(0,0,"");
    winText.setFontSize((.035*wdraw).toString().concat('px'))
    winText.setAlign('center')

//Initialize graphics objects
    orig.fillStyle(0xFFFFFF,1)
    orig.fillCircle(i2x(0),r2y(0),6);
    orig.lineStyle(3, 0xFFFFFF, 1);
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
    
    //collider = this.physics.add.collider(p1, p2);
    cursors = this.input.keyboard.createCursorKeys();
}
function publishMsg(player,p1,winner,winTime){
    channel.publish('data',{
        from:player,
        startTime:null,
        rmoe:p1.rmoe,
        winner:winner,
        t0:p1.t0,
        winTime:winTime,
        perc: p1Perc
    });
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
function i2x(i,zoom=1){return(w/2-(i * (1/zoom) * w))};
function r2y(r,zoom=1){return(h/2-(r * (1/zoom) * w))};//scaling using w keeps it scaled correctly
function update ()
{
if (gameStart){
    //Game Timer
    t=((Date.now() - initTime)/1000);
    if (winner == ""){
        clock.setText(t.toString())
    }
    if (t>3+winTime){
        gameStart=false;
    }

    //Network Winner disagreements
    if (winnerNet != winner){
        if (winner == ""){
            winner = winnerNet;
            winTime = winTimeNet;
        }else if(winnerNet == ""){
            publishMsg(player,p1,winner,winTime);
        } else {
            if (winTime > winTimeNet){
                winner = winnerNet;
                winTime = winTimeNet;
            }
        }
    }

    
    //Update Positions
        pos1 = RMOE2PosVel(p1.rmoe,p1.t0,t);
        p1.x = i2x(pos1.i,zoom);
        p1.y = r2y(pos1.r,zoom);
        pos2 = RMOE2PosVel(p2.rmoeVis,p2.t0Vis,t);
        p2.x = i2x(pos2.i,zoom);
        p2.y = r2y(pos2.r,zoom);


    if (math.abs(pos1.i) > .75){
        winText.setColor('white')
        winner = 'p2';
        winTime = t;
    }else if (zoom>1.45 && math.abs(pos1.i) > .5 && winner==""){
        winText.setColor('red');
        winText.setText('Warning: return to the orbital slot!\n(Try burning in the direction of drift)');
        winText.setX(w/2-winText.width/2);
        winText.setY(h/10);
    }else{
        winText.setColor('white');
        winText.setText('');
    }

    //Pixel Value
    sunPx = i2x(sunRange,zoom) - w/2;
    smallPx = -i2x(smallRange,zoom) + w/2;
    largePx = -i2x(largeRange,zoom) + w/2;
    let d = math.norm([p2.x-p1.x,p2.y-p1.y]);
    let isBlue
    let svec_at_p2 = {x: p2.x+(sunPx)*Math.sin((t/period)*2*Math.PI), 
                y: p2.y-(sunPx)*Math.cos((t/period)*2*Math.PI)}

    //Points
    let realir = RMOE2PosVel(p2.rmoe,p2.t0,t);
    let p2real = {x:i2x(realir.i,zoom),y:r2y(realir.r,zoom)}
    let cats = math.acos(math.dot([svec_at_p2.x-p2real.x,svec_at_p2.y-p2real.y],[p1.x-p2real.x,p1.y-p2real.y])/(math.norm([svec_at_p2.x-p2real.x,svec_at_p2.y-p2real.y])*math.norm([p1.x-p2real.x,p1.y-p2real.y])));
    //Cats goes from 0 to pi (pi is bad)
    let minMsgWait = 1;
    if (d<=smallPx){
        if (cats<=wezCATS){
            p1Perc += gdistgsunPPS/fps;
        } else if(cats<=pezCATS){
            p1Perc += gdistysunPPS/fps;
        } else if (cats>=Math.PI-wezCATS){
            p2Perc += gdistgsunPPS/fps;
        } else if (cats>=Math.PI-pezCATS){
            p2Perc += gdistysunPPS/fps;
        }else{
            minMsgWait=3;
            if (math.round(p2Perc,1) != math.round(p2PercNet,1)){
                p2Perc += math.sign(p2PercNet-p2Perc)*.03
            }
        }
    }else if(d<=largePx){
        if (cats<=wezCATS){
            p1Perc += ydistgsunPPS/fps;
        } else if(cats<=pezCATS){
            p1Perc += ydistysunPPS/fps;
        } else if (cats>=Math.PI-wezCATS){
            p2Perc += ydistgsunPPS/fps;
        } else if (cats>=Math.PI-pezCATS){
            p2Perc += ydistysunPPS/fps;
        }else{
            minMsgWait=5;
            if (math.round(p2Perc,1) != math.round(p2PercNet,1)){
                p2Perc += math.sign(p2PercNet-p2Perc)*.03
            }
        }
    }else{
        minMsgWait=3;
        if (math.round(p2Perc,1) != math.round(p2PercNet,1)){
            p2Perc += math.sign(p2PercNet-p2Perc)*.03
        }
    }

    if (t-lastMsgT > minMsgWait){
        publishMsg(player,p1,winner,winTime)
        lastMsgT = t;
    }

    if (p1Perc>100){
        winner = "p1"
        winTime = t;
    }else if (p2Perc > 100){
        winner = "p2"
        winTime = t;
    }
    if (winner == "p1"){
        winText.setText("You Win!")
        winText.setX(w/2-winText.width/2);
        winText.setY(h/10);
    } else if(winner == "p2"){
        winText.setText("You Lose!")
        winText.setX(w/2-winText.width/2);
        winText.setY(h/10);
    }

    //Arrow Keys
    if (cursors.up.isDown){
        p1.target.rdot += .02*maxBurnDV;
    }
    if (cursors.down.isDown){
        p1.target.rdot -= .02*maxBurnDV;
    }
    if (cursors.right.isDown){
        p1.target.idot -= .02*maxBurnDV;
    }
    if (cursors.left.isDown){
        p1.target.idot += .02*maxBurnDV;
    }
    if (math.norm([p1.target.idot,p1.target.rdot])>maxBurnDV){
        p1.target.idot = maxBurnDV * p1.target.idot/math.norm([p1.target.idot,p1.target.rdot]);
        p1.target.rdot = maxBurnDV * p1.target.rdot/math.norm([p1.target.idot,p1.target.rdot])
    }
    if (cursors.space.isDown && (t-p1.t0)/prepTime >= 1 && (p1.target.idot + p1.target.rdot != 0)){
        p = RMOE2PosVel(p1.rmoe,p1.t0,t);
        p1.rmoe = posVel2RMOE(p.r,p.i,p.rdot+p1.target.rdot,p.idot+p1.target.idot); 
        p1.target.idot=0;
        p1.target.rdot=0;
        p1.t0=t;
        if (!local){
            publishMsg(player,p1,winner,winTime);
            lastMsgT = t;
        }
    }
    targetPtRange.clear();

    targetPt.clear();
    targetFuture.clear();
    let visualDVMult = .1/maxBurnDV;
    if (cursors.up.isDown || cursors.down.isDown || cursors.left.isDown || cursors.right.isDown){
        targetPtRange.fillStyle(0xCCCCCC,.6)
        targetPtRange.fillCircle(p1.x,p1.y,w*maxBurnDV*visualDVMult + 10)
    }
    if (p1.target.idot != 0 || p1.target.rdot != 0){
        targetPt.lineStyle(2/zoom, 0xFFFFFF, 1.0)
        targetPt.beginPath();
        targetPt.moveTo(p1.x,p1.y)
        targetPt.lineTo(p1.x - w*p1.target.idot*visualDVMult,
            p1.y - w*p1.target.rdot*visualDVMult);
        targetPt.stroke();
        
        targetPt.fillStyle(p1Col,1)
        targetPt.fillCircle(p1.x - w*p1.target.idot*visualDVMult,
                            p1.y - w*p1.target.rdot*visualDVMult,
                            8)
        targetPt.strokeCircle(p1.x - w*p1.target.idot*visualDVMult,
                            p1.y - w*p1.target.rdot*visualDVMult,
                            8);
        
        targetFuture.lineStyle(5/zoom, 0xFFFFFF, .6)
        targetFuture.beginPath()
        targetFuture.moveTo(p1.x, p1.y);
        p = RMOE2PosVel(p1.rmoe,p1.t0,t);
        burnRmoe = posVel2RMOE(p.r,p.i,p.rdot+p1.target.rdot,p.idot+p1.target.idot)
        for(j = 1/fps; j <= frcst; j+=1/fps) {
            p = RMOE2PosVel(burnRmoe,t,t+j);
            targetFuture.lineTo(i2x(p.i,zoom), r2y(p.r,zoom));
        }
        targetFuture.stroke();
    }

    timeIndic.clear();
    timeIndic.fillStyle(0x444444,.8)
    timeIndic.fillCircle(w/6,.8*h,wdraw/10);
    timeIndic.beginPath();
    
    timeIndic.lineStyle(.025*wdraw,p1Col,1);
    timeIndic.moveTo(w/6,.8*h-.1*wdraw);
    
    timeIndic.arc(w/6,.8*h,wdraw/10,-Math.PI/2,-Math.PI/2 + Math.PI*2*math.min((t-p1.t0)/prepTime,1),false)
    
    timeIndic.stroke();
    if ((t-p1.t0)/prepTime >= 1){
        timeIndicText.setText("Press space\nto burn")
    }else{
        timeIndicText.setText("Preparing\n to Burn")
    }
    timeIndicText.setX(w/6-timeIndicText.width/2)
    timeIndicText.setY(.8*h-timeIndicText.height/2)

    percIndic.clear();
    percIndic.beginPath();
    percIndic.lineStyle(.025*wdraw,p2LightCol,.2);
    percIndic.arc(w/6,.8*h,.125*wdraw,-Math.PI/2,3*Math.PI/2);
    percIndic.closePath();
    percIndic.stroke();
    percIndic.beginPath();
    percIndic.lineStyle(.025*wdraw ,p2Col,math.max(math.min(p1Perc/100,1),.5));
    percIndic.arc(w/6,.8*h,.125*wdraw,-Math.PI/2,-Math.PI/2 + Math.PI*2*math.min(p1Perc/100,1),false)
    percIndic.stroke();
    percText.setText("You are \n".concat(math.min(math.round(p1Perc,0),100).toString().concat('% Done Researching')))
    percText.setX(w/6-percText.width/2)
    percText.setY(.8*h-.2*wdraw)

    p2PercIndic.clear();
    p2PercIndic.beginPath();
    p2PercIndic.lineStyle(.025*h,p1LightCol,.2);
    p2PercIndic.arc(5*w/6,.8*h,.075*wdraw,-Math.PI/2,3*Math.PI/2);
    p2PercIndic.closePath();
    p2PercIndic.stroke();
    p2PercIndic.beginPath();
    p2PercIndic.lineStyle(.025*h,p1Col,math.max(math.min(p2Perc/100,1),.5));
    p2PercIndic.arc(5*w/6,.8*h,.075*wdraw,-Math.PI/2,-Math.PI/2 + Math.PI*2*math.min(p2Perc/100,1),false)
    p2PercIndic.stroke();
    p2PercText.setText("They are \n".concat(math.min(math.round(p2Perc,0),100).toString().concat('% Done Researching')))
    p2PercText.setX(5*w/6-p2PercText.width/2)
    p2PercText.setY(.7*h)


    //Sun Vector
    sunVect.clear();
    sunVect.beginPath();
    sunVect.lineStyle(5/zoom, 0xFFFF00, 1);
    sunVect.moveTo(p2.x, p2.y);

    sunVect.lineTo(svec_at_p2.x, svec_at_p2.y);
    sunVect.stroke();

    //Trajectories
    let maxI = 0;
    p1FutrTraj.clear();
    p1FutrTraj.beginPath();
    p1FutrTraj.lineStyle(5/zoom, p1LightCol, .8);
    p1FutrTraj.moveTo(p1.x, p1.y);
    for(j = 1/fps; j <= frcst; j+=1/fps) {
        p = RMOE2PosVel(p1.rmoe,p1.t0,t+j);
        maxI = math.max([maxI,math.abs(p.i)]);
        p1FutrTraj.lineTo(i2x(p.i,zoom), r2y(p.r,zoom));
    }
    p1FutrTraj.stroke();    

    p2FutrTraj.clear();
    p2FutrTraj.beginPath();
    if (cats<Math.PI-sezCATS){
        p2.rmoeVis=p2.rmoe;
        p2.t0Vis = p2.t0;
        p2FutrTraj.lineStyle(5/zoom, p2LightCol, 1.0);
        if (player == 'blue'){
            p2.setTexture('red')
        }else{
            p2.setTexture('blue')
        }
    }else{
        //Don't update rmoeVis
        p2FutrTraj.lineStyle(5/zoom, p2LightCol, .2);
        if (player == 'blue'){
            p2.setTexture('red-invisible')
        }else{
            p2.setTexture('blue-invisible')
        }
    }
    p2FutrTraj.moveTo(p2.x, p2.y);
    for(j = 1/fps; j <= frcst; j+=1/fps) {
        p = RMOE2PosVel(p2.rmoeVis,p2.t0Vis,t+j);
        maxI = math.max([maxI,math.abs(p.i)]);
        p2FutrTraj.lineTo(i2x(p.i,zoom), r2y(p.r,zoom));
    }
    p2FutrTraj.stroke();
    
    
    zoom=(zoom+(math.min([math.max([(((maxI-.5)*2)+1.1), 1]),1.5]))*.05)/1.05;
    pBlue.setScale(.6/zoom)
    pRed.setScale(.6/zoom)
    //Warning Region
    warnRegion.clear();
    warnRegion.moveTo(i2x(.75,zoom),0);

    levels = 20;
    for (i=0;i<levels;i++){
        warnRegion.fillStyle(0xFF3333,.3*(i+1)/levels)
        if (i==levels-1){
            warnRegion.fillStyle(0xFF3333,.8)
        }
        warnRegion.beginPath();
        warnRegion.moveTo(i2x(.5+(i*(.25/levels)),zoom),0);
        warnRegion.lineTo(i2x(.5+(i*(.25/levels)),zoom),h);  
        warnRegion.lineTo(i2x(.5+((i+1)*(.25/levels)),zoom),h); 
        warnRegion.lineTo(i2x(.5+((i+1)*(.25/levels)),zoom),0);
        warnRegion.lineTo(i2x(.5+(i*(.25/levels)),zoom),0);
        warnRegion.closePath();
        warnRegion.fill();

        warnRegion.beginPath();
        warnRegion.moveTo(i2x(-.5-(i*(.25/levels)),zoom),0);
        warnRegion.lineTo(i2x(-.5-(i*(.25/levels)),zoom),h);  
        warnRegion.lineTo(i2x(-.5-((i+1)*(.25/levels)),zoom),h); 
        warnRegion.lineTo(i2x(-.5-((i+1)*(.25/levels)),zoom),0);
        warnRegion.lineTo(i2x(-.5-(i*(.25/levels)),zoom),0);
        warnRegion.closePath();
        warnRegion.fill();
    }
    //warnRegion.fillStyle(0xFF6666,.6);

        
    //Auto Rotation
    if(p1.y-p2.y>=0){
        p1.angle = -Math.atan((p1.x-p2.x)/(p1.y-p2.y))*180/Math.PI;
        p2.angle = -Math.atan((p1.x-p2.x)/(p1.y-p2.y))*180/Math.PI-180;
        angR2B = -Math.atan((p1.x-p2.x)/(p1.y-p2.y)) + Math.PI;
    }else{
        p1.angle = -Math.atan((p1.x-p2.x)/(p1.y-p2.y))*180/Math.PI - 180;
        p2.angle = -Math.atan((p1.x-p2.x)/(p1.y-p2.y))*180/Math.PI;
        angR2B = -Math.atan((p1.x-p2.x)/(p1.y-p2.y));
    }  
    
    //CATS Zones
    distReqCirc.clear();
    distReqCirc.fillStyle(0xCCCCCC,math.min(math.max((d-largePx)/largePx,0),.15));
    distReqCirc.fillCircle(p2.x,p2.y,largePx);
    distReqCirc.beginPath();
    distReqCirc.lineStyle(2/zoom,0xFFFF00,.6-math.min(math.max((d-largePx)/largePx,0),.55));
    distReqCirc.strokeCircle(p2.x,p2.y,largePx);
    distReqCirc.lineStyle(2/zoom,0x00FF00,.6-math.min(math.max((d-largePx)/largePx,0),.55));
    distReqCirc.strokeCircle(p2.x,p2.y,smallPx);
    distReqCirc.stroke();
    //distReqCirc.fill();

    pez.clear();
    pez.beginPath();
    pez.fillStyle(0xFFFF00, 0.3);
    pez.moveTo(p2.x, p2.y);
    for(j = 0; j < 31; j++) {
        pez.lineTo(p2.x+sunPx*Math.sin(Math.PI + angR2B+(pezCATS-j*(pezCATS-wezCATS)/30)), p2.y-sunPx*Math.cos(Math.PI + angR2B+(pezCATS-j*(pezCATS-wezCATS)/30)));
    }
    pez.moveTo(p2.x, p2.y);
    for(j = 0; j < 31; j++) {
        pez.lineTo(p2.x+sunPx*Math.sin(Math.PI + angR2B+(-pezCATS+j*(pezCATS-wezCATS)/30)), p2.y-sunPx*Math.cos(Math.PI + angR2B+(-pezCATS+j*(pezCATS-wezCATS)/30)));
    }
    pez.lineTo(p2.x, p2.y)
    pez.fill();
    

    wez.clear();
    wez.beginPath();
    wez.fillStyle(0x00FF00, 0.3);
    wez.moveTo(p2.x, p2.y);
    for(j = 0; j < 31; j++) {
        wez.lineTo(p2.x+sunPx*Math.sin(Math.PI + angR2B+(wezCATS-2*j*wezCATS/30)), p2.y-sunPx*Math.cos(Math.PI + angR2B+(wezCATS-2*j*wezCATS/30)));
    }
    wez.lineTo(p2.x, p2.y);
    wez.fill();
    
    sez.clear();
    sez.beginPath();
    sez.fillStyle(0xaaaaaa, 0.4);
    sez.moveTo(p2.x, p2.y);
    sez.lineTo(p2.x+sunPx*Math.sin(angR2B+sezCATS), p2.y-sunPx*Math.cos(angR2B+sezCATS));
    for(j = 1; j < 30; j++) {
        sez.lineTo(p2.x+sunPx*Math.sin(angR2B+(sezCATS-2*j*sezCATS/30)), p2.y-sunPx*Math.cos(angR2B+(sezCATS-2*j*sezCATS/30)));
    }
    sez.lineTo(p2.x, p2.y);
    sez.fill();
    
    //Test CATS State
        
}else{
    let time = new Date().getTime();
    if (timerStart && !gameStart && time >= startTime){
        winText.setText("");
        gameStart=true;
        initTime = Date.now();
        console.log("starting")
    }
    if (timerStart && time < startTime){
        winText.setText("T-"+(-1*math.round((time - startTime)/1000,1)).toFixed(1))
        winText.setX(w/2-winText.width/2);
        winText.setY(h/10);
    }
    if (player=="red"){
        p1=pRed;
        p1.target = {idot:0,rdot:0};
        p2=pBlue;
        p2.rmoeVis = p2.rmoe;
        p2Col = blueCol;
        p1Col = redCol;
        p2LightCol = blueLightCol;
        p1LightCol = redLightCol;
        p2.t0Vis = p2.t0;
    }else if(player=="blue"){
        p1=pBlue;
        p1.target = {idot:0,rdot:0};
        p2=pRed;
        p1Col = blueCol;
        p2Col = redCol;
        p1LightCol = blueLightCol;
        p2LightCol = redLightCol;
        p2.rmoeVis = p2.rmoe;
        p2.t0Vis = p2.t0;
    }
}   
}