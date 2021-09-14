
class entity_player_t extends entity_t {
	_init() {
		this.s = vec3(12,24,12);
		this.f = 10;
		this._speed = 3000;
		this._step_height = 17;
		this._can_jump = 0;
		this._can_shoot_at = 0;
		this._health = 100;

		this._check_against = ENTITY_GROUP_ENEMY;

		this._weapons = [new weapon_shotgun_t];
		this._weapon_index = 0;

		// Map 1 needs some rotation of the starting look-at direction
		this._yaw += game_map_index * Math.PI; 
		this._bob = 0;

		game_entity_player = this;
		game_entities_friendly.push(this);
	}

	_update() {
		// Mouse look
		this._pitch = clamp(this._pitch + mouse_y * m.value * (mi.checked ? -0.00015 : 0.00015), -1.5, 1.5);
		this._yaw = (this._yaw + mouse_x * m.value * 0.00015) % (Math.PI*2);

		// Acceleration in movement direction
		this.a = vec3_mulf(
			vec3_rotate_y(
				vec3(
					keys[key_right] - keys[key_left],
					0,
					keys[key_up] - keys[key_down]
				), 
				this._yaw
			), 
			this._speed * (this._on_ground ? 1 : 0.3)
		);

		if (keys[key_jump] && this._on_ground && this._can_jump) {
			this.v.y = 400;
			this._on_ground = 0;
			this._can_jump = 0;
		}
		if (!keys[key_jump]) {
			this._can_jump = 1;
		}

		this._weapon_index = (
			this._weapon_index + keys[key_next] + this._weapons.length - keys[key_prev]
		) % this._weapons.length;

		let shoot_wait = this._can_shoot_at - game_time,
			weapon = this._weapons[this._weapon_index];

		// Shoot Weapon
		if (keys[key_action] && shoot_wait < 0) {
			this._can_shoot_at = game_time + weapon._reload;

			if (weapon._needs_ammo && weapon._ammo == 0) {
				audio_play(sfx_no_ammo);
			}
			else {
				weapon._shoot(this.p, this._yaw, this._pitch);
				game_spawn(entity_light_t, this.p, 10, 0xff)._die_at = game_time + 0.1;			
			}
		}

		this._bob += vec3_length(this.a) * 0.0001;
		this.f = this._on_ground ? 10 : 2.5;
		this._update_physics();

		r_camera.x = this.p.x;
		r_camera.z = this.p.z;

		// Smooth step up on stairs
		r_camera.y = this.p.y + 8 - clamp(game_time - this._stepped_up_at, 0, 0.1) * -160;

		r_camera_yaw = this._yaw;
		r_camera_pitch = this._pitch;


		// Draw weapon at camera position at an offset and add the current
		// recoil (calculated from shoot_wait and weapon._reload) accounting
		// for the current view yaw/pitch

		r_draw(
			vec3_add(
				r_camera, 
				vec3_rotate_yaw_pitch(
					vec3(
						0,
						-10 + Math.sin(this._bob)*0.3,
						12 + clamp(scale(shoot_wait, 0, weapon._reload, 5, 0), 0, 5)
					),
					this._yaw, this._pitch
				)
			),
			this._yaw + Math.PI/2, this._pitch,
			weapon._texture, weapon._model.f[0], weapon._model.f[0], 0,
			weapon._model.nv
		);

		h.textContent = this._health|0;
		a.textContent = weapon._needs_ammo ? weapon._ammo : '∞';

		// Debug: a light around the player
		// r_push_light(vec3_add(this.p, vec3(0,64,0)), 10, 255, 192, 32);
	}

	_receive_damage(from, amount) {
		audio_play(sfx_hurt);
		super._receive_damage(from, amount);
	}

	_kill() {
		super._kill();
		h.textContent = this._health|0;
		title_show_message('YOU DIED');
		setTimeout(() => game_init(game_map_index), 2000);
	}
}
