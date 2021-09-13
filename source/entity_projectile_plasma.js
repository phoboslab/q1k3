
class entity_projectile_plasma_t extends entity_t {
	_init() {
		this._texture = 21;
		this._model = model_nail;
		this._gravity = 0;
		this._die_at = game_time + 3;
	}

	_update() {
		this._update_physics();
		this._draw_model();
		r_push_light(this.p, 5, 255, 128, 0);
	}

	_did_collide(axis) {
		this._kill();
		this._play_sound(sfx_nailgun_hit);
		this._spawn_particles(2, 80, model_explosion, 8, 0.4);
		game_spawn(entity_light_t, vec3_add(this.p, vec3(0,10,0)), 5, 0xf5)._die_at = game_time + 0.1;
	}

	_did_collide_with_entity(other) {
		this._kill();
		other._receive_damage(this, 15);
	}
}
