class Propagator {
    constructor(options = {}) {
        let {
            order = 8,
            atmDrag = true,
            solarRad = true,
            thirdBody = true,
            mass = 850,
            cd = 2.2,
            cr = 1.8,
            area = 15
        } = options
        this.mass = mass,
        this.cd = cd
        this.cr = cr
        this.area = area
        this.order = order
        this.atmDrag = atmDrag
        this.solarRad = solarRad
        this.thirdBody = thirdBody
    }
    highPrecisionProp(position = [42164, 0, 0, 0, 3.074, 0], date = new Date()) {
        let mu = 398600.44189, x = position[0], y = position[1], z = position[2]
        let r = math.norm(position.slice(0,3))
        let a = [
            -mu* x / r ** 3,
            -mu* y / r ** 3,
            -mu* z / r ** 3
        ]
        let a_pert = this.recursiveGeoPotential(position, date)
        a = math.add(a_pert.a,a)
        if (this.thirdBody) {
            a_pert = this.thirdBodyEffects(position, date)
            a = math.add(a_pert,a)
        }
        if (this.atmDrag) {
            a_pert = this.atmosphericDragEffect(position)
            a = math.add(a_pert,a)
        }
        if (this.solarRad) {
            a_pert = this.solarRadiationPressure(position, date)
            a = math.add(a_pert,a)
        }
        return [
            position[3], position[4], position[5],...a]
    }
    recursiveGeoPotential(state, date) {
        let {lat, long, rot, r_ecef} = this.fk5ReductionTranspose(state.slice(0,3), date)
        rot = math.transpose(rot)
        let re = 6378.1363, r = math.norm(state.slice()), x = r_ecef[0], y=r_ecef[1], z=r_ecef[2]
        let p = [[1],[Math.sin(lat), Math.cos(lat)]]
        for (let order = 2; order <= this.order; order++) {
            let row = []
            for (let rowNum = 0; rowNum <= order; rowNum++) {
                if (rowNum === 0) row.push(((2*order-1)*Math.sin(lat)*p[order-1][0] - (order-1)*p[order-2][0])/order)
                else if (rowNum === order) row.push((2*order-1)*Math.cos(lat)*p[order-1][order-1])
                else {
                    let po_2m = rowNum > (order-2) ? 0 : p[order-2][rowNum]
                    row.push(po_2m + (2*order-1)*Math.cos(lat)*p[order-1][rowNum-1])
                }
            }
            p.push(row)
        }
        let du_dr = 0, du_dlat = 0, du_dlong = 0
        for (let order = 2; order <= this.order; order++) {
            for (let m = 0; m <= order; m++) {
                du_dr += (re/r)**order*(order+1)*p[order][m]*(this.c[order][m]*Math.cos(m*long)+this.s[order][m]*Math.sin(m*long))
    
                let pt_m_1 = (m+1) > order ? 0 : p[order][m+1] 
                du_dlat += (re/r)**order * (pt_m_1 - m * Math.tan(lat) * p[order][m]) * (this.c[order][m]*Math.cos(m*long) + this.s[order][m]*Math.sin(m*long))
                du_dlong += (re/r)**order * m * p[order][m] * (this.s[order][m]*Math.cos(m*long) - this.c[order][m]*Math.sin(m*long))
            }
        }
        du_dr *= -398600.4418/r/r
    
        du_dlat *= 398600.4418/r
    
        du_dlong *= 398600.4418/r
    
        let a_i = (1/r * du_dr - z/r/r/Math.sqrt(x*x+y*y)*du_dlat)*x - (1/(x*x+y*y)*du_dlong)*y
        let a_j = (1/r * du_dr - z/r/r/Math.sqrt(x*x+y*y)*du_dlat)*y + (1/(x*x+y*y)*du_dlong)*x
        let a_k = 1/r * du_dr * z + Math.sqrt(x*x+y*y)/r/r * du_dlat
    
        return {p, a: math.squeeze(math.multiply(rot, math.transpose([[a_i, a_j, a_k]])))}  
    }
    fk5ReductionTranspose(r=[-1033.479383, 7901.2952754, 6380.3565958], date=new Date(2004, 3, 6, 7, 51, 28, 386)) {
        // Based on Vallado "Fundamentals of Astrodyanmics and Applications" algorithm 24, p. 228 4th edition
        // ECI to ECEF
        let jd_TT = this.julianDate(date.getFullYear(), date.getMonth(), date.getDate()) 
        let t_TT = (jd_TT - 2451545) / 36525
        let zeta = 2306.2181 * t_TT + 0.30188 * t_TT ** 2 + 0.017998 * t_TT ** 3
        zeta /= 3600
        let theta = 2004.3109 * t_TT - 0.42665 * t_TT ** 2 - 0.041833 * t_TT ** 3
        theta /= 3600
        let z = 2306.2181 * t_TT + 1.09468 * t_TT ** 2 + 0.018203 * t_TT ** 3
        z /= 3600
        let p = math.multiply(this.rotationMatrices(-zeta, 3), this.rotationMatrices(theta, 2), this.rotationMatrices(-z, 3))
        let thetaGmst = this.siderealTime(this.julianDate(date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds() + date.getMilliseconds() / 1000))
        let w = this.rotationMatrices(thetaGmst, 3)
        let overallR = math.multiply(math.transpose(w), math.transpose(p))
        r = math.squeeze(math.multiply(overallR, math.transpose([r])))
        let long = math.atan2(r[1], r[0])
        let lat = math.atan2(r[2], math.norm(r.slice(0,2)))
        return {lat, long, rot: overallR, r_ecef: r}
    }
    siderealTime(jdUti=2448855.009722) {
        let tUti = (jdUti - 2451545) / 36525
        return ((67310.548 + (876600*3600 + 8640184.812866)*tUti + 0.093104*tUti*tUti - 6.2e-6*tUti*tUti*tUti) % 86400)/240
    }
    rotationMatrices(angle = 0, axis = 1, type = 'deg') {
        if (type === 'deg') {
            angle *= Math.PI / 180;
        }
        let rotMat;
        if (axis === 1) {
            rotMat = [
                [1, 0, 0],
                [0, Math.cos(angle), -Math.sin(angle)],
                [0, Math.sin(angle), Math.cos(angle)]
            ];
        } else if (axis === 2) {
            rotMat = [
                [Math.cos(angle), 0, Math.sin(angle)],
                [0, 1, 0],
                [-Math.sin(angle), 0, Math.cos(angle)]
            ];
        } else {
            rotMat = [
                [Math.cos(angle), -Math.sin(angle), 0],
                [Math.sin(angle), Math.cos(angle), 0],
                [0, 0, 1]
            ]
        }
        return rotMat;
    }
    julianDate(yr=1996, mo=10, d=26, h=14, min=20, s=0) {
        return 367 * yr - Math.floor(7*(yr+Math.floor((mo+9)/12)) / 4) + Math.floor(275*mo/9) + d + 1721013.5 + ((s/60+min)/60+h)/24
    }
    rk4(state = [42164, 0, 0, 0, -3.070, 0], dt = 10, date = new Date()) {
        let k1 = this.highPrecisionProp(state, date);
        let k2 = this.highPrecisionProp(math.add(state, math.dotMultiply(dt/2, k1)), new Date(date - (-dt / 2 * 1000)));
        let k3 = this.highPrecisionProp(math.add(state, math.dotMultiply(dt/2, k2)), new Date(date - (-dt / 2 * 1000)));
        let k4 = this.highPrecisionProp(math.add(state, math.dotMultiply(dt/1, k3)), new Date(date - (-dt * 1000)));
        return math.squeeze(math.add(state, math.dotMultiply(dt / 6, (math.add(k1, math.dotMultiply(2, k2), math.dotMultiply(2, k3), k4)))));
    }
    thirdBodyEffects(eciState = state1_init, date = state1_init_Epoch) {
        //Moon
        let moonVector = this.moonEciFromTime(date)
        let muMoon = 4902.799
        let moonSatVec = math.subtract(moonVector, eciState.slice(0,3))
        let rEarthMoon = math.norm(moonVector)
        let rSatMoon = math.norm(moonSatVec)
        let aMoon = [
            muMoon*(moonSatVec[0] / rSatMoon**3 - moonVector[0]/rEarthMoon**3),
            muMoon*(moonSatVec[1] / rSatMoon**3 - moonVector[1]/rEarthMoon**3),
            muMoon*(moonSatVec[2] / rSatMoon**3 - moonVector[2]/rEarthMoon**3),
        ]
        //Sun
        let sunVector = this.sunEciFromTime(date)
        let muSun = 1.32712428e11
        let sunSatVec = math.subtract(sunVector, eciState.slice(0,3))
        let rEarthSun = math.norm(sunVector)
        let rSatSun = math.norm(sunSatVec)
        let aSun = [
            muSun*(sunSatVec[0] / rSatSun**3 - sunVector[0]/rEarthSun**3),
            muSun*(sunSatVec[1] / rSatSun**3 - sunVector[1]/rEarthSun**3),
            muSun*(sunSatVec[2] / rSatSun**3 - sunVector[2]/rEarthSun**3),
        ]
        return math.add(aMoon, aSun)
    }
    moonEciFromTime(startDate = new Date()) {
        let sind = ang => Math.sin(ang*Math.PI / 180)
        let cosd = ang => Math.cos(ang*Math.PI / 180)
        let jd = this.julianDate(startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate(), startDate.getHours(), startDate.getMinutes(), startDate.getSeconds())
        let tdb = (jd - 2451545) / 36525
        let lambda_ell = 218.32 + 481267.8813 * tdb + 6.29 * sind(134.9 + 477198.85 * tdb)-
            1.27*sind(259.2-413335.38*tdb) +
            0.66*sind(235.7+890534.23*tdb) +
            0.21*sind(269.9+954397.7*tdb) -
            0.19*sind(357.5+35999.05*tdb) -
            0.11*sind(186.6+966404.05*tdb)
        lambda_ell = lambda_ell % 360
        lambda_ell = lambda_ell < 0 ? lambda_ell + 360 : lambda_ell
        
        let phi_ell = 5.13*sind(93.3+483202.03*tdb) + 
            0.28*sind(228.2+960400.87*tdb) - 
            0.28*sind(318.3+6003.18*tdb) - 
            0.17*sind(217.6-407332.2*tdb)
        phi_ell = phi_ell % 360
        phi_ell = phi_ell < 0 ? phi_ell + 360 : phi_ell
       
        let para = 0.9508 + 
            0.0518*cosd(134.9+477_198.85*tdb) + 
            0.0095*cosd(259.2-413_335.38*tdb) +  
            0.0078*cosd(235.7+890_534.23*tdb) +  
            0.0028*cosd(269.9+954_397.7*tdb)
        para = para % 360
        para = para < 0 ? para + 360 : para
    
        let epsilon = 23.439291 - 0.0130042 * tdb-(1.64e-7)*tdb*tdb+(5.04e-7)*tdb*tdb*tdb
    
        let rC = 1 / sind(para) * 6378.1363
        
        return math.dotMultiply(rC, [cosd(phi_ell) * cosd(lambda_ell), 
                cosd(epsilon) * cosd(phi_ell) * sind(lambda_ell) - sind(epsilon) * sind(phi_ell), 
                sind(epsilon) * cosd(phi_ell) * sind(lambda_ell) + cosd(epsilon) * sind(phi_ell)])
    } 
    sunEciFromTime(date = new Date()) {
        let jdUti = this.julianDate(date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds())
        let tUti = (jdUti - 2451545) / 36525
        let lamba = 280.4606184 + 36000.770005361 * tUti
        let m = 357.5277233 + 35999.05034 * tUti
        let lambaEll = lamba + 1.914666471 * Math.sin(m* Math.PI / 180) + 0.019994643 * Math.sin(2 * m* Math.PI / 180)
        let phi = 0
        let epsilon = 23.439291-0.0130042 * tUti
        let rSun = 1.000140612-0.016708617 * Math.cos(m * Math.PI / 180)-0.000139589*Math.cos(2*m* Math.PI / 180)
        let au = 149597870.7 //km
        rSun *= au
        return [
           rSun * Math.cos(lambaEll* Math.PI / 180),
           rSun * Math.cos(epsilon* Math.PI / 180) * Math.sin(lambaEll* Math.PI / 180),
           rSun * Math.sin(epsilon* Math.PI / 180) * Math.sin(lambaEll* Math.PI / 180)
        ]
    }
    atmosphericDragEffect(eciState = state2_init, options = {}) {
        let {cd = this.cd, m = this.mass, area = this.area} = options
        let re = 6378.137
        let r = math.norm(eciState.slice(0,3))
        let h = r - re
        let rho = this.getAtmosphereDensity(h)
        let rotEarth = [0,0,2*Math.PI /86164]
        let vrel = math.subtract(eciState.slice(3,6), math.cross(rotEarth, eciState.slice(0,3))).map(s => s*1000)
        let vrelmag = math.norm(vrel)
    
        return math.dotMultiply(-0.5*cd*area*rho*vrelmag/m, vrel).map(s => s / 1000)
    }
    getAtmosphereDensity(h = 747.2119) {
        // Based off of Table 8-4 in Fundamentals of Astrodynamics by Vallado 2nd Ed.
        let atData = [
            [0,1.225,7.249],
            [25,3.899e-2,6.349],
            [30,1.774e-2,6.6582],
            [40,3.972e-3,7.554],
            [50,1.057e-3,8.382],
            [60,3.206e-4,7.714],
            [70,8.770e-5,6.549],
            [80,1.905e-5,5.799],
            [90,3.396e-6,5.382],
            [100,5.297e-7,5.877],
            [110,9.661e-8,7.263],
            [120,2.438e-8,9.473],
            [130,8.484e-9,12.636],
            [140,3.845e-9,16.149],
            [150,2.070e-9,22.523],
            [180,5.464e-10,29.740],
            [200,2.789e-10,37.105],
            [250,7.248e-11,45.546],
            [300,2.418e-11,53.628],
            [350,9.158e-12,53.298],
            [400,3.725e-12,58.515],
            [450,1.585e-12,60.828],
            [500,6.967e-13,63.822],
            [600,1.454e-13,71.835],
            [700,3.614e-14,88.667],
            [800,1.170e-14,124.64],
            [900,5.245e-15,181.05],
            [1000,3.019e-15,268.00]
        ]
    
        let dataRow = atData.findIndex(a => a[0] > h)-1
        if (dataRow < 0) {
            dataRow = atData.length - 1
        }
        return atData[dataRow][1]*Math.exp(-(h - atData[dataRow][0])/atData[dataRow][2])   
    }
    solarRadiationPressure(state = state1_init, date = state1_init_Epoch, options = {}) {
        let {mass = 850, area = 1, cr = 1.8} = options
        let sunEci = this.sunEciFromTime(date)
        let p_srp = 4.57e-6
        let rSunSat = math.subtract(sunEci, state.slice(0,3))
    
        let a = -p_srp * cr * area / mass / math.norm(rSunSat) / 1000
    
        return math.dotMultiply(a, rSunSat)
    }
    propToTime(state, date, tf = 86400, maxError = 1e-9) {
        let h = 1000
        let dt_total = 0
        let steps_total = 0
        let t = 0
        while (t < tf) {
            let rkResult = rkf45(state, new Date(date - (-1000*t)), h, maxError)
            state = rkResult.y
            h = rkResult.hnew
            t += rkResult.dt
            if (rkResult.dt > 0) {
                dt_total += rkResult.dt
                steps_total++
            }
        }
        let rkResult = rkf45(state, new Date(date - (-1000*t)), tf - t, 1)
        state = rkResult.y
        return state
    }
    rkf45(state, time, h = 2000, epsilon = 1e-12) {
        let k1 = math.dotMultiply(h, hpop.highPrecisionProp(state, time))
        let k2 = math.dotMultiply(h, hpop.highPrecisionProp(math.add(state,math.dotMultiply(2/9,k1)), new Date(time - (-1000*h*2/9))))
        let k3 = math.dotMultiply(h, hpop.highPrecisionProp(math.add(state,math.dotMultiply(1/12,k1),math.dotMultiply(1/4,k2)), new Date(time - (-1000*h/3))))
        let k4 = math.dotMultiply(h, hpop.highPrecisionProp(math.add(state,math.dotMultiply(69/128,k1),math.dotMultiply(-243/128,k2),math.dotMultiply(135/64,k3)), new Date(time - (-1000*h*3/4))))
        let k5 = math.dotMultiply(h, hpop.highPrecisionProp(math.add(state,math.dotMultiply(-17/12,k1),math.dotMultiply(27/4,k2),math.dotMultiply(-27/5,k3),math.dotMultiply(16/15,k4)), new Date(time - (-1000*h))))
        let k6 = math.dotMultiply(h, hpop.highPrecisionProp(math.add(state,math.dotMultiply(65/432,k1),math.dotMultiply(-5/16,k2),math.dotMultiply(13/16,k3),math.dotMultiply(4/27,k4),math.dotMultiply(5/144,k5)), new Date(time - (-1000*h*5/6))))
        let y = math.add(state, math.dotMultiply(47/450, k1), math.dotMultiply(12/25, k3), math.dotMultiply(32/225, k4), math.dotMultiply(1/30, k5), math.dotMultiply(6/25, k6))
        
        let te = math.norm(math.add(math.dotMultiply(-1/150, k1), math.dotMultiply(3/100, k3), math.dotMultiply(-16/75, k4), math.dotMultiply(-1/20, k5), math.dotMultiply(6/25, k6)))
        
        let hnew = 0.9*h*(epsilon/te)**0.2
        if (te > epsilon) {
            y = state
            h = 0
        }
        return {y, hnew, dt: h, te}
    }
    c = [
        null,
        null,
        [-1.08262617385222E-03,-0.24140000522221E-09, 0.15745360427672E-05],
        [2.53241051856772E-06,0.21927988018965E-05, 0.30901604455583E-06, 0.10055885741455E-06],
        [0.16193312050719E-05,-0.50872530365024E-06, 0.78412230752366E-07, 0.59215743214072E-07, -0.39823957404129E-08],
        [0.22771610163688E-06, -0.53716510187662E-07, 0.10559053538674E-06, -0.14926153867389E-07, -0.22979123502681E-08, 0.43047675045029E-09],
        [-0.53964849049834E-06, -0.59877976856303E-07, 0.60120988437373E-08,0.11822664115915E-08,-0.32641389117891E-09,-0.21557711513900E-09,0.22136925556741E-11],
        [0.35136844210318E-06, 0.20514872797672E-06, 0.32844904836492E-07, 0.35285405191512E-08, -0.58511949148624E-09, 0.58184856030873E-12, -0.24907176820596E-10,  0.25590780149873E-13],
        [0.20251871520885E-06, 0.16034587141379E-07, 0.65765423316743E-08, -0.19463581555399E-09, -0.31893580211856E-09,-0.46151734306628E-11, -0.18393642697634E-11, 0.34297618184624E-12, -0.15803322891725E-12]
    ]
    s = [
        null,
        null,
        [0,0.15430999737844E-08, -0.90386807301869E-06],
        [0,0.26801189379726E-06, -0.21140239785975E-06, 0.19720132389889E-06],
        [0,-0.44945993508117E-06, 0.14815545694714E-06, -0.12011291831397E-07, 0.65256058113396E-08],
        [0,-0.80663463828530E-07, -0.52326723987632E-07, -0.71008771406986E-08, 0.38730050770804E-09, -0.16482039468636E-08],
        [0, 0.21164664354382E-07, -0.46503948132217E-07,0.18431336880625E-09,-0.17844913348882E-08,-0.43291816989540E-09,-0.55277122205966E-10],
        [0, 0.69369893525908E-07, 0.92823143885084E-08, -0.30611502382788E-08, -0.26361822157867E-09, 0.63972526639235E-11, 0.10534878629266E-10, 0.44759834144751E-12],
        [0, 0.40199781599510E-07, 0.53813164055056E-08, -0.87235195047605E-09, 0.91177355887255E-10,  0.16125208346784E-10, 0.86277431674150E-11, 0.38147656686685E-12, 0.15353381397148E-12]
    ]
}