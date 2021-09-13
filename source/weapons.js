
class weapon_t {
	constructor() {
		this._needs_ammo = 1;
		this._projectile_offset = vec3(0,0,8);
		this._init();
	}

	_shoot(pos, yaw, pitch) {
		if (this._needs_ammo) {
			this._ammo--;
		}
		audio_play(this._sound);
		this._spawn_projectile(pos, yaw, pitch);
	}

	_spawn_projectile(pos, yaw, pitch) {
		let projectile = game_spawn(this._projectile_type, vec3_add(
			pos, 
			vec3_add(
				vec3(0, 12, 0),
				vec3_rotate_yaw_pitch(
					this._projectile_offset,
					yaw, pitch
				)
			)
		));

		// Set the projectile velocity, yaw and pitch
		projectile.v = vec3_rotate_yaw_pitch(
			vec3(0, 0, this._projectile_speed),
			yaw, pitch
		);
		projectile._yaw = yaw -Math.PI/2;
		projectile._pitch = -pitch;
		projectile._check_against = ENTITY_GROUP_ENEMY;

		// Alternate left/right fire for next projectile (nailgun)
		this._projectile_offset.x *= -1;
	}
}

class weapon_shotgun_t extends weapon_t {
	_init() {
		this._texture = 7;
		this._model = model_shotgun;
		this._sound = sfx_shotgun_shoot;
		this._needs_ammo = 0;
		this._reload = 0.9;
		this._projectile_type = entity_projectile_shell_t;
		this._projectile_speed = 10000;
	}

	_spawn_projectile(pos, yaw, pitch) {
		setTimeout(()=>audio_play(sfx_shotgun_reload), 200);
		setTimeout(()=>audio_play(sfx_shotgun_reload), 350);
		for (let i = 0; i < 8; i++) {
			super._spawn_projectile(pos, yaw+Math.random()*0.08-0.04, pitch+Math.random()*0.08-0.04);
		}
	}
}

class weapon_nailgun_t extends weapon_t {
	_init() {
		this._texture = 4;
		this._model = model_nailgun;
		this._sound = sfx_nailgun_shoot;
		this._ammo = 100;
		this._reload = 0.09;
		this._projectile_type = entity_projectile_nail_t;
		this._projectile_speed = 1300;
		this._projectile_offset = vec3(6,0,8);
	}
}

class weapon_grenadelauncher_t extends weapon_t {
	_init() {
		this._texture = 21;
		this._model = model_grenadelauncher;
		this._sound = sfx_grenade_shoot;
		this._ammo = 10;
		this._reload = 0.650;
		this._projectile_type = entity_projectile_grenade_t;
		this._projectile_speed = 900;
	}
}