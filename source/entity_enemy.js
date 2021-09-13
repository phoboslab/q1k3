
class entity_enemy_t extends entity_t {
	_init(patrol_dir) {

		// Animations
		this._ANIMS =[
			[1, [0]],          // 0: Idle
			[0.40, [1,2,3,4]], // 1: Walk
			[0.20, [1,2,3,4]], // 2: Run
			[0.25, [0,5,5,5]], // 3: Attack prepare
			[0.25, [5,0,0,0]], // 4: Attack
		];

		// State definitions
		// [0: anim_index, 1: speed, 2: next_state_update, 3: next_state]
		this._STATE_IDLE =           [0,   0, 0.1];
		this._STATE_PATROL =         [1, 0.5, 0.5];
		this._STATE_FOLLOW =         [2,   1, 0.3];
		this._STATE_ATTACK_RECOVER = [0,   0, 0.1, this._STATE_FOLLOW];
		this._STATE_ATTACK_EXEC =    [4,   0, 0.4, this._STATE_ATTACK_RECOVER];
		this._STATE_ATTACK_PREPARE = [3,   0, 0.4, this._STATE_ATTACK_EXEC];
		this._STATE_ATTACK_AIM =     [0,   0, 0.1, this._STATE_ATTACK_PREPARE];
		this._STATE_EVADE =          [2,   1, 0.8, this._STATE_ATTACK_AIM];

		this.s = vec3(12,28,12);

		this._step_height = 17;
		this._speed = 196;

		this._target_yaw = this._yaw;
		this._state_update_at = 0;
		this._attack_distance = 800;
		this._evade_distance = 96;
		this._attack_chance = 0.65;
		this._keep_off_ledges = 1;
		this._turn_bias = 1;

		this._check_against = ENTITY_GROUP_PLAYER;

		game_entities_enemies.push(this);

		// If patrol_dir is non-zero it determines the partrol direction in
		// increments of 90°. Otherwise we just idle.
		if (patrol_dir) {
			this._set_state(this._STATE_PATROL);
			this._target_yaw = (Math.PI/2) * patrol_dir;
			this._anim_time = Math.random();
		}
		else {
			this._set_state(this._STATE_IDLE);
		}
	}

	_set_state(state) {
		this._state = state;
		this._anim = this._ANIMS[state[0]];
		this._anim_time = 0;
		this._state_update_at = game_time + state[2] + state[2]/4 * Math.random();
	}

	_update() {
		// Is it time for a state update?
		if (this._state_update_at < game_time) {

			// Choose a new turning bias for FOLLOW/EVADE when we hit a wall
			this._turn_bias = Math.random() > 0.5 ? 0.5 : -0.5;

			let distance_to_player = vec3_dist(this.p, game_entity_player.p),
				angle_to_player = vec3_2d_angle(this.p, game_entity_player.p);

			if (this._state[3]) {
				this._set_state(this._state[3]);
			}

			// Try to minimize distance to the player
			if (this._state == this._STATE_FOLLOW) {

				// Do we have a line of sight?
				if (!map_trace(this.p, game_entity_player.p)) {
					this._target_yaw = angle_to_player;
				}

				// Are we close enough to attack?
				if (distance_to_player < this._attack_distance) {

					// Are we too close? Evade!
					if (
						distance_to_player < this._evade_distance || 
						Math.random() > this._attack_chance
					) {
						this._set_state(this._STATE_EVADE);
						this._target_yaw += Math.PI/2 + Math.random() * Math.PI;
					}

					// Just the right distance to attack!
					else {
						this._set_state(this._STATE_ATTACK_AIM);
					}
				}
			}

			// We just attacked; just keep looking at the player 0_o
			if (this._state == this._STATE_ATTACK_RECOVER) {
				this._target_yaw = angle_to_player;
			}

			// Wake up from patroling or idlyng if we have a line of sight
			// and are near enough
			if (this._state == this._STATE_PATROL || this._state == this._STATE_IDLE) {
				if (
					distance_to_player < 700 &&
					!map_trace(this.p, game_entity_player.p)
				) {
					this._set_state(this._STATE_ATTACK_AIM);
				}
			}

			// Aiming - reorient the entity towards the player, check
			// if we have a line of sight
			if (this._state == this._STATE_ATTACK_AIM) {
				this._target_yaw = angle_to_player;

				// No line of sight? Randomly shuffle around :/
				if (map_trace(this.p, game_entity_player.p)) {
					this._set_state(this._STATE_EVADE);
				}
			}

			// Execute the attack!
			if (this._state == this._STATE_ATTACK_EXEC) {
				this._attack();
			}
		}

		// Rotate to desired angle
		this._yaw += anglemod(this._target_yaw - this._yaw) * 0.1;


		// Move along the yaw direction with the current speed (which might be 0)
		if (this._on_ground) {
			this.v = vec3_rotate_y(vec3(0, this.v.y, this._state[1] * this._speed), this._target_yaw);
		}

		this._update_physics();
		this._draw_model();
	}

	_spawn_projectile(type, speed, yaw_offset, pitch_offset) {
		let projectile = game_spawn(type, this.p);
		projectile._check_against = ENTITY_GROUP_PLAYER;
		projectile._yaw = this._yaw + Math.PI/2;

		projectile.v = vec3_rotate_yaw_pitch(
			vec3(0, 0, speed), 
			this._yaw + yaw_offset,
			Math.atan2(
				this.p.y-game_entity_player.p.y,
				vec3_dist(this.p, game_entity_player.p)
			) + pitch_offset
		);
		return projectile;
	}

	_receive_damage(from, amount) {
		super._receive_damage(from, amount);
		this._play_sound(sfx_enemy_hit);

		// Wake up if we're idle or patrolling
		if (this._state == this._STATE_IDLE || this._state == this._STATE_PATROL) {
			this._target_yaw = vec3_2d_angle(this.p, game_entity_player.p);
			this._set_state(this._STATE_FOLLOW);
		}

		this._spawn_particles(2, 200, model_blood, 18, 0.5);
	}

	_kill() {
		super._kill();
		for (let m of model_gib_pieces) {
			this._spawn_particles(2, 300, m, 18, 1);
		}
		this._play_sound(sfx_enemy_gib);
		game_entities_enemies = game_entities_enemies.filter(e => e != this);
	}

	_did_collide(axis) {
		if (axis == 1) {
			return;
		}
		
		// If we hit a wall/ledge while patrolling just turn around 180
		if (this._state == this._STATE_PATROL) {
			this._target_yaw += Math.PI;
		}
		else {
			this._target_yaw += this._turn_bias;
		}
	}
}
