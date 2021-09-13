
class entity_pickup_t extends entity_t {
	_init() {
		this._model = model_pickup_box;
		this.s = vec3(12,12,12);
		this._yaw += Math.PI/2;
	}

	_update() {
		if (!this._on_ground) {
			this._update_physics();
		}
		this._draw_model();
		if (vec3_dist(this.p, game_entity_player.p) < 40) {
			this._pickup();
		}
	}
}
