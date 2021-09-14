
let ENTITY_GROUP_NONE = 0,
	ENTITY_GROUP_PLAYER = 1,
	ENTITY_GROUP_ENEMY = 2;

class entity_t {
	constructor(pos, p1, p2) {
		this.a = vec3();
		this.v = vec3();
		this.p = pos;
		this.s = vec3(2,2,2);
		this.f = 0;

		this._health = 50;
		this._dead = 0;
		this._die_at = 0;
		this._step_height = 0;
		this._bounciness = 0;
		this._gravity = 1;
		this._yaw = 0;
		this._pitch = 0;
		this._anim = [1, [0]];
		this._anim_time = Math.random();
		this._on_ground = 0;
		this._keep_off_ledges = 0;

		this._check_against = ENTITY_GROUP_NONE;
		this._stepped_up_at = 0;

		this._init(p1, p2);
	}
	
	_init(p1, p2) {}

	_update() {
		if (this._model) {
			this._draw_model();
		}
	}

	_update_physics() {
		if (this._die_at && this._die_at < game_time) {
			this._kill();
			return;
		}

		// Apply Gravity
		this.a.y = -1200 * this._gravity;

		// Integrate acceleration & friction into velocity
		let ff = Math.min(this.f * game_tick, 1);
		this.v = vec3_add(
			this.v, vec3_sub(
				vec3_mulf(this.a, game_tick), 
				vec3_mul(this.v, vec3(ff, 0, ff))
			)
		);


		// Set up the _check_entities array for entity collisions
		this._check_entities = [
			[], 
			game_entities_friendly, 
			game_entities_enemies
		][this._check_against];

		// Divide the physics integration into 16 unit steps; otherwise fast
		// projectiles may just move through walls.
		let 
			original_step_height = this._step_height,
			move_dist = vec3_mulf(this.v, game_tick),
			steps = Math.ceil(vec3_length(move_dist) / 16),
			move_step = vec3_mulf(move_dist, 1/steps);

		for (let s = 0; s < steps; s++) {
			// Remember last position so we can roll back
			let lp = vec3_clone(this.p);

			// Integrate velocity into position
			this.p = vec3_add(this.p, move_step);

			// Collision with walls, horizonal
			if (this._collides(vec3(this.p.x, lp.y, lp.z))) {
				
				// Can we step up?
				if (
					!this._step_height || !this._on_ground || this.v.y > 0 || 
					this._collides(vec3(this.p.x, lp.y+this._step_height, lp.z))
				) {
					this._did_collide(0);
					this.p.x = lp.x;
					this.v.x = -this.v.x * this._bounciness;
				}
				else {
					lp.y += this._step_height;
					this._stepped_up_at = game_time;
				}

				s = steps; // stop after this iteration
			}

			// Collision with walls, vertical
			if (this._collides(vec3(this.p.x, lp.y, this.p.z))) {
				
				// Can we step up?
				if (
					!this._step_height || !this._on_ground || this.v.y > 0 || 
					this._collides(vec3(this.p.x, lp.y+this._step_height, this.p.z))
				) {
					this._did_collide(2);
					this.p.z = lp.z;
					this.v.z = -this.v.z * this._bounciness;
				}
				else {
					lp.y += this._step_height;
					this._stepped_up_at = game_time;
				}

				s = steps; // stop after this iteration
			}

			// Collision with ground/Ceiling
			if (this._collides(this.p)) {
				this._did_collide(1);
				this.p.y = lp.y;

				// Only bounce from ground/ceiling if we have enough velocity
				let bounce = Math.abs(this.v.y) > 200 ? this._bounciness : 0;
				this._on_ground = this.v.y < 0 && !bounce;
				this.v.y = -this.v.y * bounce;

				s = steps; // stop after this iteration
			}

			this._step_height = original_step_height;
		}
		
	}

	_collides(p) {
		if (this._dead) {
			return;
		}
		for (let entity of this._check_entities) {
			if (vec3_dist(p, entity.p) < this.s.y + entity.s.y) {
				// If we collide with an entity set the step height to 0,
				// so we don't climb up on its shoulders :/
				this._step_height = 0;
				this._did_collide_with_entity(entity);
				return true;
			}
		}

		// Check if there's no block beneath this point. We want the AI to keep
		// off of ledges.
		if (
			this._on_ground && this._keep_off_ledges &&
			!map_block_at(p.x >> 5, (p.y-this.s.y-8) >> 4, p.z >>5) &&
			!map_block_at(p.x >> 5, (p.y-this.s.y-24) >> 4, p.z >>5)
		) {
			return true;
		}

		// Do the normal collision check with the whole box
		return map_block_at_box(vec3_sub(p, this.s), vec3_add(p, this.s));
	}

	_did_collide(axis) {}

	_did_collide_with_entity(other) {}

	_draw_model() {
		this._anim_time += game_tick;

		// Calculate which frames to use and how to mix them
		let f = (this._anim_time / this._anim[0]),
			mix = f - (f|0),
			frame_cur = this._anim[1][(f|0) % this._anim[1].length],
			frame_next = this._anim[1][((f+1)|0) % this._anim[1].length];
		
		// Swap frames if we're looping to the first frame again
		if (frame_next < frame_cur) {
			[frame_next, frame_cur] = [frame_cur, frame_next];
			mix = 1-mix;
		}
		r_draw(
			this.p, this._yaw, this._pitch, this._texture, 
			this._model.f[frame_cur], this._model.f[frame_next], mix, 
			this._model.nv
		);
	}

	_spawn_particles(amount, speed = 1, model, texture, lifetime) {
		for (let i = 0; i < amount; i++) {
			let particle = game_spawn(entity_particle_t, this.p);
			particle._model = model;
			particle._texture = texture;
			particle._die_at = game_time + lifetime + Math.random() * lifetime * 0.2;
			particle.v = vec3(
				(Math.random() - 0.5) * speed,
				Math.random() * speed,
				(Math.random() - 0.5) * speed
			);
		}
	}

	_receive_damage(from, amount) {
		if (this._dead) {
			return;
		}
		this._health -= amount;
		if (this._health <= 0) {
			this._kill();
		}
	}

	_play_sound(sound) {
		let volume = clamp(scale(vec3_dist(this.p, r_camera), 64, 1200, 1, 0),0,1),
			pan = Math.sin(vec3_2d_angle(this.p, r_camera)-r_camera_yaw)*-1;
		audio_play(sound, volume, 0, pan);
	}

	_kill() {
		this._dead = 1;
	}
}
