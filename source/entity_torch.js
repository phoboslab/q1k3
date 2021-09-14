
class entity_torch_t extends entity_t {
	_init() {
		this._texture = 30;
		this._model = model_torch;

		this._anim = [0.05, [0,1,2,1,2,0,0,1,2]];
		
		this.p.x -= 16;
		this.p.z -= 16;
		this._light_pos = this.p;

		// Find which wall we're on; move the torch model towards the wall and 
		// the light position outwards
		for (let trace_dir of [vec3(-32,0,0), vec3(32,0,0), vec3(0,0,-32), vec3(0,0,32)]) {
			let trace_end = vec3_add(this.p, trace_dir);
			if (map_trace(this.p, vec3_add(this.p, trace_dir))) {
				this.p = vec3_add(this.p, vec3_mulf(trace_dir, 0.4));
				this._light_pos = vec3_sub(this.p, vec3_mulf(trace_dir, 2));
				break;
			}
		}
		
		this._light = 0;
	}

	_update() {
		super._update();
			
		if (Math.random() > 0.8) {
			this._light = Math.random();
		}
		r_push_light(this._light_pos, Math.sin(game_time)+this._light+6, 255,192,16);
	}
}
