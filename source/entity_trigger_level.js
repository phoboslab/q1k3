
class entity_trigger_level_t extends entity_t {
	_update() {
		if (!this._dead && vec3_dist(this.p, game_entity_player.p) < 64) {
			game_next_level();
			this._dead = 1;
		}
	}
}
