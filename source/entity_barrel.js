
class entity_barrel_t extends entity_t {
	_init() {
		this._model = model_barrel;
		this._texture = 21;
		this._pitch = Math.PI/2;
		this._health = 10;
		this.s = vec3(8, 32, 8);

		game_entities_enemies.push(this);
	}

	_kill() {
		// Deal some damage to nearby entities
		for (let entity of game_entities_enemies) {
			let dist = vec3_dist(this.p, entity.p);
			if (entity !== this && dist < 256) {
				entity._receive_damage(this, scale(dist, 0, 256, 60, 0));
			}
		}

		super._kill();
		this._play_sound(sfx_grenade_explode);
		for (let m of model_gib_pieces) {
			this._spawn_particles(2, 600, m, 21, 1);
		}
		game_spawn(entity_light_t, vec3_add(this.p, vec3(0,16,0)), 250, 0x08f)._die_at = game_time + 0.2;
		game_entities_enemies = game_entities_enemies.filter(e => e != this);
	}
}
