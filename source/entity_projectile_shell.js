
class entity_projectile_shell_t extends entity_t {
	_init() {
		this._gravity = 0;
		this._die_at = game_time + 0.1;
	}

	_update() {
		this._update_physics();
	}

	_did_collide(axis) {
		this._kill();
		this._spawn_particles(2, 80, model_explosion, 4, 0.4);
		game_spawn(entity_light_t, this.p, 0.5, 0xff)._die_at = game_time + 0.1;
	}

	_did_collide_with_entity(other) {
		this._kill();
		other._receive_damage(this, 4);
	}
}
