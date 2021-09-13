
class entity_enemy_zombie_t extends entity_enemy_t {
	_init(patrol_dir) {
		super._init(patrol_dir);
		this._model = model_zombie;
		this._texture = 18;
		this._speed = 0;
		this._attack_distance = 350;
		this._health = 60;

		this._ANIMS[3] = [0.25, [0,0,5,5]]; // 3: Attack prepare

		this._STATE_FOLLOW =         [0,   0, 0.1];
		this._STATE_ATTACK_RECOVER = [0,   0, 1.1, this._STATE_IDLE];
		this._STATE_ATTACK_EXEC =    [4,   0, 0.4, this._STATE_ATTACK_RECOVER];
		this._STATE_ATTACK_PREPARE = [3,   0, 0.4, this._STATE_ATTACK_EXEC];
		this._STATE_ATTACK_AIM =     [0,   0, 0.1, this._STATE_ATTACK_PREPARE];
		this._STATE_EVADE =          [0,   0, 0.1, this._STATE_ATTACK_AIM];

		this._set_state(this._STATE_IDLE);
	}

	_receive_damage(from, amount) {
		// Ignore damage that's not large enough to gib us
		if (amount > 60) {
			super._receive_damage(from, amount) 
		}
	}

	_attack() {
		this._play_sound(sfx_enemy_hit);
		this._spawn_projectile(entity_projectile_gib_t, 600, 0, -0.5);
	}
}
