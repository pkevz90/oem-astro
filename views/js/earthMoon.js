let mainWindow = {
    earth: {
        r: 6378.137002796133,
        mu: 398600.4418
    },
    moon: {
        r: 1,
        mu: 1
    },
    startDate: new Date(),

}
function julianDate(yr=1996, mo=10, d=26, h=14, min=20, s=0) {
    return 367 * yr - Math.floor(7*(yr+Math.floor((mo+9)/12)) / 4) + Math.floor(275*mo/9) + d + 1721013.5 + ((s/60+min)/60+h)/24
}
function moonPosition(startDate = new Date()) {
    let jd = julianDate(startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate(), startDate.getHours(), startDate.getMinutes(), startDate.getSeconds())
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

    let rC = 1 / sind(para) * mainWindow.earth.r
    
    return math.dotMultiply(rC, [cosd(phi_ell) * cosd(lambda_ell), 
            cosd(epsilon) * cosd(phi_ell) * sind(lambda_ell) - sind(epsilon) * sind(phi_ell), 
            sind(epsilon) * cosd(phi_ell) * sind(lambda_ell) + cosd(epsilon) * sind(phi_ell)])
}

function sind(ang) {
    return Math.sin(ang * Math.PI / 180)
}
function cosd(ang) {
    return Math.cos(ang * Math.PI / 180)
}