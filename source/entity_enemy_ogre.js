
class entity_enemy_ogre_t extends entity_enemy_t {
	_init(patrol_dir) {
		super._init(patrol_dir);
		this._model = model_ogre;
		this._texture = 20;
		this._speed = 96;
		this._health = 200;
		this.s = vec3(14,36,14);

		this._attack_distance = 350;
		this._ANIMS =[
			[1, [0]],          // 0: Idle
			[0.80, [1,2,3,4]], // 1: Walk
			[0.40, [1,2,3,4]], // 2: Run
			[0.35, [0,5,5,5]], // 3: Attack prepare
			[0.35, [5,0,0,0]], // 4: Attack
		];
	}

	_attack() {
		this._play_sound(sfx_grenade_shoot);
		this._spawn_projectile(entity_projectile_grenade_t, 600, 0, -0.4)._damage = 40;
	}
}
