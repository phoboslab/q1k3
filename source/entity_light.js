
class entity_light_t extends entity_t {
	_init(light, color) {
		this._light = light;
		this._spawn_time = game_time;
		if (light == 1) {
			this._flicker = true;
		}
		if (!color) {
			console.log('no color!')
		}
		this._color = [
			((color & 0x7) << 5),
			((color & 0x1c) << 3),
			(color & 0xc0)
		];
	}

	_update() {
		if (this._flicker && Math.random() > 0.9) {
			this._light = Math.random() > 0.5 ? 10 : 0;
		}
		let intensity = this._light;
		
		// If this light is a temporary one, fade it out over its lifetime
		if (this._die_at) {
			if (this._die_at < game_time) {
				this._kill();
			}
			intensity = scale(game_time, this._spawn_time, this._die_at, 1, 0) * this._light;
		}

		r_push_light(this.p, intensity, this._color[0], this._color[1], this._color[2]);
	}
}
