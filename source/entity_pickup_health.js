
class entity_pickup_health_t extends entity_pickup_t {
	_init() {
		super._init();
		this._texture = 23;
	}

	_pickup() {
		audio_play(sfx_pickup);
		game_entity_player._health += 25;
		this._kill();
	}
}
