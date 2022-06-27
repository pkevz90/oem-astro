let sensors = [
    {
        type: 'radar',
        name: 'Eglin',
        noise: {
            angle: 0.015, //deg
            r: 0.0321, //km
        },
        lat: 30.57, //deg
        long: -86.21, //deg
        azMask: [120, 240],
        elMask: [3,120],
        maxRange: 60000,
        active: false
    },
    {
        type: 'radar',
        name: 'Clear',
        noise: {
            angle: 0.079, //deg
            r: 0.0625, //km
        },
        lat: 64.29, //deg
        long: -149.19, //deg
        azMask: [170, 470],
        elMask: [3,90],
        maxRange: 4910,
        active: false
    },
    {
        type: 'radar',
        name: 'Cape Cod',
        noise: {
            angle: 0.026, //deg
            r: 0.026, //km
        },
        lat: 41.75, //deg
        long: -70.54, //deg
        azMask: [-13, 227],
        elMask: [3,80],
        maxRange: 5555,
        active: false
    },
    {
        type: 'radar',
        name: 'Thule',
        noise: {
            angle: 0.026, //deg
            r: 0.026, //km
        },
        lat: 76.57, //deg
        long: -68.3, //deg
        azMask: [-63, 177],
        elMask: [3,80],
        maxRange: 5555,
        active: false
    },
    {
        type: 'radar',
        name: 'Cavalier',
        noise: {
            angle: 0.0125, //deg
            r: 0.026, //km
        },
        lat: 48.72, //deg
        long: -97.9, //deg
        azMask: [-47, 62],
        elMask: [2,45],
        maxRange: 3300,
        active: false
    },
    {
        type: 'radar',
        name: 'Beale',
        noise: {
            angle: 0.033, //deg
            r: 0.035, //km
        },
        lat: 39.14, //deg
        long: -121.35, //deg
        azMask: [126, 366],
        elMask: [3,80],
        maxRange: 5555,
        active: false
    },
    {
        type: 'radar',
        name: 'Fylindales',
        noise: {
            angle: 0.022, //deg
            r: 0.05, //km
        },
        lat: 54.37, //deg
        long: -0.67, //deg
        azMask: [],
        elMask: [2,80],
        maxRange: 7000,
        active: false
    },
    {
        type: 'optical',
        name: 'Socorro',
        noise: {
            angle: 0.0035, //deg
        },
        lat: 33.82, //deg
        long: -106.66, //deg
        azMask: [],
        elMask: [20,90],
        maxRange: 60000,
        active: false
    },
    {
        type: 'optical',
        name: 'Maui',
        noise: {
            angle: 0.0035, //deg
        },
        lat: 20.71, //deg
        long: -156.26, //deg
        azMask: [],
        elMask: [20,90],
        maxRange: 60000,
        active: false
    },
    {
        type: 'optical',
        name: 'Maui Radar',
        noise: {
            angle: 0.031, //deg
            r: 0.1629 //km
        },
        lat: 20.71, //deg
        long: -156.26, //deg
        azMask: [],
        elMask: [20,90],
        maxRange: 60000,
        active: false
    },
    {
        type: 'optical',
        name: 'Diego Garcia',
        noise: {
            angle: 0.0035, //deg
        },
        lat: -7.41, //deg
        long: 72.45, //deg
        azMask: [],
        elMask: [20,90],
        maxRange: 60000,
        active: false
    },
    {
        type: 'radar',
        name: 'Kwajalein',
        noise: {
            angle: 0.031, //deg
            r: 0.1629 //km
        },
        lat: 9.39, //deg
        long: 167.48, //deg
        azMask: [],
        elMask: [1,90],
        maxRange: 60000,
        active: false
    },
    {
        type: 'radar',
        name: 'Millstone',
        noise: {
            angle: 0.01, //deg
            r: 0.15 //km
        },
        lat: 42.62, //deg
        long: -71.49, //deg
        azMask: [],
        elMask: [10,90],
        maxRange: 60000,
        active: false
    },
    {
        type: 'space',
        name: 'Leo-1',
        noise: {
            angle: 0.005, //deg
        },
        epoch: new Date('21 Jun 2022 18:00:00.000'),
        state: [6900.000000,        0.000000,     0.000000,       0.000000,       7.600538,       0.000000],
        elMask: [85,90],
        maxRange: 60000,
        active: false
    },
    {
        type: 'space',
        name: 'Geo-1',
        noise: {
            angle: 0.0025, //deg
        },
        epoch: new Date('21 Jun 2022 18:00:00.000'),
        state: [40727.296540,     10912.846218,       0.000000,      -0.795661,       2.969447,       0.053660],
        elMask: [-50,90],
        maxRange: 60000,
        active: false
    },
    {
        type: 'space',
        name: 'Geo-2',
        noise: {
            angle: 0.0025, //deg
        },
        epoch: new Date('21 Jun 2022 18:00:00.000'),
        state: [40727.296540,    -10912.846218,       0.000000,       0.795661,       2.969447,       -0.053660],
        elMask: [-50,90],
        maxRange: 60000,
        active: false
    },
    {
        type: 'space',
        name: 'Polar-2',
        noise: {
            angle: 0.01, //deg
        },
        epoch: new Date('25 Jun 2022 22:50:00.000'),
        state: [-4477.143291,     -438.410038,    -5231.919781,       5.445345,       2.163444,      -4.841065],
        elMask: [-5,90],
        maxRange: 60000,
        active: false
    }
]