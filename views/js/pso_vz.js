class pso {
    constructor(options = {}) {
        let {
            n_part = 10,
            upper_bounds = [0,0,0,0],
            lower_bounds = [1,1,1,1],
            loop_variable,
            inertia = 0.85,
            phi_g = 0.5,
            phi_p = 0.5,
            opt_fuction = (x) => x[0] ** 2 + x[1] ** 2,
        } = options
        this.particles = []
        this.upper = upper_bounds
        this.lower = lower_bounds
        this.inertia = inertia
        this.phi_g = phi_g
        this.phi_p = phi_p
        this.opt_fuction = opt_fuction
        this.bestGlobabValue = 1e13
        this.bestGlobalPosition = math.zeros(upper_bounds.length)._data
        if (upper_bounds.length !== lower_bounds.length) {
            console.error('Upper and Lower bounds must be same length')
            return
        }
        console.log(opt_fuction);
        if (this.opt_fuction === undefined) {
            console.error('No optimizer function supplied')
            return
        }
        for (let ii = 0; ii < n_part; ii++) {
            this.particles.push(new particle({upper: upper_bounds, lower: lower_bounds}))
        }
        this.firstStep = true
    }

    step() {
        this.particles.forEach(part => {
            part.update()
            let p_val = this.opt_fuction(part.position)
            if (p_val < part.bestValue) {
                part.bestValue = p_val
                part.bestPosition = part.position.slice()
            }
            if (p_val < this.bestGlobabValue) {
                this.bestGlobabValue = p_val
                this.bestGlobalPosition = part.position.slice()
            }
            part.velocity = math.add(math.dotMultiply(this.inertia, part.velocity), math.dotMultiply(math.random() * this.phi_g, math.subtract(this.bestGlobalPosition, part.position)), math.dotMultiply(math.random() * this.phi_p, math.subtract(part.bestPosition, part.position)))
        })
        return [this.bestGlobabValue, this.bestGlobalPosition]
    }
    
}

class particle {
    constructor(options = {}) {
        let {
            upper,
            lower
        } = options
        this.bestValue = 1e13
        this.bestPosition = math.zeros(upper.length)._data
        this.position = math.add(lower, math.dotMultiply(math.random([1,upper.length])[0], math.subtract(upper, lower)))
        this.velocity = math.zeros(upper.length)._data
        this.velocity = this.velocity.map((dim, ii) => {
            let delta = (upper[ii] - lower[ii]) * 0.05
            return delta * this.randn_bm()
        })
        this.upper = upper
        this.lower = lower
    }

    update() {
        this.position = math.add(this.position, this.velocity)
        this.position = this.position.map((dim, ii) => {
            if (dim < this.lower[ii]) return this.lower[ii]
            else if (dim > this.upper[ii]) return this.upper[ii]
            return dim
        })
    }
    randn_bm() {
        var u = 0, v = 0;
        while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
        while(v === 0) v = Math.random();
        return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    }
}

