
class entity_projectile_gib_t extends entity_t {
	_init() {
		this._texture = 18;
		this._bounciness = 0;
		this._die_at = game_time + 2;
		this._model = model_gib;

		this._yaw = Math.random();
		this._pitch = Math.random();
	}

	_update() {
		super._update_physics();
		this._draw_model();
		this.f = this._on_ground ? 15 : 0;
	}

	_did_collide(axis) {
		if (axis == 1 && this.v.y < -128) {
			this._play_sound(sfx_enemy_hit);
		}
	}

	_did_collide_with_entity(other) {
		other._receive_damage(this, 10);
		this._kill();
	}
}
