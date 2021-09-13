
class entity_enemy_hound_t extends entity_enemy_t {
	_init(patrol_dir) {
		super._init(patrol_dir);
		this._model = model_hound;
		this._texture = 22;
		this._health = 25;
		this._check_against = ENTITY_GROUP_PLAYER;

		this.s = vec3(12,16,12);

		this._attack_distance = 200;
		this._evade_distance = 64;
		this._attack_chance = 0.7;
		this._speed = 256;

		this._ANIMS = [
			[1, [0]],               // 0: Idle
			[0.15, [0,1]],          // 2: Run
			[0.15, [0,1]],          // 2: Run
			[1, [0]],               // 3: Attack prepare
			[0.1, [0,1,1,1,0,0,0]], // 4: Attack
		];

		this._STATE_PATROL =         [1, 0.2, 0.5];
		this._STATE_ATTACK_RECOVER = [0,   0, 0.5, this._STATE_FOLLOW];
		this._STATE_ATTACK_EXEC =    [4,   0, 1,   this._STATE_ATTACK_RECOVER];
		this._STATE_ATTACK_PREPARE = [3,   0, 0.0, this._STATE_ATTACK_EXEC];
		this._STATE_ATTACK_AIM =     [0,   0, 0.0, this._STATE_ATTACK_PREPARE];
		this._STATE_EVADE =          [2,   1, 0.3, this._STATE_ATTACK_AIM];

		this._set_state(this._STATE_IDLE);
	}

	_did_collide_with_entity(other) {
		if (!this._did_hit && this._state == this._STATE_ATTACK_EXEC) {
			this._did_hit = 1;
			other._receive_damage(this, 14);
		}
	}

	_attack() {
		this._play_sound(sfx_enemy_hound_attack);
		this.v = vec3_rotate_y(vec3(0, 250, 600), this._target_yaw);
		this._on_ground = 0;
		this._did_hit = 0;

		// Ignore ledges while attacking
		this._keep_off_ledges = 0;
		clearTimeout(this._reset_ledges);
		this._reset_ledges = setTimeout(()=>this._keep_off_ledges = 1, 1000);
	}
}
