
let
model_load_container = async (path) => {
	/* Parse Retarded Model Format (.rmf):
		struct {
			u8 num_frames;
			u8 num_verts; // per frame
			u8 num_indices;
			struct {
				u8 x, y, z;
			} verts[num_frames * num_verts];
			struct {
				u8 a_address_inc, b_index, c_index;
			} indices[num_indices];
		} rmf_data;
	*/
	let data = new Uint8Array(await (await fetch(path)).arrayBuffer()),
		models = [];

	for (let i = 0; i < data.length;) {
		// let model_size = num_frames * num_verts * 3 + num_indices * 3
		let model_size = (data[i++] * data[i++] + data[i++]) * 3;
		models.push(data.subarray(i-3, i += model_size));
	}
	return models;
},

model_init = (data, sx = 1, sy = 1, sz = 1) => {
	// Load header, prepare buffers
	let j = 0,
		num_frames = data[j++],
		num_vertices = data[j++],
		num_indices = data[j++],
		vertices = new Float32Array(num_vertices * num_frames * 3),
		indices = new Uint8Array(num_indices * 3),

		index_increment = 0,
		offset = 2,

	// Load vertices, center on origin (-15), scale, find the 
	// min/max x and y to compute our UV coords accordingly.
		min_x = 16,
		max_x = -16,
		min_y = 16,
		max_y = -16;

	for (let i = 0; i < num_vertices * num_frames * 3; i += 3) {
		vertices[i] = (data[j++] - 15) * sx;
		vertices[i+1] = (data[j++] - 15) * sy;
		vertices[i+2] = (data[j++] - 15) * sz;

		// Find min/max only for the first frame
		if (i < num_vertices * 3) {
			min_x = Math.min(min_x, vertices[i]);
			max_x = Math.max(max_x, vertices[i]);
			min_y = Math.min(min_y, vertices[i+1]);
			max_y = Math.max(max_y, vertices[i+1]);
		}
	}
	
	// Load indices, 1x 2bit increment, 2x 7bit absolute
	for (let i = 0; i < num_indices * 3; i += 3) {
		index_increment += data[j++];
		indices[i] = index_increment;
		indices[i+1] = data[j++];
		indices[i+2] = data[j++];
	}

	// UV coords in texture space and width/height as fraction of model size
	let uf = 1 / (max_x - min_x),
		u = -min_x * uf,
		vf = -1 / (max_y - min_y),
		v = max_y * vf;

	// Compute normals for each frame and face and submit to render buffer.
	// Capture the current vertex offset for the first vertex of each frame.
	let frames = [];

	for (let frame_index = 0; frame_index < num_frames; frame_index++) {
		frames.push(r_num_verts);

		let vertex_offset = frame_index * num_vertices * 3;
		for (let i = 0; i < num_indices * 3; i += 3) {

			let mv = [], uv = [];
			for (let face_vertex = 0, o = 0; face_vertex < 3; face_vertex++) {
				let idx = indices[i + face_vertex] * 3;
				mv[face_vertex] = vec3(
					vertices[vertex_offset + idx + 0],
					vertices[vertex_offset + idx + 1],
					vertices[vertex_offset + idx + 2]
				);
				uv[face_vertex] = {
					u: vertices[idx + 0] * uf + u, 
					v: vertices[idx + 1] * vf + v
				};
			}

			let n = vec3_face_normal(mv[2], mv[1], mv[0]);
			r_push_vert(mv[2], n, uv[2].u, uv[2].v);
			r_push_vert(mv[1], n, uv[1].u, uv[1].v);
			r_push_vert(mv[0], n, uv[0].u, uv[0].v);
		}
	}

	return {f: frames, nv: num_indices * 3};
}
