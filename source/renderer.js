
let
options = {antialias: false},
gl = (c.getContext('webgl', options) || c.getContext('experimental-webgl', options)),

R_MAX_VERTS = 1024 * 64, // allow 512k verts max
R_MAX_LIGHT_V3 = 64,

// Vertex shader source. This translates the model position & rotation and also
// mixes positions of two buffers for animations.
R_SOURCE_VS = 
	'precision highp float;' +

	// Vertex positions, normals and uv coords for the fragment shader
	'varying vec3 vp,vn;' +
	'varying vec2 vt;' +

	// Input vertex positions & normals and blend vertex positions & normals
	'attribute vec3 p,n,p2,n2;' +

	// Input UV coords
	'attribute vec2 t;' +		

	// Camera position (x, y, z) and aspect ratio (w)
	'uniform vec4 c;' + 

	// Model position (x, y, z)
	'uniform vec3 mp;' + 

	// Model rotation (yaw, pitch)
	'uniform vec2 mr;' + 		

	// Mouse rotation yaw (x), pitch (y)
	'uniform vec2 m;' +

	// Blend factor between the two vertex positions
	'uniform float f;' +

	// Generate a rotation Matrix around the x,y,z axis;
	// Used for model rotation and camera yaw
	'mat4 rx(float r){' +
		'return mat4(' +
			'1,0,0,0,' +
			'0,cos(r),sin(r),0,' +
			'0,-sin(r),cos(r),0,' +
			'0,0,0,1' +
		');' +
	'}' +

	'mat4 ry(float r){' +
		'return mat4(' +
			'cos(r),0,-sin(r),0,' +
			'0,1,0,0,' +
			'sin(r),0,cos(r),0,' +
			'0,0,0,1' +
		');' +
	'}' +

	'mat4 rz(float r){' +
		'return mat4(' +
			'cos(r),sin(r),0,0,' +
			'-sin(r),cos(r),0,0,' +
			'0,0,1,0,' +
			'0,0,0,1' +
		');' +
	'}' +

	'void main(void){' +
		// Rotation Matrixes for model rotation
		'mat4 '+
			'mry=ry(mr.x),' +
			'mrz=rz(mr.y);' +

		// Mix vertex positions, rotate and add the model position
		'vp=(mry*mrz*vec4(mix(p,p2,f),1.)).xyz+mp;' +

		// Mix normals
		'vn=(mry*mrz*vec4(mix(n,n2,f),1.)).xyz;' +

		// UV coords are handed over to the fragment shader as is
		'vt=t;' +

		// Final vertex position is transformed by the projection matrix,
		// rotated around mouse yaw/pitch and offset by the camera position
		// We use a FOV of 90, so the matrix[0] and [5] are conveniently 1.
		// (1 / Math.tan((90/180) * Math.PI / 2) === 1)
		'gl_Position=' +
			'mat4(' +
				'1,0,0,0,' +
				'0,c.w,0,0,' +
				'0,0,1,1,' +
				'0,0,-2,0' +
			')*' + // projection
			'rx(-m.y)*ry(-m.x)*' +
			'vec4(vp-c.xyz,1.);' +
	'}',
	
// Fragment shader source. Calculates the lighting, does some cheesy gamma
// correction and reduces the colors of the final output.
R_SOURCE_FS = 
	'precision highp float;' +

	// Vertex positions, normals and uv coords
	'varying vec3 vp,vn;' +
	'varying vec2 vt;' +

	'uniform sampler2D s;' +

	// Lights [(x,y,z), [r,g,b], ...]
	'uniform vec3 l['+R_MAX_LIGHT_V3+'];' +

	'void main(void){' +
		'gl_FragColor=texture2D(s,vt);' +

		// Debug: no textures
		// 'gl_FragColor=vec4(1.0,1.0,1.0,1.0);' + 

		// Calculate all lights
		'vec3 vl;' +
		'for(int i=0;i<'+R_MAX_LIGHT_V3+';i+=2) {' +
			'vl+=' +
				// Angle to normal
				'max('+ 
					'dot('+
						'vn, normalize(l[i]-vp)' +
					')' +
				',0.)*' + 
				'(1./pow(length(l[i]-vp),2.))' + // Inverse distance squared
				'*l[i+1];' + // Light color/intensity
		'}' +

		// Debug: full bright lights
		// 'vl = vec3(2,2,2);' +

		'gl_FragColor.rgb=floor('+
			'gl_FragColor.rgb*pow(vl,vec3(0.75))'+ // Light, Gamma
			'*16.0+0.5'+
		')/16.0;' + // Reduce final output color for some extra dirty looks
	'}',

// 8 properties per vert [x,y,z, u,v, nx,ny,nz]
r_buffer = new Float32Array(R_MAX_VERTS*8), 
r_num_verts = 0,

// 2 vec3 per light [(x,y,z), [r,g,b], ...]
r_light_buffer = new Float32Array(R_MAX_LIGHT_V3*3), 
r_num_lights = 0,

// Uniform locations
r_u_camera,
r_u_lights,
r_u_mouse,
r_u_pos,
r_u_rotation,
r_u_frame_mix,

// Vertex attribute location for mixing
r_va_p2, r_va_n2,

// Texture handles
r_textures = [],

// Camera position
r_camera = vec3(0, 0,-50),
r_camera_pitch = 0.2,
r_camera_yaw = 0,

// We collect all draw calls in an array and draw them all at once at the end
// the frame. This way the lights buffer will be completely filled and we
// only need to set it once for all geometry
r_draw_calls = [],

r_init = () => {
	// Create shorthand WebGL function names
	// let webglShortFunctionNames = {};
	for (let name in gl) {
		if (gl[name].length != undefined) {
			gl[name.match(/(^..|[A-Z]|\d.|v$)/g).join('')] = gl[name];
			// webglShortFunctionNames[name] = 'gl.' +name.match(/(^..|[A-Z]|\d.|v$)/g).join('');
		}
	}
	// console.log(JSON.stringify(webglShortFunctionNames, null, '\t'));

	let shader_program = gl.createProgram();
	gl.attachShader(shader_program, r_compile_shader(gl.VERTEX_SHADER, R_SOURCE_VS));
	gl.attachShader(shader_program, r_compile_shader(gl.FRAGMENT_SHADER, R_SOURCE_FS));
	gl.linkProgram(shader_program);
	gl.useProgram(shader_program);

	r_u_camera = gl.getUniformLocation(shader_program, 'c');
	r_u_lights = gl.getUniformLocation(shader_program, 'l');
	r_u_mouse = gl.getUniformLocation(shader_program, 'm');
	r_u_pos = gl.getUniformLocation(shader_program, 'mp');
	r_u_rotation = gl.getUniformLocation(shader_program, 'mr');
	r_u_frame_mix = gl.getUniformLocation(shader_program, 'f');
	
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());

	r_vertex_attrib(shader_program, 'p', 3, 8, 0); // position
	r_vertex_attrib(shader_program, 't', 2, 8, 3); // texture coord
	r_vertex_attrib(shader_program, 'n', 3, 8, 5); // normals

	r_va_p2 = r_vertex_attrib(shader_program, 'p2', 3, 8, 0); // mix position
	r_va_n2 = r_vertex_attrib(shader_program, 'n2', 3, 8, 5); // mix normals

	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.enable(gl.CULL_FACE);
	gl.viewport(0,0,c.width,c.height);
},

r_compile_shader = (shader_type, shader_source) => {
	let shader = gl.createShader(shader_type);
	gl.shaderSource(shader, shader_source);
	gl.compileShader(shader);
	// console.log(gl.getShaderInfoLog(shader));
	return shader;
},

r_vertex_attrib = (shader_program, attrib_name, count, vertex_size, offset) => {
	let location = gl.getAttribLocation(shader_program, attrib_name);
	gl.enableVertexAttribArray(location);
	gl.vertexAttribPointer(location, count, gl.FLOAT, false, vertex_size * 4, offset * 4);
	return location;
},

r_create_texture = (c) => {
	let t = {t:gl.createTexture(), c};
	gl.bindTexture(gl.TEXTURE_2D, t.t);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
	gl.generateMipmap(gl.TEXTURE_2D);
	r_textures.push(t);
},

r_prepare_frame = (r,g,b) => {
	gl.clearColor(r,g,b,1);
	gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

	r_num_lights = 0;
	r_light_buffer.fill(0);
},

r_end_frame = () => {
	gl.uniform4f(r_u_camera, r_camera.x, r_camera.y, r_camera.z, 16/9);
	gl.uniform2f(r_u_mouse, r_camera_yaw, r_camera_pitch);
	gl.uniform3fv(r_u_lights, r_light_buffer);

	let vo = 0,
		last_texture = -1;
	for (let c of r_draw_calls) {
		
		// c = [x, y, z, yaw, pitch, texture, offset1, offset2, mix, length]

		// Bind new texture only if it changed from the previous one. The map
		// is sorted by texture indices, so this helps.
		if (last_texture != c[5]) {
			last_texture = c[5];
			gl.bindTexture(gl.TEXTURE_2D, r_textures[last_texture].t);
		}

		gl.uniform3f(r_u_pos, c[0], c[1], c[2]);
		gl.uniform2f(r_u_rotation, c[3], c[4]);
		gl.uniform1f(r_u_frame_mix, c[8]);

		// If we have two different frames, calculate the offset from the
		// drawArrays call to the mix frame.
		// Setting the vertexAttribPointer is quite expensive, so we only
		// do this if we have to; i.e. for animated models.
		if (vo != (c[7]-c[6])) {
			vo = (c[7]-c[6]);
			gl.vertexAttribPointer(r_va_p2, 3, gl.FLOAT, false, 8 * 4, vo*8*4);
			gl.vertexAttribPointer(r_va_n2, 3, gl.FLOAT, false, 8 * 4, (vo*8+5)*4);
		}
		gl.drawArrays(gl.TRIANGLES, c[6], c[9]);
	}

	// Reset draw calls
	r_draw_calls = [];
},

r_draw = (pos, yaw, pitch, texture, f1, f2, mix, num_verts) => {
	r_draw_calls.push([
		pos.x, pos.y, pos.z, yaw, pitch,
		texture, f1, f2, mix, num_verts
	]);
},

r_submit_buffer = () => {
	gl.bufferData(gl.ARRAY_BUFFER, r_buffer.subarray(0, r_num_verts*8), gl.STATIC_DRAW);
},

r_push_vert = (pos, normal, u, v) => {
	r_buffer.set([pos.x, pos.y, pos.z, u, v, normal.x, normal.y, normal.z], r_num_verts * 8);
	r_num_verts++;
},

r_push_quad = (v0, v1, v2, v3, u, v) => {
	let n = vec3_face_normal(v0, v1, v2);
	r_push_vert(v0, n, u, 0);
	r_push_vert(v1, n, 0, 0);
	r_push_vert(v2, n, u, v);
	r_push_vert(v3, n, 0, v);
	r_push_vert(v2, n, u, v);
	r_push_vert(v1, n, 0, 0);
},

r_push_block = (x, y, z, sx, sy, sz, texture) => {
	let canvas = r_textures[texture].c,
		index = r_num_verts,
		tx = sx/canvas.width,
		ty = sy/canvas.height,
		tz = sz/canvas.width,
		
		// top
		v0 = vec3(x, y + sy, z),
		v1 = vec3(x + sx, y + sy, z),
		v2 = vec3(x, y + sy, z + sz),
		v3 = vec3(x + sx, y + sy, z + sz),

		// bottom
		v4 = vec3(x, y, z + sz),
		v5 = vec3(x + sx, y, z + sz),
		v6 = vec3(x, y, z),
		v7 = vec3(x + sx, y, z);

	r_push_quad(v0, v1, v2, v3, tx, tz); // top
	r_push_quad(v4, v5, v6, v7, tx, tz); // bottom
	r_push_quad(v2, v3, v4, v5, tx, ty); // front
	r_push_quad(v1, v0, v7, v6, tx, ty); // back
	r_push_quad(v3, v1, v5, v7, tz, ty); // right
	r_push_quad(v0, v2, v6, v4, tz, ty); // left
	return index;
},

r_push_light = (pos, intensity, r, g, b) => {
	// Calculate the distance to the light, fade it out between 768--1024
	let fade = clamp(
		scale(
			vec3_dist(pos, r_camera), 
			768, 1024, 1, 0
		),
		0, 1
	) * intensity * 10;

	if (fade && r_num_lights < R_MAX_LIGHT_V3/2) {
		r_light_buffer.set([pos.x, pos.y, pos.z, r*fade, g*fade, b*fade], r_num_lights*6);
		r_num_lights++;
	}
};

