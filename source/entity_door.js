
class entity_door_t extends entity_t {
	_init(texture, dir) {
		this._model = model_door;
		this._texture = texture;
		this._health = 10;
		this.s = vec3(64, 64, 64);
		this._start_pos = vec3_clone(this.p);
		
		this._reset_state_at = 0;
		this._yaw = dir * Math.PI/2;
		this._open = 0;

		// Map 1 only has one door and it needs a key. Should be a flag
		// in the entity data instead :/
		this._needs_key = game_map_index == 1; 

		// Doors block enemies and players
		game_entities_enemies.push(this);
		game_entities_friendly.push(this);
	}

	_update() {
		this._draw_model();
		if (vec3_dist(this.p, game_entity_player.p) < 128) {
			if (this._needs_key) {
				game_show_message('YOU NEED THE KEY...');
				return;
			}
			this._reset_state_at = game_time + 3;
		}
		
		if (this._reset_state_at < game_time) {
			this._open = Math.max(0, this._open-game_tick);
		}
		else {
			this._open = Math.min(1, this._open+game_tick);
		}

		this.p = vec3_add(this._start_pos, vec3_rotate_y(vec3(96 * this._open,0,0), this._yaw));
	}

	_receive_damage() {}
}
