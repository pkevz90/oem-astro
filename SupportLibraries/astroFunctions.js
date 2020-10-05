function thetaGMST(JDUTI) {
    // Good
    TUTI = (JDUTI-2451545)/36525;
    theta = 67310.54841+(876600*3600+8640184.812866)*TUTI+0.093104*TUTI*TUTI-6.2e-6*Math.pow(TUTI,3);
    if (theta > 0) {
        theta = theta % 86400;
    }
    else {
        theta = theta % (-86400);
    }
    return theta / 240;
}

function sunVectorCalc(JDUTI) {
    // Good
    TUTI = (JDUTI-2451545)/36525;
    lambdaMO= 280.4606184+36000.77005361*TUTI;
    MO = 357.5277233+35999.05034*TUTI;
    lambda_el = lambdaMO+1.914666471*Math.sin(MO*Math.PI/180)+0.019994643*Math.sin(2*MO*Math.PI/180);
    epsilon = 23.43929-0.013004*2*TUTI;
    return [[Math.cos(lambda_el*Math.PI/180)], [Math.cos(epsilon*Math.PI/180)*Math.sin(lambda_el*Math.PI/180)], [Math.sin(epsilon*Math.PI/180)*Math.sin(lambda_el*Math.PI/180)]];
}

function julianDateCalc(time) {
    // Good
    let yr = time[0], mo = time[1], d = time[2], h = time[3], min = time[4], s = 0;
    return 367*yr-Math.floor(7*(yr+Math.floor((mo+9)/12))/4)+Math.floor(275*mo/9)+d+
        1721013.5+((s/60+min)/60+h)/24;
}

function julianDateCalcStruct(time) {
    // Good
    return 367*time.year-Math.floor(7*(time.year+Math.floor((time.month+9)/12))/4)+Math.floor(275*time.month/9)+time.day+
        1721013.5+((time.second/60+time.minute)/60+time.hour)/24;
}

function moonVectorCalc(JDTBD) {
    T = (JDTBD-2451545)/36525;

    lam = 218.32+481267.8813*T+6.29*Math.sin((134.9+477198.85*T)*Math.PI/180)-
        1.27*Math.sin((259.2-413335.38*T)*Math.PI/180)+0.66*Math.sin((235.7+890534.23*T)*Math.PI/180)+
        0.21*Math.sin((269.9+954397.7*T)*Math.PI/180)-0.19*Math.sin((357.5+35999.05*T)*Math.PI/180)-
        0.11*Math.sin((186.6+966404.05*T)*Math.PI/180);
    phi = 5.13*Math.sin((93.3+483202.03*T)*Math.PI/180)+0.28*Math.sin((228.2+960400.87*T)*Math.PI/180)-
        0.28*Math.sin((318.3+6003.18*T)*Math.PI/180)-0.17*Math.sin((217.6-407332.2*T)*Math.PI/180);
    eps = 23.439291-0.0130042*T;

    return [[Math.cos(phi*Math.PI/180)*Math.cos(lam*Math.PI/180)],
           [Math.cos(eps*Math.PI/180)*Math.cos(phi*Math.PI/180)*Math.sin(lam*Math.PI/180)-Math.sin(eps*Math.PI/180)*Math.sin(phi*Math.PI/180)],
           [Math.sin(eps*Math.PI/180)*Math.cos(phi*Math.PI/180)*Math.sin(lam*Math.PI/180)+Math.cos(eps*Math.PI/180)*Math.sin(phi*Math.PI/180)]];

}

function Coe2PosVel(coe) {
    let p = coe[0]*(1-coe[1]*coe[1]);
    let cTa = Math.cos(coe[5]);
    let sTa = Math.sin(coe[5]);
    let r = [[p*cTa/(1+coe[1]*cTa)],
        [p*sTa/(1+coe[1]*cTa)],
        [0]];
    let constA = Math.sqrt(398600.4418/p);
    let v = [[-constA*sTa],
            [(coe[1]+cTa)*constA],
            [0]];
    let cRa = Math.cos(coe[3]); let sRa = Math.sin(coe[3]); 
    let cAr = Math.cos(coe[4]); let sAr = Math.sin(coe[4]);
    let cIn = Math.cos(coe[2]); let sin = Math.sin(coe[2]);
    R = [[cRa*cAr-sRa*sAr*cIn, -cRa*sAr-sRa*cAr*cIn, sRa*sin],
         [sRa*cAr+cRa*sAr*cIn, -sRa*sAr+cRa*cAr*cIn, -cRa*sin],
         [sAr*sin, cAr*sin, cIn]];
    return [math.multiply(R,r),math.multiply(R,v)];
}

function PosVel2Coe(posvel) {
    let mu = 398600.4418;
    let r = [posvel[0][0][0],posvel[0][1][0],posvel[0][2][0]];
    let v = [posvel[1][0][0],posvel[1][1][0],posvel[1][2][0]];
    let rn = math.norm(r);
    let vn = math.norm(v);
    let h = math.cross(r,v);
    let hn = math.norm(h);
    let n = math.cross([0,0,1],h);
    let nn = math.norm(n);
    if (nn < 0.00001) {
        n = [1,0,0];
        nn = 1;
    }
    var epsilon = vn*vn/2-mu/rn;
    let a = -mu/2/epsilon;
    let e = math.subtract(math.dotDivide(math.cross(v,h),[mu,mu,mu]),math.dotDivide(r,[rn,rn,rn]));
    let en = math.norm(e);
    if (en < 0.00000001) {
        e = [1,0,0];
        en = 0;
    }
    let inc = Math.aMath.cos(math.dot(h,[0,0,1])/hn);
    let ra = Math.aMath.cos(math.dot(n,[1,0,0])/nn);
    if (n[1] < 0) {
        ra = 2*Math.PI-ra;
    }
    
    // console.log(e,n,r,en,nn)
    let ar;
    if (en === 0) {
        ar = 0;
    }
    else {
        ar = Math.acos(math.dot(n,e)/en/nn);
    }
    if (e[2] < 0) {
        ar = 2*Math.PI-ar;
    }
    let ta;
    if (en === 0) {
        ta = Math.acos(math.dot(r,e)/rn);
    }
    else {
        ta = Math.acos(math.dot(r,e)/rn/en);
    }
    if (r[1] < 0) {
        ta = 2*Math.PI-ta;
    }
    if (Number.isNaN(ta)) {
        if (math.dot(r,e) < 0){
            ta = Math.PI;
        }
        else{
            ta = 0;
        }
            
    }
    // console.log([a,en,inc,ra,ar,ta])
    return [a,en,inc,ra,ar,ta];
}

function True2Eccentric(e,ta) {
    return Math.atan(Math.sqrt((1-e)/(1+e))*Math.tan(ta/2))*2;
}

function Eccentric2True(e,E) {
    return Math.atan(Math.sqrt((1+e)/(1-e))*Math.tan(E/2))*2;
}

function solveKeplersEquation(M,e) {
    let E = M;
    let del = 1;
    while (Math.abs(del) > 1e-6) {
        del = (E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
        E -= del;
    }
    return E;
}

function twoBodyProp(coe,dt) {
    let n = Math.sqrt(398600.4418/coe[0]/coe[0]/coe[0]);
    let E = True2Eccentric(coe[1],coe[5]);
    let M = E-coe[1]*Math.sin(E);
    if (dt === 'apogee') {
        dt = (Math.PI-M)/n;
    }
    else if (dt === 'perigee') {
        dt = (2*Math.PI-M)/n;
    }
    M += n*dt;
    E = solveKeplersEquation(M,coe[1]);
    coe[5] = Eccentric2True(coe[1],E);
    return coe;
}

function RotMat(axis,theta,degrees) {
    if (degrees !== undefined){
        theta *= Math.PI/180;
    }
    let cs = Math.cos(theta), sn = Math.sin(theta);
    if (axis === 1) {
        return [[1, 0, 0],[0, cs, sn],[0, -sn, cs]]
    }
    else if (axis === 2) {
        return [[cs, 0, sn],[0, 1, 0],[-sn, 0, cs]]
    }
    else {
        return [[cs, -sn, 0],[sn, cs, 0],[0, 0, 1]]
    }
}

function Eci2Ecef (siderealTime, eciPos) {
    let R = RotMat(3,-siderealTime,'degrees');
    // console.log(R,eciPos)

    return math.multiply(R,eciPos);
}

function PhiRR(t,n){
	if (n === undefined){
		n = 2*Math.PI/86164;
	}
	let nt = n*t;
	return [[4-3*Math.cos(nt),0],[6*(Math.sin(nt)-nt), 1]];
}

function PhiRV(t,n){
	if (n === undefined){
		n = 2*Math.PI/86164;
	}
	let nt = n*t;
	return [[Math.sin(nt)/n, 2*(1-Math.cos(nt))/n],[(Math.cos(nt)-1)*2/n, (4*Math.sin(nt)-3*nt)/n]];
}

function PhiVR(t,n){
	if (n === undefined){
		n = 2*Math.PI/86164;
	}
	let nt = n*t;
	return [[3*n*Math.sin(nt), 0],[6*n*(Math.cos(nt)-1), 0]];
}

function PhiVV(t,n){
	if (n === undefined){
		n = 2*Math.PI/86164;
	}
	let nt = n*t;
	return [[Math.cos(nt), 2*Math.sin(nt)],[-2*Math.sin(nt), 4*Math.cos(nt)-3]];
}

function PhiRR3d(t,n){
	if (n === undefined){
		n = 2*Math.PI/86164;
	}
	let nt = n*t;
	return [[4-3*Math.cos(nt),0,0],[6*(Math.sin(nt)-nt), 1,0],[0,0,Math.cos(nt)]];
}

function PhiRV3d(t,n){
	if (n === undefined){
		n = 2*Math.PI/86164;
	}
	let nt = n*t;
	return [[Math.sin(nt)/n, 2*(1-Math.cos(nt))/n,0],[(Math.cos(nt)-1)*2/n, (4*Math.sin(nt)-3*nt)/n,0],[0,0,Math.sin(nt)/n]];
}

function PhiVR3d(t,n){
	if (n === undefined){
		n = 2*Math.PI/86164;
	}
	let nt = n*t;
	return [[3*n*Math.sin(nt), 0, 0],[6*n*(Math.cos(nt)-1), 0, 0],[0,0,-n*Math.sin(nt)]];
}

function PhiVV3d(t,n){
	if (n === undefined){
		n = 2*Math.PI/86164;
	}
	let nt = n*t;
	return [[Math.cos(nt), 2*Math.sin(nt), 0],[-2*Math.sin(nt), 4*Math.cos(nt)-3, 0],[0,0,Math.cos(nt)]];
}

function rmoe2state(rmoe,n,degrees) {
    // [ae,xd,yd,B,zmax,M]
    if (rmoe.length < 5) {
        rmoe.push(0); rmoe.push(0);
    }
    if (n === undefined) {
        n = 2*Math.PI/86164;
    }
    if (degrees) {
        rmoe[3] *= Math.PI/180;
        rmoe[5] *= Math.PI/180;
    }
    return [[-rmoe[0]/2*Math.cos(rmoe[3])+rmoe[1]],
            [rmoe[0]*Math.sin(rmoe[3])+rmoe[2]],
            [rmoe[4]*Math.sin(rmoe[5])],
            [rmoe[0]*n/2*Math.sin(rmoe[3])],
            [rmoe[0]*n*Math.cos(rmoe[3])-1.5*rmoe[1]*n],
            [rmoe[4]*n*Math.cos(rmoe[5])]];
}

function state2rmoe(state,n,degrees) {
}

function groundSwath(radius,deg) {
    if (deg){
        return Math.acos(6371/radius)*180/Math.PI;
    }
    else {
        return Math.acos(6371/radius);
    }
}

function hcwEquations(state,T,n) {
    // state [x,dx,y,dy,z,dz]
    // T [Tx, Ty, Tz]
    if (n === undefined) {
        n = 2*Math.PI/86164;
    }
    if (T === undefined) {
        T = [0,0,0]
    }
    if (state[4] === undefined) {
        return [[state[1][0]],[3*n*n*state[0][0]+2*n*state[3][0]+T[0]],[state[3][0]],[-2*n*state[1][0]+T[1]]];
    }
    else {
        // return [[3*n*n*state[0][0]+2*n*state[3][0]+T[0]],[-2*n*state[1][0]+T[1]],[-n*n*state[4]]];
    }
}

function hcwBurnClosed(state,a0,theta,t,n) {
    if (n === undefined) {
        n = 2*Math.PI/86164;
    }
    let r0 = state.x, i0 = state.y, rd0 = state.xd, id0 = state.yd, radf, inTf, radfVel, inTfVel;
    radf = radialPosClosed(r0,rd0,id0,a0,theta,0,t,n);
    radfVel = radialVelClosed(r0,rd0,id0,a0,theta,0,t,n);
    inTf = intrackPosClosed(r0,rd0,i0,id0,a0,theta,0,t,n);
    inTfVel = intrackVelClosed(r0,rd0,id0,a0,theta,0,t,n);
    // console.log(radfVel,inTfVel)
    return [radf,inTf,radfVel,inTfVel];
}

function oneBurnFiniteHcw (state,alpha,phi,tB,t,a0,n) {
    if (n === undefined) {
        n = 2*Math.PI/86164;
    }
    x0 = state.x; xd0 = state.xd;
    y0 = state.y; yd0 = state.yd;
    z0 = state.z; zd0 = state.zd;
    console.log(x0,y0,z0)
    let xM = radialPosClosed(x0,xd0,yd0,a0,alpha,phi,tB*t,n);
    let xdM = radialVelClosed(x0,xd0,yd0,a0,alpha,phi,tB*t,n);
    let yM = intrackPosClosed(x0,xd0,y0,yd0,a0,alpha,phi,tB*t,n);
    let ydM = intrackVelClosed(x0,xd0,yd0,a0,alpha,phi,tB*t,n);
    let zM = crosstrackPosClosed(z0,zd0,a0,phi,tB*t,n);
    let zdM = crosstrackVelClosed(z0,zd0,a0,phi,tB*t,n);
    let xF = radialPosClosed(xM,xdM,ydM,0,0,0,t-tB*t,n);
    let xdF = radialVelClosed(xM,xdM,ydM,0,0,0,t-tB*t,n);
    let yF = intrackPosClosed(xM,xdM,yM,ydM,0,0,0,t-tB*t,n);
    let ydF = intrackVelClosed(xM,xdM,ydM,0,0,0,t-tB*t,n);
    let zF = crosstrackPosClosed(zM,zdM,0,0,t-tB*t,n);
    let zdF = crosstrackVelClosed(zM,zdM,0,0,t-tB*t,n);
    return {
        x: xF,
        y: yF,
        z: zF,
        xd: xdF,
        yd: ydF,
        zd: zdF
    };

}

function twoBurnFiniteHcw (state,alpha1,phi1,alpha2,phi2,tB1,tB2,tf,a0,n) {
    if (n === undefined) {
        n = 2*Math.PI/86164;
    }
    x0 = state.x; xd0 = state.xd;
    y0 = state.y; yd0 = state.yd;
    z0 = state.z; zd0 = state.zd;
    let t1 = tB1*tf, t2 = tf-tB1*tf-tB2*tf, t3 = tB2*tf;
    let xM1 = radialPosClosed(x0,xd0,yd0,a0,alpha1,phi1,t1,n);
    let xdM1 = radialVelClosed(x0,xd0,yd0,a0,alpha1,phi1,t1,n);
    let yM1 = intrackPosClosed(x0,xd0,y0,yd0,a0,alpha1,phi1,t1,n);
    let ydM1 = intrackVelClosed(x0,xd0,yd0,a0,alpha1,phi1,t1,n);
    let zM1 = crosstrackPosClosed(z0,zd0,a0,phi1,t1,n);
    let zdM1 = crosstrackVelClosed(z0,zd0,a0,phi1,t1,n);
    let xM2 = radialPosClosed(xM1,xdM1,ydM1,0,0,0,t2,n);
    let xdM2 = radialVelClosed(xM1,xdM1,ydM1,0,0,0,t2,n);
    let yM2 = intrackPosClosed(xM1,xdM1,yM1,ydM1,0,0,0,t2,n);
    let ydM2 = intrackVelClosed(xM1,xdM1,ydM1,0,0,0,t2,n);
    let zM2 = crosstrackPosClosed(zM1,zdM1,0,0,t2,n);
    let zdM2 = crosstrackVelClosed(zM1,zdM1,0,0,t2,n);
    let xF = radialPosClosed(xM2,xdM2,ydM2,a0,alpha2,phi2,t3,n);
    let xdF = radialVelClosed(xM2,xdM2,ydM2,a0,alpha2,phi2,t3,n);
    let yF = intrackPosClosed(xM2,xdM2,yM2,ydM2,a0,alpha2,phi2,t3,n);
    let ydF = intrackVelClosed(xM2,xdM2,ydM2,a0,alpha2,phi2,t3,n);
    let zF = crosstrackPosClosed(zM2,zdM2,a0,phi2,t3,n);
    let zdF = crosstrackVelClosed(zM2,zdM2,a0,phi2,t3,n);
    return {
        x: xF,
        y: yF,
        z: zF,
        xd: xdF,
        yd: ydF,
        zd: zdF
    };

}

function radialPosClosed(x0,xd0,yd0,a0,alpha,phi,t,n) {
    return (4*Math.pow(n,2)*x0+2*n*yd0-3*Math.pow(n,2)*x0*Math.cos(n*t)-2*n*yd0*Math.cos(n*t)-a0*Math.cos(alpha)*Math.cos(phi)*Math.cos(n*t)+a0*Math.cos(alpha)*Math.cos(phi)*Math.pow(Math.cos(n*t),2)+2*a0*n*t*Math.cos(phi)*Math.sin(alpha)+n*xd0*Math.sin(n*t)-2*a0*Math.cos(phi)*Math.sin(alpha)*Math.sin(n*t)+a0*Math.cos(alpha)*Math.cos(phi)*Math.pow(Math.sin(n*t),2))/Math.pow(n,2);
}

function intrackPosClosed(x0,xd0,y0,yd0,a0,alpha,phi,t,n) {
    return (-12*Math.pow(n,3)*t*x0-4*n*xd0+2*Math.pow(n,2)*y0-6*Math.pow(n,2)*t*yd0-4*a0*n*t*Math.cos(alpha)*Math.cos(phi)+4*n*xd0*Math.cos(n*t)-3*a0*Math.pow(n,2)*Math.pow(t,2)*Math.cos(phi)*Math.sin(alpha)-8*a0*Math.cos(phi)*Math.cos(n*t)*Math.sin(alpha)+8*a0*Math.cos(phi)*Math.pow(Math.cos(n*t),2)*Math.sin(alpha)+12*Math.pow(n,2)*x0*Math.sin(n*t)+8*n*yd0*Math.sin(n*t)+4*a0*Math.cos(alpha)*Math.cos(phi)*Math.sin(n*t)+8*a0*Math.cos(phi)*Math.sin(alpha)*Math.pow(Math.sin(n*t),2))/(2*Math.pow(n,2));
}

function crosstrackPosClosed(z0,zd0,a0,phi,t,n) {
    return (Math.pow(n,2)*z0*Math.cos(n*t)+a0*Math.sin(phi)-a0*Math.cos(n*t)*Math.sin(phi)+n*zd0*Math.sin(n*t))/Math.pow(n,2);
}

function radialVelClosed(x0,xd0,yd0,a0,alpha,phi,t,n) {
    return (Math.pow(n,2)*xd0*Math.cos(n*t)+2*a0*n*Math.cos(phi)*Math.sin(alpha)-2*a0*n*Math.cos(phi)*Math.cos(n*t)*Math.sin(alpha)+3*Math.pow(n,3)*x0*Math.sin(n*t)+2*Math.pow(n,2)*yd0*Math.sin(n*t)+a0*n*Math.cos(alpha)*Math.cos(phi)*Math.sin(n*t))/Math.pow(n,2);
}

function intrackVelClosed(x0,xd0,yd0,a0,alpha,phi,t,n) {
    return (-12*Math.pow(n,3)*x0-6*Math.pow(n,2)*yd0-4*a0*n*Math.cos(alpha)*Math.cos(phi)+12*Math.pow(n,3)*x0*Math.cos(n*t)+8*Math.pow(n,2)*yd0*Math.cos(n*t)+4*a0*n*Math.cos(alpha)*Math.cos(phi)*Math.cos(n*t)-6*a0*Math.pow(n,2)*t*Math.cos(phi)*Math.sin(alpha)-4*Math.pow(n,2)*xd0*Math.sin(n*t)+8*a0*n*Math.cos(phi)*Math.sin(alpha)*Math.sin(n*t))/(2*Math.pow(n,2));
}

function crosstrackVelClosed(z0,zd0,a0,phi,t,n) {
    return (Math.pow(n,2)*zd0*Math.cos(n*t)-Math.pow(n,3)*z0*Math.sin(n*t)+a0*n*Math.sin(phi)*Math.sin(n*t))/Math.pow(n,2);
}

function hcwFiniteBurnOneBurn(stateInit, stateFinal, n, tf, a0) {
    if (n === undefined) {n = 2*Math.PI/86164;}
    state = [[stateInit.x],[stateInit.y],[stateInit.z],[stateInit.xd],[stateInit.yd],[stateInit.zd]];
    stateFinal = [[stateFinal.x],[stateFinal.y],[stateFinal.z],[stateFinal.xd],[stateFinal.yd],[stateFinal.zd]];
    let v = proxOpsTargeter(state.slice(0,3),stateFinal.slice(0,3),tf);
    let v1 = v[0], yErr,S,dX = 1,F;
    let dv1 = math.subtract(v1,state.slice(3,6));
    // [alpha - in plane angle, phi - out of plane angle, tB - total burn time %]
    let Xret = [[Math.atan2(dv1[1][0],dv1[0][0])],[Math.atan2(dv1[2],math.norm([dv1[0][0], dv1[1][0]]))],[math.norm(math.squeeze(dv1))/a0/tf]];
    let X = Xret.slice();
    if (X[2] > 1) {
        return false;
    }
    let errCount = 0;
    while (math.norm(math.squeeze(dX)) > 1e-6){
        F = oneBurnFiniteHcw (stateInit,X[0][0],X[1][0],X[2][0],tf,a0,n);
        yErr = [[stateFinal[0][0]-F.x],[stateFinal[1][0]-F.y],[stateFinal[2][0]-F.z]];
        S = proxOpsJacobianOneBurn(stateInit,a0,X[0][0],X[1][0],X[2][0],tf,n);
        dX = math.multiply(math.inv(S),yErr);
        // console.log(X,F)
        X = math.add(X,dX)
        if (errCount > 30) {
            console.log(X)
            return false;
        }
        errCount++;
    }
    
    return [Xret,X];
}

function hcwFiniteBurnTwoBurn(stateInit, stateFinal, n, tf, a0) {
    if (n === undefined) {n = 2*Math.PI/86164;}
    state = [[stateInit.x],[stateInit.y],[stateInit.z],[stateInit.xd],[stateInit.yd],[stateInit.zd]];
    stateFinal = [[stateFinal.x],[stateFinal.y],[stateFinal.z],[stateFinal.xd],[stateFinal.yd],[stateFinal.zd]];
    let v = proxOpsTargeter(state.slice(0,3),stateFinal.slice(0,3),tf);
    let v1 = v[0], v2 =v[1], yErr,S,dX = 1,F, invS, invSSt, ii = 0;
    let dv1 = math.subtract(v1,state.slice(3,6));
    let dv2 = math.subtract(state.slice(3,6),v2);
    // [alpha - in plane angle, phi - out of plane angle, tB - total burn time %]
    let X = [[Math.atan2(dv1[1][0],dv1[0][0])],[Math.atan2(dv1[2],math.norm([dv1[0][0], dv1[1][0]]))],[math.norm(math.squeeze(dv1))/a0/tf],
             [Math.atan2(dv2[1][0],dv2[0][0])],[Math.atan2(dv2[2],math.norm([dv2[0][0], dv2[1][0]]))],[math.norm(math.squeeze(dv2))/a0/tf]];
    while (math.norm(math.squeeze(dX)) > 1e-6){
        F = twoBurnFiniteHcw (stateInit,X[0][0],X[1][0],X[3][0],X[4][0],X[2][0],X[5][0],tf,a0,n);
        yErr = [[stateFinal[0][0]-F.x],[stateFinal[1][0]-F.y],[stateFinal[2][0]-F.z],
                [stateFinal[3][0]-F.xd],[stateFinal[4][0]-F.yd],[stateFinal[5][0]-F.zd]];
        S = proxOpsJacobianTwoBurn(stateInit,a0,X[0][0],X[1][0],X[2][0],X[3][0],X[4][0],X[5][0],tf,n);
        invSSt = math.inv(math.multiply(S,math.transpose(S)));
        invS = math.multiply(math.transpose(S),invSSt);
        // console.log(multiplyMatrix(math.transpose(S),invSSt))
        dX = math.multiply(invS,yErr);
        console.log(F)
        X = math.add(X,dX)
        ii++
        if (ii >50){break;} 
    }
    return X;
}

function oneBurnFiniteHcw (state,alpha,phi,tB,t,a0,n) {
    if (n === undefined) {
        n = 2*Math.PI/86164;
    }
    x0 = state.x; xd0 = state.xd;
    y0 = state.y; yd0 = state.yd;
    z0 = state.z; zd0 = state.zd;
    // console.log(x0,y0,z0)
    let xM = radialPosClosed(x0,xd0,yd0,a0,alpha,phi,tB*t,n);
    let xdM = radialVelClosed(x0,xd0,yd0,a0,alpha,phi,tB*t,n);
    let yM = intrackPosClosed(x0,xd0,y0,yd0,a0,alpha,phi,tB*t,n);
    let ydM = intrackVelClosed(x0,xd0,yd0,a0,alpha,phi,tB*t,n);
    let zM = crosstrackPosClosed(z0,zd0,a0,phi,tB*t,n);
    let zdM = crosstrackVelClosed(z0,zd0,a0,phi,tB*t,n);
    let xF = radialPosClosed(xM,xdM,ydM,0,0,0,t-tB*t,n);
    let xdF = radialVelClosed(xM,xdM,ydM,0,0,0,t-tB*t,n);
    let yF = intrackPosClosed(xM,xdM,yM,ydM,0,0,0,t-tB*t,n);
    let ydF = intrackVelClosed(xM,xdM,ydM,0,0,0,t-tB*t,n);
    let zF = crosstrackPosClosed(zM,zdM,0,0,t-tB*t,n);
    let zdF = crosstrackVelClosed(zM,zdM,0,0,t-tB*t,n);
    return {
        x: xF,
        y: yF,
        z: zF,
        xd: xdF,
        yd: ydF,
        zd: zdF
    };

}

function proxOpsTargeter(r1,r2,t) {   
    v1 = math.multiply(math.inv(PhiRV3d(t)),math.subtract(r2,math.multiply(PhiRR3d(t),r1)));
    v2 = math.add(math.multiply(PhiVR3d(t),r1),math.multiply(PhiVV3d(t),v1));
    return [v1,v2];
}

function proxOpsJacobianOneBurn(state,a,alpha,phi,tB,tF,n){
    let m1,m2,mC,mFinal=[];
    //alpha
    m1 = oneBurnFiniteHcw (state,alpha,phi,tB,tF,a,n);
    m1 = [[m1.x],
          [m1.y],
          [m1.z]];
    m2 = oneBurnFiniteHcw (state,alpha+0.01,phi,tB,tF,a,n);
    m2 = [[m2.x],
          [m2.y],
          [m2.z]];
    // console.log(m1,m2)
    mC = math.dotDivide(math.subtract(m2,m1),0.01);
    mFinal = mC;
    //phi
    m1 = oneBurnFiniteHcw (state,alpha,phi,tB,tF,a,n);
    m1 = [[m1.x],
          [m1.y],
          [m1.z]];
    m2 = oneBurnFiniteHcw (state,alpha,phi+0.01,tB,tF,a,n);
    m2 = [[m2.x],
          [m2.y],
          [m2.z]];
    m = math.dotDivide(math.subtract(m2,m1),0.01);
    mC = math.concat(mC,m);
    //tB
    m1 = oneBurnFiniteHcw (state,alpha,phi,tB,tF,a,n);
    m1 = [[m1.x],
          [m1.y],
          [m1.z]];
    m2 = oneBurnFiniteHcw (state,alpha,phi,tB+0.01,tF,a,n);
    m2 = [[m2.x],
          [m2.y],
          [m2.z]];
    m = math.dotDivide(math.subtract(m2,m1),0.01);
    mC = math.concat(mC,m);
    return mC;
}

function proxOpsJacobianTwoBurn(state,a,alpha1,phi1,tB1,alpha2, phi2,tB2,tF,n){
    let m1,m2,mC,mFinal=[];
    //alpha1
    m1 = twoBurnFiniteHcw (state,alpha1,phi1,alpha2,phi2,tB1,tB2,tF,a,n);
    m1 = [[m1.x],
          [m1.y],
          [m1.z],
          [m1.xd],
          [m1.yd],
          [m1.zd]];
    m2 = twoBurnFiniteHcw (state,alpha1+0.0001,phi1,alpha2,phi2,tB1,tB2,tF,a,n);
    m2 = [[m2.x],
          [m2.y],
          [m2.z],
          [m2.xd],
          [m2.yd],
          [m2.zd]];
    mC = math.dotDivide(math.subtract(m2,m1),0.0001);
    mFinal = mC;
    //phi1
    m1 = twoBurnFiniteHcw (state,alpha1,phi1,alpha2,phi2,tB1,tB2,tF,a,n);
    m1 = [[m1.x],
          [m1.y],
          [m1.z],
          [m1.xd],
          [m1.yd],
          [m1.zd]];
    m2 = twoBurnFiniteHcw (state,alpha1,phi1+0.0001,alpha2,phi2,tB1,tB2,tF,a,n);
    m2 = [[m2.x],
          [m2.y],
          [m2.z],
          [m2.xd],
          [m2.yd],
          [m2.zd]];
    mC = math.dotDivide(math.subtract(m2,m1),0.0001);
    mFinal = math.concat(mFinal,mC);
    //tB1
    m1 = twoBurnFiniteHcw (state,alpha1,phi1,alpha2,phi2,tB1,tB2,tF,a,n);
    m1 = [[m1.x],
          [m1.y],
          [m1.z],
          [m1.xd],
          [m1.yd],
          [m1.zd]];
    m2 = twoBurnFiniteHcw (state,alpha1,phi1,alpha2,phi2,tB1+0.0001,tB2,tF,a,n);
    m2 = [[m2.x],
          [m2.y],
          [m2.z],
          [m2.xd],
          [m2.yd],
          [m2.zd]];
    mC = math.dotDivide(math.subtract(m2,m1),0.0001);
    mFinal = math.concat(mFinal,mC);
    //alpha2
    m1 = twoBurnFiniteHcw (state,alpha1,phi1,alpha2,phi2,tB1,tB2,tF,a,n);
    m1 = [[m1.x],
          [m1.y],
          [m1.z],
          [m1.xd],
          [m1.yd],
          [m1.zd]];
    m2 = twoBurnFiniteHcw (state,alpha1,phi1,alpha2+0.0001,phi2,tB1,tB2,tF,a,n);
    m2 = [[m2.x],
          [m2.y],
          [m2.z],
          [m2.xd],
          [m2.yd],
          [m2.zd]];
    mC = math.dotDivide(math.subtract(m2,m1),0.0001);
    mFinal = math.concat(mFinal,mC);
    //phi2
    m1 = twoBurnFiniteHcw (state,alpha1,phi1,alpha2,phi2,tB1,tB2,tF,a,n);
    m1 = [[m1.x],
          [m1.y],
          [m1.z],
          [m1.xd],
          [m1.yd],
          [m1.zd]];
    m2 = twoBurnFiniteHcw (state,alpha1,phi1,alpha2,phi2+0.0001,tB1,tB2,tF,a,n);
    m2 = [[m2.x],
          [m2.y],
          [m2.z],
          [m2.xd],
          [m2.yd],
          [m2.zd]];
    mC = math.dotDivide(math.subtract(m2,m1),0.0001);
    mFinal = math.concat(mFinal,mC);
    //tB2
    m1 = twoBurnFiniteHcw (state,alpha1,phi1,alpha2,phi2,tB1,tB2,tF,a,n);
    m1 = [[m1.x],
          [m1.y],
          [m1.z],
          [m1.xd],
          [m1.yd],
          [m1.zd]];
    m2 = twoBurnFiniteHcw (state,alpha1,phi1,alpha2,phi2,tB1,tB2+0.0001,tF,a,n);
    m2 = [[m2.x],
          [m2.y],
          [m2.z],
          [m2.xd],
          [m2.yd],
          [m2.zd]];
    mC = math.dotDivide(math.subtract(m2,m1),0.0001);
    mFinal = math.concat(mFinal,mC);
    return mFinal;
}

function multiplyMatrix(A,B) {
    //Assumes square matrices
    let res = math.zeros(math.size(A)), a;
    for (var ii = 0; ii < A.length; ii++) {
        for (var kk = 0; kk < A.length; kk++) {
            a = 0;
            for (var jj = 0; jj < A.length; jj++) {
                a += A[ii][jj]*B[jj][kk];
            }
            res[ii][kk] = a;
        }
    }
    return res;
}