
class entity_pickup_grenades_t extends entity_pickup_t {
	_init() {
		super._init();
		this._texture = 25;
		this._model = model_pickup_grenades;
	}

	_pickup() {
		for (let w of game_entity_player._weapons) {
			if (w instanceof(weapon_grenadelauncher_t)) {
				w._ammo += 10;
				audio_play(sfx_pickup);
				this._kill();
			}
		}
	}
}
