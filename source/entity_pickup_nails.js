
class entity_pickup_nails_t extends entity_pickup_t {
	_init() {
		super._init();
		this._texture = 24;
	}

	_pickup() {
		for (let w of game_entity_player._weapons) {
			if (w instanceof(weapon_nailgun_t)) {
				w._ammo += 50;
				audio_play(sfx_pickup);
				this._kill();
			}
		}
	}
}
