
class entity_pickup_key_t extends entity_pickup_t {
	_init() {
		super._init();
		this._texture = 21;
		this._model = model_pickup_key;
	}

	_update() {
		this._yaw += 0.02;
		super._update();
	}

	_pickup() {
		audio_play(sfx_pickup);
		game_show_message('YOU GOT THE KEY!');
		for (let e of game_entities) {
			if (e._needs_key) {
				e._needs_key = 0;
				break;
			}
		}
		this._kill();
	}
}
