
let
map_data,
model_data,

// Particles
model_explosion,
model_blood,
model_gib,
model_gib_pieces = [],

// Enemies
model_grunt,
model_enforcer,
model_ogre,
model_zombie,
model_hound,

// Map Objects
model_barrel,
model_torch,

// Weapon view models
model_shotgun,
model_nailgun,
model_grenadelauncher,

// Pickups
model_pickup_nailgun,
model_pickup_grenadelauncher,
model_pickup_box,
model_pickup_grenades,
model_pickup_key,
model_door,

// Projectiles
model_grenade,
model_plasma, // aka. nail

// Sounds
sfx_enemy_hit,
sfx_enemy_gib,
sfx_enemy_hound_attack,

sfx_no_ammo,
sfx_hurt,
sfx_pickup,

sfx_plasma_shoot,

sfx_shotgun_shoot,
sfx_shotgun_reload,

sfx_nailgun_shoot,
sfx_nailgun_hit,

sfx_grenade_shoot,
sfx_grenade_bounce,
sfx_grenade_explode,

game_load = async () => {
	r_init();

	// Create textures
	ttt(texture_data).map(r_create_texture);
	
	// Load map & model containers	
	map_data = await map_load_container(/*DEBUG[*/ 'build/' + /*]*/ 'l');
	model_data = await model_load_container(/*DEBUG[*/ 'build/' + /*]*/ 'm');

	// Create models. Many models share the same geometry just with different
	// sizes and textures.
	// 0: generic blob
	// 1: humanoid
	// 2: barrel
	// 3: q logo
	// 4: hound
	// 5: box
	// 6: nailgun
	// 7: torch

	model_q = model_init(model_data[3]);

	model_explosion = model_init(model_data[0], 0.1,0.1,0.1);
	model_blood = model_init(model_data[0], 0.1,0.2,0.1);
	model_gib = model_init(model_data[0], 0.3,0.6,0.3);
	
	model_grunt = model_init(model_data[1], 2.5,2.2,2.5);
	model_enforcer = model_init(model_data[1], 3,2.7,3);
	model_zombie = model_init(model_data[1], 1.5,2,1.5);
	model_ogre = model_init(model_data[1], 4,3,4);
	model_hound = model_init(model_data[4],2.5,2.5,2.5);

	model_barrel = model_init(model_data[2], 2, 2, 2);
	model_torch = model_init(model_data[7], 0.6,1,0.6);

	model_pickup_nailgun = model_init(model_data[6], 1, 1, 1);
	model_pickup_grenadelauncher = model_init(model_data[2], 1, 0.5, 0.5);
	model_pickup_box = model_init(model_data[5], 0.7, 0.7, 0.7);
	model_pickup_grenades = model_init(model_data[5], 0.5, 1, 0.5);
	model_pickup_key = model_init(model_data[5], 0.1, 0.7, 0.1);

	model_door = model_init(model_data[5], 5, 5, 0.5);
	
	model_shotgun = model_init(model_data[2], 1,0.2,0.2);
	model_grenadelauncher = model_init(model_data[2], 0.7,0.4,0.4);
	model_nailgun = model_init(model_data[6], 0.7,0.7,0.7);

	model_grenade = model_init(model_data[2], 0.3,0.3,0.3);
	model_nail = model_init(model_data[2], 0.5,0.1,0.1);

	// Take some parts from the grunt model and build individual giblet models
	// from it. Arms and legs and stuff...
	for (let i = 0; i < 204; i+=34) {
		let m = model_init(model_data[1], 2,1,2);
		m.f[0] += i;
		m.nv = 34;
		model_gib_pieces.push(m);
	}


	r_submit_buffer();
	requestAnimationFrame(run_frame);

	f.onclick = () => g.requestFullscreen();
	g.onclick = () => {
		g.onclick = () => c.requestPointerLock();
		g.onclick();
		
		audio_init();

		// Generate sounds
		sfx_enemy_hit = audio_create_sound(135, [8,0,0,1,148,1,3,5,0,0,139,1,0,2653,0,2193,255,2,639,119,2,23,0,0,0,0,0,0,0]);
		sfx_enemy_gib = audio_create_sound(140, [7,0,0,1,148,1,7,5,0,1,139,1,0,4611,789,15986,195,2,849,119,3,60,0,0,0,1,10,176,1]);
		sfx_enemy_hound_attack = audio_create_sound(132, [8,0,0,1,192,1,8,0,0,1,120,1,0,5614,0,20400,192,1,329,252,1,55,0,0,1,1,8,192,3]);

		sfx_no_ammo = audio_create_sound(120, [8,0,0,0,96,1,8,0,0,0,0,0,255,0,0,1075,232,1,2132,255,0,0,0,0,0,0,0,0,0]);
		sfx_hurt = audio_create_sound(135, [7,3,140,1,232,3,8,0,9,1,139,3,0,4611,1403,34215,256,4,1316,255,0,0,0,1,0,1,7,255,0]);
		sfx_pickup = audio_create_sound(140, [7,0,0,1,187,3,8,0,0,1,204,3,0,4298,927,1403,255,0,0,0,3,35,0,0,0,0,0,0,0]);

		sfx_plasma_shoot = audio_create_sound(135, [8,0,0,1,147,1,6,0,0,1,159,1,0,197,1234,21759,232,2,2902,255,2,53,0,0,0,0,0,0,0]);

		sfx_shotgun_shoot = audio_create_sound(135, [7,3,0,1,255,1,6,0,0,1,255,1,112,548,1979,11601,255,2,2902,176,2,77,0,0,1,0,10,255,1]);
		sfx_shotgun_reload = audio_create_sound(125, [9,0,0,1,131,1,0,0,0,0,0,3,255,137,22,1776,255,2,4498,176,2,36,2,84,0,0,3,96,0]);

		sfx_nailgun_shoot = audio_create_sound(130, [7,0,0,1,132,1,8,4,0,1,132,2,162,0,0,8339,232,2,2844,195,2,40,0,0,0,0,0,0,0]);
		sfx_nailgun_hit = audio_create_sound(135, [8,0,0,1,148,1,0,0,0,0,0,1,255,0,0,2193,128,2,6982,119,2,23,0,0,0,0,0,0,0]);

		sfx_grenade_shoot = audio_create_sound(127, [8,0,0,1,171,1,9,3,0,1,84,3,96,2653,0,13163,159,2,3206,255,2,64,0,0,0,1,9,226,0]);
		sfx_grenade_bounce = audio_create_sound(168, [7,0,124,0,128,0,8,5,127,0,128,0,125,88,0,2193,125,1,1238,240,1,91,3,47,0,0,0,0,0]);
		sfx_grenade_explode = audio_create_sound(135, [8,0,0,1,195,1,6,0,0,1,127,1,255,197,1234,21759,232,2,1052,255,4,73,3,25,1,0,10,227,1]);


		audio_play(audio_create_song(...music_data), 1, 1);
		game_init(0);
		run_frame = game_run;
	};
},

run_frame = (time_now) => {
	r_prepare_frame();

	r_draw(
		vec3(0,0,0), 0, 0, 1, 
		model_q.f[0], model_q.f[0], 0,
		model_q.nv
	);
	r_push_light(
		vec3(Math.sin(time_now*0.00033)*200, 100, -100),
		10, 255,192,32
	);
	r_push_light(
		vec3_rotate_y(vec3(0, 0, 100),time_now*0.00063),
		10, 32,64,255
	);
	r_push_light(
		vec3_rotate_y(vec3(100, 0, 0),time_now*0.00053),
		10, 196,128,255
	);
	
	r_end_frame();
	requestAnimationFrame(run_frame);
};

game_load();