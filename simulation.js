var $ = function (id) {
  return document.getElementById(id);
};

const params = {
  general: {
    t_end: 48,
    dt: 0.1,
    random_seed: 0,
    N_init: 25,
    N_max: 80,
    N_emt: 5,
    w_init: 70, // ~ N_init * 1.5
    h_init: 5,
    mu: 0.2,
    n_substeps: 30,
    alg_dt: 0.01,
    w_screen: 70,
    h_screen: (70 * 1) / 3,
    p_div_out: 0.95, // cp. NC
    curvature: 0.06,
  },
  cell_prop: {
    apical_junction_init: 0.0,
    max_basal_junction_dist: 2.0,
    basal_daming_ratio: 1.0,
    basal_membrane_repulsion: 0.0,
    cytos_init: 0.1,
    diffusion: 0.1,
  },
  cell_types: {
    control: {
      name: "control",
      R_hard: 0.4,
      R_hard_div: 0.7,
      R_soft: 1.2,
      color: { r: 30, g: 100, b: 20 },
      dur_G2: 0.5,
      dur_mitosis: 0.5,
      k_apical_junction: 1.0,
      k_cytos: 5.0,
      max_cytoskeleton_length: 1.0,
      run: 0.0,
      running_speed: 1.0,
      running_mode: 0,
      stiffness_apical_apical: 2.0,
      stiffness_apical_apical_div: 4.0,
      stiffness_nuclei_apical: 3.0,
      stiffness_nuclei_basal: 2.0,
      stiffness_repulsion: 4.0,
      stiffness_straightness: 15.0,
      lifespan: { min: 5.5, max: 6.5 },
      INM: 1.0,
      hetero: false,
      events: {
        time_A: { min: Infinity, max: Infinity },
        time_B: { min: Infinity, max: Infinity },
        time_S: { min: Infinity, max: Infinity },
        time_P: { min: Infinity, max: Infinity },
      },
    },
    emt: {
      name: "emt",
      R_hard: 0.4,
      R_hard_div: 0.7,
      R_soft: 1.2,
      color: { r: 128, g: 0, b: 128 },
      dur_G2: 0.5,
      dur_mitosis: 0.5,
      k_apical_junction: 1.0,
      k_cytos: 5.0,
      max_cytoskeleton_length: 3.7,
      run: 0.0,
      running_speed: 1.0,
      running_mode: 0,
      stiffness_apical_apical: 2.0,
      stiffness_apical_apical_div: 4.0,
      stiffness_nuclei_apical: 3.0,
      stiffness_nuclei_basal: 2.0,
      stiffness_repulsion: 4.0,
      stiffness_straightness: 15.0,
      lifespan: { min: 5.5, max: 6.5 },
      INM: 1.0,
      hetero: true,
      events: {
        time_A: { min: 3, max: 12 },
        time_B: { min: 3, max: 12 },
        time_S: { min: Infinity, max: Infinity },
        time_P: { min: Infinity, max: Infinity },
      },
    },
  },
};

let sim_emt = function(p, inputs, sim_div) {

    const pv = p5.Vector;

    const params = inputs.params;

    const sim_aspect = params.general.w_screen / params.general.h_screen;

    // Units: space: 5e-6m | h
    
    // state
    let s = {
        cells: [],
        ap_links: [],
        ba_links: [],
        t: 0.0,
    };

    p.getParams = function() { return params };
    p.getState = function() { return s };

    function shapeCenter() {
        const pg = params.general;
        if (pg.curvature == 0) {
            return p.createVector(0, 0);
        }
        else {
            return p.createVector(0, 1 / pg.curvature);
        }
    }

    function basalCurveParam(l) {
        const pg = params.general;

        if (pg.curvature == 0) {
            return p.createVector(l, 0); // straight line
        }

        const center = shapeCenter();
        const radius = Math.abs(1 / pg.curvature);

        const factor = 1 / (0.5 * Math.PI * radius);
        const dir = -Math.sign(pg.curvature);

        return p.createVector(
            center.x + dir * radius * Math.sin(l * factor),
            center.y + dir * radius * Math.cos(l * factor)
        );
    }

    function basalCurve(pos) {
      const pg = params.general;

      if (pg.curvature == 0) {
        return p.createVector(pos.x, 0); // straight line
      }

      const center = shapeCenter();
      const radius = Math.abs(1 / pg.curvature);

      return pos.copy().sub(center).setMag(radius).add(center);
    }

    function basalNormal(pos) {
      const pg = params.general;

      if (pg.curvature == 0) {
        return p.createVector(0, 1); // straight line
      }

      const center = shapeCenter();

      return p5.Vector.sub(center, pos).setMag(1 * Math.sign(pg.curvature));
    }

    class Cell {
        constructor(params, s, x_init, ct = params.cell_types.control, parent = undefined) {

            const w = params.general.w_init;
            const h = params.general.h_init;

            this.type = ct;

            
            this.f = p.createVector(0.0, 0.0);
            this.fA = p.createVector(0.0, 0.0);
            this.fB = p.createVector(0.0, 0.0);

            this.col = ct.color;
            this.R_soft = ct.R_soft;
            this.R_hard = ct.R_hard;

            this.eta_A = h/2;
            this.eta_B = h/2;
            this.has_A = true;
            this.has_B = true;

            this.phase = 0; // 1 = G2, 2 = mitosis
            const max_age = p.random( ct.lifespan.min, ct.lifespan.max );

            if( parent === undefined ) {
                this.pos = x_init.copy();

                this.B = basalCurve(this.pos)
                this.A = this.B.copy().add( basalNormal(this.pos).mult(h));

                this.birth_time = s.t - p.random(0, max_age);
                this.division_time = this.birth_time + max_age;
                this.is_running = false;
                this.running_mode = ct.running_mode;
                this.has_inm = p.random() <= ct.INM;
                this.time_A = p.random(ct.events.time_A.min, ct.events.time_A.max);
                this.time_B = p.random(ct.events.time_B.min, ct.events.time_B.max);
                this.time_S = p.random(ct.events.time_S.min, ct.events.time_S.max);

                this.stiffness_apical_apical = ct.stiffness_apical_apical;

                if( ct.hetero ) {
                    if( p.random() > 0.7 ) {
                        this.time_A = Infinity;
                    }
                    if( p.random() > 0.7 ) {
                        this.time_B = Infinity;
                    }
                    if( p.random() > 0.7 ) {
                        this.time_S = Infinity;
                    }
                }

                this.time_P = (p.random() <= ct.run) ? this.time_B : Infinity;
                this.stiffness_straightness = ct.stiffness_straightness;
            } else {
                this.pos = x_init.copy();
                this.A = parent.A.copy();
                this.B = parent.B.copy();
                
                this.birth_time = s.t;
                this.division_time = this.birth_time + max_age;
                this.is_running = parent.is_running;                
                this.running_mode = parent.running_mode;
                this.has_inm = parent.has_inm;

                this.time_A = parent.time_A;
                this.time_B = parent.time_B;
                this.time_S = parent.time_S;
                this.time_P = parent.time_P;

                this.stiffness_apical_apical = ct.stiffness_apical_apical;

                this.has_A = parent.has_A;
                this.has_B = parent.has_B;

                this.eta_A = parent.eta_A;
                this.eta_B = parent.eta_B;

                this.stiffness_straightness = parent.stiffness_straightness;
            }

            this.pos_last = this.pos.copy();
            this.dir = p.createVector(0,0);
        }

        draw() {

            this.dir.set(this.pos_last);
            this.dir.sub(this.pos);
            this.dir.mult(1/(params.general.dt));
            this.pos_last.set(this.pos.x, this.pos.y);

            p.noStroke();
            p.fill(this.col.r, this.col.g, this.col.b, 100);
            const angle = this.dir.heading();
            const F = this.dir.mag();
            p.translate(this.pos.x, this.pos.y);
            p.rotate(angle);

            let v = 0;
            const Fmin = 0.9;
            const Fmax = 2.0;
            const vmax = 0.3;
            if( F > Fmin ) {
                if ( F < Fmax) {
                    const x = (F-Fmin)/(Fmax-Fmin);
                    v = vmax*p.exp(-1/(1-x*x*x*x));
                }
                else {
                    v = vmax;
                }
            }
            p.ellipseMode(p.CENTER);
            p.ellipse(0, 0, (1+v)*2*this.R_soft, (1-v)*2*this.R_soft);
            p.rotate(-angle);
            p.translate(-this.pos.x, -this.pos.y);

            p.fill(this.col.r, this.col.g, this.col.b);
            p.circle(this.pos.x, this.pos.y, 2*this.R_hard);
            
            
            p.fill(150,20,20);
            p.circle(this.A.x, this.A.y, 0.2);
            
            p.fill(0,0,0);
            p.circle(this.B.x, this.B.y, 0.2);

            p.stroke(100,50,0,80);
            p.strokeWeight(0.05);
            p.line(this.A.x, this.A.y, this.pos.x, this.pos.y );
            p.line(this.B.x, this.B.y, this.pos.x, this.pos.y );
        }

    };

    function init() {
        s.cells.length = 0;
        s.t = 0;
        s.ap_links.length = 0;
        s.ba_links.length = 0;

        const N =  params.general.N_init;
        const i_emt = p.round( (N - params.general.N_emt) / 2 );
        const j_emt = i_emt + params.general.N_emt;

        const w = params.general.w_init;
        const h = params.general.h_init;

        const X_init = [];
        for( let i = 0; i < N; ++i ) {
            const x = p.random(-w/2, w/2);
            const y = p.random(h/3, 2*h/3);
            X_init[i] = basalCurveParam(x);
            X_init[i] = X_init[i].add(basalNormal(X_init[i]).mult(y));

            // X_init[i] = p.createVector( p.random(-w/2, w/2), p.random(h/3, 2*h/3 ) );
        }
        X_init.sort( (a,b) => ( a.x - b.x ) );


        for( let i = 0; i < N; ++i ) {
            if( i < i_emt || i >= j_emt ) {
                s.cells[i] = new Cell(params, s, X_init[i]);
            } else {
                s.cells[i] = new Cell(params, s, X_init[i], params.cell_types.emt);
            }
        }

        // for( let i = 0; i < s.cells.length; ++i ) {
        //     s.cells[i].A.x = -w/2 + w * (i/s.cells.length);
        //     s.cells[i].B.x = -w/2 + w * (i/s.cells.length);
        // }

        for( let i = 0; i < s.cells.length - 1; ++i ) {
            s.ap_links[i] = {l: i, r: i+1, rl: params.cell_prop.apical_junction_init};
            s.ba_links[i] = {l: i, r: i+1};
        }

        s.t = 0.0;

        inputs.init_display(s);
    }


    function timeStep() {

        //dt = p.min(p.deltaTime, 100) / 1000 * 60 * p_def.speed_factor / p1.n_substeps;

        const pg = params.general;
        const ct = params.cell_types.control;
        const cp = params.cell_prop;


        let dt = pg.dt;

        // update time dynamics 
        for (let i = 0; i < s.cells.length; ++i) {
            const ci = s.cells[i];

            // update cell phase 
            if ( s.t < ci.division_time - ci.type.dur_G2 - ci.type.dur_mitosis ) {
                ci.phase = 0;
            } else {
                if ( s.t < ci.division_time - ci.type.dur_mitosis ) {
                    ci.phase = 1;
                } else {
                    if ( s.t < ci.division_time ) {
                        ci.phase = 2;
                    } else {
                        ci.phase = 3;
                    }
                }
            }
        }

        // perform cell division
        for (let i = 0; i < s.cells.length; ++i) {
            let ci = s.cells[i];
            if( ci.phase == 3 ) {
                if ( ci.type.name == 'emt' ) {
                    // reset cell cycle
                    s.cells[i] = new Cell(params, s, ci.pos, ci.type, ci); 
                } else {
                    if( p.random(0,1) < pg.p_div_out || s.cells.length >= pg.N_max ) {
                        // one offsprings
                        s.cells[i] = new Cell(params, s, ci.pos, ci.type, ci); 
                    } else {
                        // two offsprings
                        
                        s.cells[i] = new Cell(params, s, ci.pos, ci.type, ci); 
                        ci = s.cells[i];
                        s.cells[s.cells.length] = new Cell(params, s, ci.pos, ci.type, ci);
                        const cj = s.cells[s.cells.length-1];
                        ci.pos.x -= 0.05 * ci.R_soft;
                        cj.pos.x += 0.05 * ci.R_soft;
                        ci.A.x -= 0.05 * ci.R_soft;
                        cj.A.x += 0.05 * ci.R_soft;
                        ci.B.x -= 0.05 * ci.R_soft;
                        cj.B.x += 0.05 * ci.R_soft;

                        // recover the tissue 
                        for( let e = 0; e < s.ap_links.length; ++e ) {
                            const con = s.ap_links[e];
                            if( i == con.l ) {
                                con.l = s.cells.length - 1;
                            }
                        }
                        s.ap_links[s.ap_links.length] = {l:i, r:s.cells.length-1,rl: params.cell_prop.apical_junction_init};

                        for( let e = 0; e < s.ba_links.length; ++e ) {
                            const con = s.ba_links[e];
                            if( i == con.l ) {
                                con.l = s.cells.length - 1;
                            }
                        }
                        s.ba_links[s.ba_links.length] = {l:i, r:s.cells.length-1};
                    }
                    // perform cell division
                }
            }
        }

        
        for (let i = 0; i < s.cells.length; ++i) {
            const ci = s.cells[i];

            // lose apical adhesion
            if( s.t <= ci.time_A && s.t + dt > ci.time_A  ) {
                ci.has_A = false;
                ci.stiffness_nuclei_apical *= 0.1;
                                
                const inds = [];
                let new_con = {l: 0, r: 0, rl: 0.0};
                for(let e = 0; e < s.ap_links.length; ++e) {
                    const con = s.ap_links[e];
                    if ( con.l == i ) { inds.push(e); new_con.r = con.r; };
                    if ( con.r == i ) { inds.push(e); new_con.l = con.l; };
                }

                if( inds.length == 1 ) {
                    s.ap_links.splice(inds[0], 1);
                }

                if( inds.length == 2 ) {
                    inds.sort((a,b) => (b - a));

                    s.ap_links.splice(inds[0], 1);
                    s.ap_links.splice(inds[1], 1);
                    new_con.rl = pv.dist(s.cells[new_con.l].A, s.cells[new_con.r].A);
                    s.ap_links.push(new_con);
                }
            }                    
            
            // lose basal adhesion
            if( s.t <= ci.time_B && s.t + dt > ci.time_B  ) {
                ci.has_B = false;
                ci.stiffness_nuclei_basal *= 0.1;
                                
                const inds = [];
                let new_con = {l: 0, r: 0};
                for(let e = 0; e < s.ba_links.length; ++e) {
                    const con = s.ba_links[e];
                    if ( con.l == i ) { inds.push(e); new_con.r = con.r; };
                    if ( con.r == i ) { inds.push(e); new_con.l = con.l; };
                }

                if( inds.length == 1 ) {
                    s.ba_links.splice(inds[0], 1);
                }

                if( inds.length == 2 ) {
                    inds.sort((a,b) => (b - a));
                    s.ba_links.splice(inds[0], 1);
                    s.ba_links.splice(inds[1], 1);
                    s.ba_links.push(new_con);
                }
            }

            // lose straigthness
            if( s.t <= ci.time_S && s.t + dt > ci.time_S  ) {
                ci.stiffness_straightness = 1.0;
            }              

            // start running
            if( (ci.time_P > ci.time_B && (s.t <= ci.time_P && s.t + dt > ci.time_P)) 
             || (ci.time_P <= ci.time_B && (s.t <= ci.time_B && s.t + dt > ci.time_B)) ) {
                ci.running_mode = 3;
            }
            
            ci.is_running = !ci.has_B && ci.B.y > -2.0 && (ci.running_mode >= 3 || (ci.B.y < 0.0 && ci.running_mode >= 1))
        }

        for (let i = 0; i < s.cells.length; ++i) {
            const ci = s.cells[i];
                
            // drl = desired rest length
            let apical_drl = 0.0;
            let basal_drl = 0.0;

            const distAX = pv.dist(ci.pos, ci.A);
            const distBX = pv.dist(ci.pos, ci.B);
            let distAB = 0.0;

            const phase_mode = ci.phase + ( ci.has_inm ? 0 : 10 );

            switch( phase_mode ) {
                case 1: 
                    distAB = pv.dist(ci.A, ci.B);
                    apical_drl = 0.0;
                    basal_drl = p.max( 0, distAB - 2*ci.R_soft );
                break;

                case 2: 
                    distAB = pv.dist(ci.A, ci.B);
                    apical_drl = 0.0;
                    basal_drl = p.max( 0, distAB - 2*ci.R_soft );
                break;
                
                default: 
                    apical_drl = p.max( 0, distAX - ci.R_soft );
                    basal_drl  = p.max( 0, distBX - ci.R_soft );
            }
            
            if( ci.phase == 1 ) {
                ci.stiffness_apical_apical = ci.type.stiffness_apical_apical_div;
            };

            if( ci.phase == 2 ) {
                ci.R_hard = ci.type.R_hard_div;
            };

            if( !ci.has_A ) { apical_drl = 0.0; };
            if( !ci.has_B ) { basal_drl = 0.0; };

            ci.eta_A = p.exp(-dt * ci.type.k_cytos ) * (ci.eta_A - apical_drl) + apical_drl; 
            
            if( ci.has_B ) {
                ci.eta_B = p.exp(-dt * ci.type.k_cytos ) * (ci.eta_B - basal_drl) + basal_drl;
            } 
            else 
            {
                if (ci.running_mode >= 2 && ci.B.y > 0 ) {
                    ci.eta_B = pv.dist(ci.B, ci.pos) - ci.R_soft;
                } 
                else {
                    ci.eta_B = p.exp(-dt * ci.type.k_cytos ) * (ci.eta_B - basal_drl) + basal_drl;
                }
            }

            if( !ci.is_running || ci.has_B ){
                const m_cl = ci.type.max_cytoskeleton_length;
                const too_long = ci.eta_A + ci.eta_B - m_cl

                if( too_long > 1 ){
                    const A = ci.eta_A * m_cl / (ci.eta_A + ci.eta_B);
                    const B = ci.eta_B * m_cl / (ci.eta_A + ci.eta_B);

                    ci.eta_A = p.exp(-dt * ci.type.k_cytos ) * (ci.eta_A - A) + A;
                    ci.eta_B = p.exp(-dt * ci.type.k_cytos ) * (ci.eta_B - B) + B;
                }
            }
        }
        
        for(let e = 0; e < s.ap_links.length; ++e) {
            const ci = s.cells[ s.ap_links[e].l ];
            const cj = s.cells[ s.ap_links[e].r ];

            const k_avg = 0.5*ci.type.k_apical_junction + 0.5*cj.type.k_apical_junction;
            s.ap_links[e].rl = s.ap_links[e].rl * p.exp(-dt * k_avg);
        }

        dt = pg.dt / pg.n_substeps;

        for (let step = 0; step < pg.n_substeps; ++step) {

            s.t = s.t + dt;                 

            for (let i = 0; i < s.cells.length; ++i) {
                s.cells[i].f.set(0,0);
                s.cells[i].fA.set(-0.0,0);
                s.cells[i].fB.set(0,0);
            }

            // cell cell repulsion
            for (let i = 0; i < s.cells.length; ++i) {
                const ci = s.cells[i]; 
                for (let j = 0; j < i; ++j) {
                    const cj = s.cells[j];
                    if( ( ci.pos.x - cj.pos.x ) < 2 ){
                        const xixj = pv.sub(cj.pos, ci.pos);
                        const d = xixj.mag();
                        const Rij = ci.R_soft + cj.R_soft;
                        const sr = ci.type.stiffness_repulsion + cj.type.stiffness_repulsion;
                        if (d < Rij && d > Rij / 20) {
                            ci.f.add(pv.mult(xixj, -sr * (Rij - d) / (d*Rij*Rij)));
                            cj.f.sub(pv.mult(xixj, -sr * (Rij - d) / (d*Rij*Rij)));
                        }
                    }
                }
            }

            for (let i = 0; i < s.cells.length; ++i) {
                const ci = s.cells[i]; 

                
                // apical nuclei springs 
                const ax = pv.sub(ci.pos, ci.A);
                const al = ax.mag();
                if( al > 0 ) {
                    const rl = ci.eta_A + ci.R_soft;
                    ci.f.sub(  pv.mult(ax, 2 * ci.type.stiffness_nuclei_apical * ( al - rl ) / (al*rl*rl) ) );
                    ci.fA.add( pv.mult(ax, 2 * ci.type.stiffness_nuclei_apical * ( al - rl ) / (al*rl*rl) ) );
                }

                
                // basal nuclei springs 
                const bx = pv.sub(ci.pos, ci.B);
                const bl = bx.mag();
                if( bl > 0 ) {
                    const rl = ci.eta_B + ci.R_soft;
                    ci.f.sub(  pv.mult(bx, 2 * ci.type.stiffness_nuclei_basal * ( bl - rl ) / (bl*rl*rl) ) );
                    ci.fB.add( pv.mult(bx, 2 * ci.type.stiffness_nuclei_basal * ( bl - rl ) / (bl*rl*rl) ) );
                }

                // straightness 
                const ax_bx = pv.dot(ax, bx);
                if( ax_bx != 0.0 ){
                    const f = ci.stiffness_straightness / (al*bl);
                    
                    const dR = bx.copy();
                    dR.mult(-1.0); dR.add( pv.mult( ax, ax_bx/(al*al) ) ); dR.mult(f); 
                    const dS = ax.copy();
                    dS.mult(-1.0); dS.add( pv.mult( bx, ax_bx/(bl*bl) ) ); dS.mult(f);
                    ci.fA.sub(dR);
                    ci.f.add(dR);
                    ci.f.add(dS);
                    ci.fB.sub(dS);
                }
            }

            for(let e = 0; e < s.ap_links.length; ++e) {
                const ci = s.cells[ s.ap_links[e].l ];
                const cj = s.cells[ s.ap_links[e].r ];
                const aiaj = pv.sub(ci.A, cj.A);
                const d = aiaj.mag();
                
                if( d > 1e-6 ) {
                    aiaj.mult( 0.25*0.5*(ci.stiffness_apical_apical+cj.stiffness_apical_apical) );
                    aiaj.mult( (d - s.ap_links[e].rl)/(d) )
                    ci.fA.sub( aiaj );
                    cj.fA.add( aiaj );
                }
            }

            // integrate forces
            for (let i = 0; i < s.cells.length; ++i) {
                const ci = s.cells[i];
                // noise 
                ci.pos.x += p.sqrt(dt) * cp.diffusion * p.randomGaussian()
                ci.pos.y += p.sqrt(dt) * cp.diffusion * p.randomGaussian()

                // add force
                ci.pos.x += dt * ci.f.x / pg.mu;
                ci.pos.y += dt * ci.f.y / pg.mu;

                ci.A.x += dt * ci.fA.x / pg.mu;
                ci.A.y += dt * ci.fA.y / pg.mu;
                

                if( ci.is_running ) {
                    if( pv.dist(ci.B, ci.pos) < 5 ) {
                        const dir = pv.sub( ci.B, ci.pos );
                        dir.normalize();

                        ci.B.x += dt * dir.x * ci.type.running_speed;
                        ci.B.y += dt * dir.y * ci.type.running_speed;
                    }                        
                }
                else{
                    ci.B.x += dt * ci.fB.x / pg.mu;
                    ci.B.y += dt * ci.fB.y / pg.mu;
                    if( !ci.has_B ) {
                        ci.B.y += dt * ci.fB.y / pg.mu;
                    }
                }
            }

            // handle constraints
            for (let i = 0; i < s.cells.length; ++i) {
                const ci = s.cells[i]; 
                for (let j = 0; j < i; ++j) {
                    const cj = s.cells[j];
                    if( ( ci.pos.x - cj.pos.x ) < 1.5 ){
                        const Rij = ci.R_hard + cj.R_hard;
                        const d = pv.dist(ci.pos, cj.pos) - Rij;
                        if (d < 0.0 && d != -Rij) {
                            const xixj = pv.sub(ci.pos, cj.pos);
                            xixj.mult(0.5 * d / (d + Rij));
                            ci.pos.sub(xixj);
                            cj.pos.add(xixj);
                        }
                    }
                }
            }

            // fixed ordering of basal layer
            for( let e = 0; e < s.ba_links.length; ++e) {
                const ci = s.cells[s.ba_links[e].l];
                const cj = s.cells[s.ba_links[e].r];

                const bij = cj.B.x - ci.B.x;
                if( bij < 0 ) {
                    ci.B.x += bij/2;
                    cj.B.x -= bij/2;
                } 
            }
            
            // maximal distance of basal points
            for( let e = 0; e < s.ba_links.length; ++e) {
                const ci = s.cells[s.ba_links[e].l];
                const cj = s.cells[s.ba_links[e].r];

                const bij = cj.B.x - ci.B.x;
                if( bij > cp.max_basal_junction_dist ) {
                    ci.B.x += (bij - cp.max_basal_junction_dist) / 2;
                    cj.B.x -= (bij - cp.max_basal_junction_dist) / 2;
                } 
            }

            // project onto basal curve
            for( let i = 0; i < s.cells.length; ++i ) {
                const ci = s.cells[i];
                ci.B.set( basalCurve(ci.B) );
            }
        }
    }


    let sX = 1.0; 
    let sY = 1.0;
    let tX = 0.0;
    let tY = 0.0;

    let dragging = false; // Is the object being dragged?
    let dragIndex = -1;
    let offset;     // Mouseclick offset

    let is_paused = false;


    p.init = function() {
        init();
        is_paused = false;
    };

    p.setup = function() {
        p.createCanvas(inputs.screen_size.w,inputs.screen_size.h);
        p.windowResized();
        p.frameRate(25);
        //init_interface();
        init();
    }

    let reset_time = 0.;
    p.pause = function(){
        is_paused = !is_paused;
    }
    p.draw = function() {
        
        if( is_paused ){
            return 0;
        }

        const pg = params.general;


        // prepare drawing 
        p.background(255,255,255);
        
        // simulate 
        if( s.t < pg.t_end ){   
            timeStep();
            reset_time = 0.0;
        }
        else {
            reset_time += pg.dt;
            // p_sim_end.style = ""
            // write simulation end in the center of the canvas
        }

        if( false ) // reset_time > 12 )
        {
            reset_time = 0.0;
            init();
        }

        const scale_factor = p.width / p.height / sim_aspect;
        
        // simulation area size
        const ws = pg.w_screen;
        const hs = pg.h_screen;



        const h = pg.h_init;
        sX = (p.width / ws) * p.min(1, 1 / scale_factor);
        sY = (-p.height / hs) * p.min(1, scale_factor);
        tX = ws / 2;
        tY = -hs + (hs - h) * 0.25;


        p.scale(sX,sY);
        p.translate(tX, tY);

        // drag and drop 

        if (dragging && dragIndex >= 0 && dragIndex < s.cells.length) {
            s.cells[dragIndex].pos.x = p.mouseX / sX - tX;
            s.cells[dragIndex].pos.y = p.mouseY / sY - tY;
        }



        // draw tissue
        for( let i = 0; i < s.cells.length; ++i ) {
            s.cells[i].draw();
        }

        p.stroke(100,0,0,255);
        p.strokeWeight(0.05);
        for( let e = 0; e < s.ap_links.length; ++e) {
            const i = s.ap_links[e].r;
            const j = s.ap_links[e].l;
            p.line( s.cells[i].A.x, s.cells[i].A.y, s.cells[j].A.x, s.cells[j].A.y );
        }


        p.stroke(0,0,0,255);
        p.strokeWeight(0.05);
        for( let e = 0; e < s.ba_links.length; ++e) {
            const i = s.ba_links[e].r;
            const j = s.ba_links[e].l;
            p.line( s.cells[i].B.x, s.cells[i].B.y, s.cells[j].B.x, s.cells[j].B.y );
        }

        p.stroke(100,100,100);
        p.strokeWeight(0.1);
        p.line(ws/2 - 6, -0.05*hs, ws/2 - 4, -0.05*hs);

        
        p.scale(1,-1);
        p.noStroke();
        p.fill(255,255,255);
        p.textSize(16/p.max(sX,-sY));
        p.textAlign(p.CENTER, p.CENTER);
        let i_emt = 1;
        for( let i = 0; i < s.cells.length; ++i ) {
            if( s.cells[i].type.name == 'emt' ) {
                // p.text(i_emt, s.cells[i].pos.x, -s.cells[i].pos.y)
                i_emt += 1;
            }
        }

        
        p.fill(80,80,160);
        p.textSize(16/p.max(sX,-sY));
        p.textAlign(p.LEFT, p.TOP);
        p.text("10 μm", ws/2 - 6, 0.07*hs);

        inputs.update_display(p, s);
    }


    p.mousePressed = function () {
        let mouse = p.createVector(p.mouseX / sX - tX, p.mouseY / sY - tY);
        const pg = params.general;

        if( s.t > pg.t_end ) {
            init();
            return;
        }

        if ( mouse.x < -pg.w_screen/2 || mouse.x > pg.w_screen/2 || mouse.y < -1.0 || mouse.y > pg.h_screen) { return; };

        let di;
        let dm = pg.w_screen + pg.h_screen;
        dragIndex = -1;
        for (let i = 0; i < s.cells.length; ++i) {
            di = mouse.dist(s.cells[i].pos);
            if (di < dm) {
                dragIndex = i;
                dm = di;
            }
        }

        if (dragIndex >= 0 && dragIndex < s.cells.length && dm <= s.cells[dragIndex].R_soft) {
            dragging = true;
        }
    }


    p.mouseReleased = function () {
        // Quit dragging
        dragging = false;
    }


    p.windowResized = function () {
        const height_proposal = sim_div.clientHeight;
        const width_proposal = sim_div.clientWidth;

        const aspect_proposal = width_proposal / height_proposal;
        
        p.resizeCanvas(width_proposal, width_proposal / sim_aspect);
    }
}


function init_display(s) {}
function update_display(p, s) {}


let inputs = {
  params: params,
  init_display: init_display,
  update_display: update_display,
  screen_size: { w: 1000.0, h: 500.0 },
};

let sim_emt_p5 = new p5((p) => sim_emt(p, inputs, $("sim")), "sim");


import { Pane } from "./js/tweakpane-4.0.5.min.js";
const pane = new Pane({
  container: document.getElementById("tweakpane"),
});
pane.addBinding(params.general, "N_init", {min: 5, max: 100});
pane.addBinding(params.general, "N_emt", {min: 0, max: 50});
pane.addBinding(params.general, "curvature", {min: -0.1, max: 0.1, step: 0.001});

pane.addBlade({ view: "separator" });
const btn_pause = pane.addButton({title: "Pause/Resume",});
pane.addBlade({view: "separator"});
const btn_reset = pane.addButton({title: "Restart",});

btn_pause.on("click", () => {sim_emt_p5.pause();});
btn_reset.on("click", () => {sim_emt_p5.init();});
