// fetch('./JGM-3.txt').then(res=>res.text()).then(res => console.log(res.replaceAll('D','E').split('\r').slice(2).map(s => s.split('\t').map(c => Number(c)))))
// let state1_init = '2022-12-12T10:46:32.816  -1.314352177184897e-12  -3.248302025636458e+03  -6.375151680567772e+03   9.817188279521968e+00  -8.187211239761839e-16  -1.606830678994643e-15'.split(/ +/)
let state1_init = '2000-01-01T11:59:28.000   6.900000000000000e+03   0.000000000000000e+00   0.000000000000000e+00   0.000000000000000e+00  -1.057790461084519e+00   7.526570219427627e+00'.split(/ +/)
// let state1_init = '2022-12-12T10:46:32.816   4.216400000000000e+04   0.000000000000000e+00   0.000000000000000e+00   0.000000000000000e+00   3.074666282970636e+00   0.000000000000000e+00'.split(/ +/)
let state1_init_Epoch = new Date(state1_init.shift())
state1_init = state1_init.map(s => Number(s))

let iss = [3520.6039635075413, -2626.7656468119876, 5174.400087591945, 5.724258884915127, 4.902309262806896, -1.3952863346878865]
let issEpoch = new Date(2019, 11, 9, 12, 0, 0)

// let state1_final = '2022-12-13T10:46:32.816  -3.152322151868428e+02  -3.245974170507863e+03  -6.371755712625207e+03   9.811634807153268e+00  -1.341810837654408e-01  -2.164580969224782e-01'.split(/ +/)
let state1_final = '2000-01-02T11:59:28.000   3.779794922886140e+03  -7.356676969677338e+02   5.721438155148180e+03  -6.356544990290465e+00  -6.937473608324412e-01   4.102310498483917e+00'.split(/ +/)
// let state1_final = '2022-12-12T16:03:51.454   7.649041405130283e+03   4.146270898166502e+04   4.282285649712430e-02  -3.023807931084447e+00   5.577084932479784e-01   2.276572372726629e-05'.split(/ +/)
let state1_final_Epoch = new Date(state1_final.shift())
state1_final = state1_final.map(s => Number(s))

let hpop = new Propagator({
    order: 70,
    atmDrag: false,
    thirdBody: false,
    solarRad: false
})
hpop.highPrecisionProp()
let t = 0, dt = 20, timeDelta = (state1_final_Epoch-state1_init_Epoch) / 1000
let state = state1_init.slice()
console.time('prop')
state = hpop.propToTime(state, state1_init_Epoch, timeDelta, 1e-6)
console.timeEnd('prop')
console.log(math.norm(math.subtract(state, state1_final)));


// function propToTime(state, date, tf = 86400, maxError = 1e-9) {
//     let h = 1000
//     let dt_total = 0
//     let steps_total = 0
//     let t = 0
//     while (t < tf) {
//         let rkResult = rkf45(state, new Date(date - (-1000*t)), h, maxError)
//         state = rkResult.y
//         h = rkResult.hnew
//         t += rkResult.dt
//         if (rkResult.dt > 0) {
//             dt_total += rkResult.dt
//             steps_total++
//         }
//     }
//     let rkResult = rkf45(state, new Date(date - (-1000*t)), tf - t, 1)
//     state = rkResult.y
//     return [state, dt_total/steps_total]
// }

// function rkf45(state, time, h = 2000, epsilon = 1e-20) {
//     let k1 = math.dotMultiply(h, hpop.highPrecisionProp(state, time))
//     let k2 = math.dotMultiply(h, hpop.highPrecisionProp(math.add(state,math.dotMultiply(2/9,k1)), new Date(time - (-1000*h*2/9))))
//     let k3 = math.dotMultiply(h, hpop.highPrecisionProp(math.add(state,math.dotMultiply(1/12,k1),math.dotMultiply(1/4,k2)), new Date(time - (-1000*h/3))))
//     let k4 = math.dotMultiply(h, hpop.highPrecisionProp(math.add(state,math.dotMultiply(69/128,k1),math.dotMultiply(-243/128,k2),math.dotMultiply(135/64,k3)), new Date(time - (-1000*h*3/4))))
//     let k5 = math.dotMultiply(h, hpop.highPrecisionProp(math.add(state,math.dotMultiply(-17/12,k1),math.dotMultiply(27/4,k2),math.dotMultiply(-27/5,k3),math.dotMultiply(16/15,k4)), new Date(time - (-1000*h))))
//     let k6 = math.dotMultiply(h, hpop.highPrecisionProp(math.add(state,math.dotMultiply(65/432,k1),math.dotMultiply(-5/16,k2),math.dotMultiply(13/16,k3),math.dotMultiply(4/27,k4),math.dotMultiply(5/144,k5)), new Date(time - (-1000*h*5/6))))
//     let y = math.add(state, math.dotMultiply(47/450, k1), math.dotMultiply(12/25, k3), math.dotMultiply(32/225, k4), math.dotMultiply(1/30, k5), math.dotMultiply(6/25, k6))
    
//     let te = math.norm(math.add(math.dotMultiply(-1/150, k1), math.dotMultiply(3/100, k3), math.dotMultiply(-16/75, k4), math.dotMultiply(-1/20, k5), math.dotMultiply(6/25, k6)))
    
//     let hnew = 0.9*h*(epsilon/te)**0.2
//     if (te > epsilon) {
//         y = state
//         h = 0
//     }
//     return {y, hnew, dt: h, te}
// }