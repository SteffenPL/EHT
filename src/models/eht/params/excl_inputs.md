Below is an example of a legacy XLSX parameter file. 

I would like to write an import legacy XLSX button which 
extracts as much transferable information from these files
but ignores some other aspects which the current simulator doesn't
have or need anymore.

Please go through the parameters and see which ones can be linked to existing ones and create a map. 

Then, implement an importer which loads XLSX files into the interface.


sheet: parameters
key	value
sim.name	
sim.t_end	80
sim.dt	0.05
stat.num_rep	200
stat.random_seed	0
epi.basal_curvature	0
epi.init_basal_junction_dist	1.5
epi.N_init	30
epi.prob_out_div	0.9
epi.init_apical_junction_dist	1.5
epi.init_distr	control: 10, exp: 1, control: 10
epi.init_zone.size.x	20
epi.init_zone.size.y	2
epi.init_zone.center.x	0
epi.init_zone.center.y	1
epi.mu	0.1
epi.init_method	clustered
alg.n_substeps	40
alg.alg_name	PBD
alg.dt	0.01
epi.k_apical_healing	-0.2

sheet: cell_type
parameter	control	exp
R_hard	0.3	0.3
R_soft	1	1
apical_cytos_strain	-1	-1
apical_junction_init	0.333333333	0.333333333
basal_cytos_strain	-1	-1
basal_damping_ratio	1	1
color	lightgreen	purple
cytoskeleton_init	1.5	1.5
diffusion	0.1	0.1
duration_G2	0.5	0.5
duration_mitosis	0.5	0.5
k_apical_junction	-5	-5
k_cytoskeleton	5	5
max_basal_junction_dist	2	2
running_mode	0	0
running_speed	1	1
stiffness_apical_apical	5	5
stiffness_nuclei_apical	2	2
stiffness_nuclei_basal	2	2
stiffness_repulsion	4	4
stiffness_straightness	15	15
life_span.min	10	10
life_span.max	21	21
basal_repulsion	0.1	0.1

sheet: cell_events
cell_type	name	symbol	factor	abs_value	sim_time_start	sim_time_end	cell_ref_time	cell_time_start
control	inc_radius	R_hard	0	0.7	0	Inf	Cell_Mitosis_Start	0
control	inc_apical_stiffness	stiffness_apical_apical	2	0	0	Inf	Cell_G2_Start	0
control	contract_apical_cytos	apical_cytos_strain	0	-1	0	Inf	Cell_G2_Start	0
control	extend_basal_cytos	basal_cytos_strain	0	2	0	Inf	Cell_G2_Start	0
exp	inc_radius	R_hard	0	0.7	0	Inf	Cell_Mitosis_Start	0
exp	inc_apical_stiffness	stiffness_apical_apical	2	0	0	Inf	Cell_G2_Start	0
exp	contract_apical_cytos	apical_cytos_strain	0	-1	0	loss_apical_adhesion.sim_time_start	Cell_G2_Start	0
exp	extend_basal_cytos	basal_cytos_strain	0	2	0	loss_basal_adhesion.sim_time_start	Cell_G2_Start	0
exp	loss_polarity	stiffness_straightness	0	1	Inf	Inf	Cell_Birth	0

sheet: special_cell_events
cell_type	name	julia_function	sim_time_start	sim_time_end	cell_ref_time	cell_time_start
control	divide_cell	divide_cell	0	Inf	Cell_Division	0
exp	divide_cell	divide_cell	Inf	Inf	Cell_Division	0
exp	loss_basal_adhesion	loss_basal_connection	Inf	Inf	Cell_G2_Start	0.1
exp	loss_apical_adhesion	loss_apical_connection	Inf	Inf	Cell_Birth	0
exp	reset_cell_cycle	reset_cell_cycle	0	Inf	Cell_Division	0
exp	recovering_local_loss_apical_adhesion	recovering_local_loss_apical_connection	12	Inf	Cell_Birth	0
exp	local_loss_apical_adhesion	local_loss_apical_connection	Inf	Inf	Cell_Birth	0