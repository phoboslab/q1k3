// Compile with
// gcc -std=c99 map_packer.c -lm -o map_packer

#include <math.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <string.h>
#include <assert.h>

// -----------------------------------------------------------------------------
// Utils, Vec2/3

typedef uint8_t u8;
typedef int8_t i8;
typedef uint16_t u16;
typedef int16_t i16;
typedef uint32_t u32;
typedef int32_t i32;
typedef uint64_t u64;
typedef int64_t i64;

typedef float f32;
typedef double f64;

#define F32_COMPARE_EPSILON 0.001

bool equals(f32 a, f32 b) {
	return fabs(a - b) < F32_COMPARE_EPSILON;
}

#define M_PI 3.14159265358

f32 deg_to_rad(f32 deg) {
	return (deg/180.0) * M_PI;
}

#define max(a,b) \
	({ __typeof__ (a) _a = (a); \
	__typeof__ (b) _b = (b); \
	_a > _b ? _a : _b; })
#define min(a,b) \
	({ __typeof__ (a) _a = (a); \
	__typeof__ (b) _b = (b); \
	_a < _b ? _a : _b; })


typedef struct {
	char *ptr;
	i32 length;
} string_t;

#define string(PTR, LENGTH) ((string_t){.ptr = PTR, .length = LENGTH})
#define s(STR) ((string_t){.ptr = STR, .length = sizeof(STR)-1})

bool string_equals(string_t a, string_t b) {
	if (a.length != b.length) {
		return false;
	}
	return memcmp(a.ptr, b.ptr, a.length) == 0;
}

char string_temp[1024];
char *string_cstring(string_t s) {
	i32 length = min(sizeof(string_temp)-1, s.length);
	memcpy(string_temp, s.ptr, length);
	string_temp[length] = '\0';
	return string_temp;
}



typedef struct {
	f32 x, y, z;
} vec3_t;

#define vec3(X, Y, Z) ((vec3_t){.x = X, .y = Y, .z = Z})

vec3_t vec3_add(vec3_t a, vec3_t b) {
	return vec3(a.x + b.x, a.y + b.y, a.z + b.z);
}

vec3_t vec3_sub(vec3_t a, vec3_t b) {
	return vec3(a.x - b.x, a.y - b.y, a.z - b.z);
}

vec3_t vec3_mul(vec3_t a, vec3_t b) {
	return vec3(a.x * b.x, a.y * b.y, a.z * b.z);
}

vec3_t vec3_mulf(vec3_t a, f32 f) {
	return vec3(a.x * f, a.y * f, a.z * f);
}

vec3_t vec3_divf(vec3_t a, f32 f) {
	return vec3(a.x / f, a.y / f, a.z / f);
}

bool vec3_equals(vec3_t a, vec3_t b) {
	return (equals(a.x, b.x) && equals(a.y, b.y) && equals(a.z, b.z));
}

f32 vec3_length(vec3_t a) {
	return sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
}

vec3_t vec3_cross(vec3_t a, vec3_t b) {
	return vec3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
}

f32 vec3_dot(vec3_t a, vec3_t b) {
	return a.x * b.x + a.y * b.y + a.z * b.z;
}

vec3_t vec3_normalize(vec3_t a) {
	f32 length = vec3_length(a);
	return vec3(a.x / length, a.y / length, a.z / length);
}

vec3_t vec3_face_normal(vec3_t v0, vec3_t v1, vec3_t v2) {
	vec3_t a = vec3_sub(v0, v1);
	vec3_t b = vec3_sub(v2, v1);

	vec3_t pn = vec3_cross(a, b);
	return vec3_normalize(pn);
}


typedef struct {
	f32 x, y;
} vec2_t;

#define vec2(X, Y) ((vec2_t){.x = X, .y = Y})

vec2_t vec2_add(vec2_t a, vec2_t b) {
	return vec2(a.x + b.x, a.y + b.y);
}

vec2_t vec2_rotate(vec2_t a, f32 rad) {
	return vec2(a.x * cos(rad) - a.y * sin(rad), a.x * sin(rad) + a.y * cos(rad));
}

vec2_t vec2_sub(vec2_t a, vec2_t b) {
	return vec2(a.x - b.x, a.y - b.y);
}

vec2_t vec2_mul(vec2_t a, vec2_t b) {
	return vec2(a.x * b.x, a.y * b.y);
}

vec2_t vec2_mulf(vec2_t a, float f) {
	return vec2(a.x * f, a.y * f);
}

vec2_t vec2_div(vec2_t a, vec2_t b) {
	return vec2(a.x / b.x, a.y / b.y);
}

vec2_t vec2_divf(vec2_t a, float f) {
	return vec2(a.x / f, a.y / f);
}


// -----------------------------------------------------------------------------
// Memvec

#define memvec_declare(TYPE) struct { u32 length; u32 capacity; TYPE *data; }
#define memvec_alloc(MV, c) \
	MV.capacity = max(1, c); \
	MV.length = 0; \
	MV.data = calloc(MV.capacity, sizeof(MV.data[0]));

#define memvec_ensure_capacity(MV, CAPACITY) ( \
	(CAPACITY > MV.capacity) \
		? \
			MV.data = realloc(MV.data, sizeof(MV.data[0]) * max(CAPACITY, MV.capacity * 2)), \
			memset(MV.data + MV.capacity, 0, MV.capacity * sizeof(MV.data[0])), \
			MV.capacity *= 2, 0 \
		: 0)

#define memvec_get(MV, i) &MV.data[i]
#define memvec_clear(MV) MV.length = 0
#define memvec_free(MV) (MV.data ? free(MV.data), 0 : 0);
#define memvec_push(MV, ...) ( \
	memvec_ensure_capacity(MV, MV.length + 1), \
	MV.data[MV.length] = (__typeof__(*MV.data)) __VA_ARGS__, \
	MV.length++ \
)
#define memvec_add_n(MV, n) (memvec_ensure_capacity(MV, MV.length + n), MV.length += n, &MV.data[MV.length-n])
#define memvec_add(MV) memvec_add_n(MV, 1)


// -----------------------------------------------------------------------------
// Winding

#define WINDING_MAX_VERTS 32

typedef struct {
	vec3_t pos;
	vec2_t uv;
} winding_vertex_t;

typedef struct {
	vec3_t normal;
	u32 num_vertices;
	winding_vertex_t vertices[WINDING_MAX_VERTS];
} winding_t;

void winding_copy(winding_t *dst, winding_t *src) {
	u32 base_size = sizeof(winding_t) - sizeof(winding_vertex_t) * WINDING_MAX_VERTS;
	memcpy(dst, src, base_size + src->num_vertices * sizeof(winding_vertex_t));
}

void winding_add(winding_t *self, vec3_t pos, vec3_t normal, vec2_t uv) {
	// Find duplicate
	for (u32 i = 0; i < self->num_vertices; i++) {
		if (vec3_equals(self->vertices[i].pos, pos)) {
			return;
		}
	}

	// We may need one extra vertex when splitting!
	assert(self->num_vertices < WINDING_MAX_VERTS-1);

	self->normal = normal;
	self->vertices[self->num_vertices++] = (winding_vertex_t){
		.pos = pos,
		.uv = uv
	};
}

vec3_t winding_sort_center;
vec3_t winding_sort_basis;
vec3_t winding_sort_normal;

i32 winding_compare(const void *vlp, const void *vrp) {
	winding_vertex_t *vl = (winding_vertex_t *)vlp;
	winding_vertex_t *vr = (winding_vertex_t *)vrp;

	vec3_t u = vec3_normalize(winding_sort_basis);
	vec3_t v = vec3_normalize(vec3_cross(u, winding_sort_normal));

	vec3_t local_lhs = vec3_sub(vl->pos, winding_sort_center);
	f32 lhs_pu = vec3_dot(local_lhs, u);
	f32 lhs_pv = vec3_dot(local_lhs, v);

	vec3_t local_rhs = vec3_sub(vr->pos, winding_sort_center);
	f32 rhs_pu = vec3_dot(local_rhs, u);
	f32 rhs_pv = vec3_dot(local_rhs, v);

	f32 lhs_angle = atan2(lhs_pv, lhs_pu);
	f32 rhs_angle = atan2(rhs_pv, rhs_pu);

	if (lhs_angle < rhs_angle) {
		return 1;
	}
	else if (lhs_angle > rhs_angle) {
		return -1;
	}
	return 0;
}

void winding_sort_ccw(winding_t *self) {
	winding_sort_normal = self->normal;
	winding_sort_basis = vec3_sub(self->vertices[1].pos, self->vertices[0].pos);
	winding_sort_center = vec3(0, 0, 0);
	for (u32 i = 0; i < self->num_vertices; i++) {
		winding_sort_center = vec3_add(winding_sort_center, self->vertices[i].pos);
	}
	winding_sort_center = vec3_divf(winding_sort_center, self->num_vertices);

	qsort(self->vertices, self->num_vertices, sizeof(winding_vertex_t), winding_compare);
}


// -----------------------------------------------------------------------------
// Interface

typedef struct {
	vec3_t pos;
	vec3_t normal;
	vec2_t uv;
} vertex_t;

typedef struct {
	vertex_t vertices[3];
} face_t;

typedef struct {
	vec3_t vertices[3];
	vec3_t normal;
	vec2_t uv_offset;
	vec2_t uv_scale;
	f32 uv_rotation;
	f32 dist;
	string_t texture_name;
} map_plane_t;

typedef struct {
	u32 planes_index;
	u32 planes_length;
	map_plane_t *planes;
	
	u32 faces_index;
	u32 faces_length;
	face_t *faces;
} map_brush_t;

typedef struct {
	u32 kvs_index;
	u32 kvs_length;

	u32 brushes_index;
	u32 brushes_length;

	u32 faces_index;
	u32 faces_length;
} map_entity_t;

typedef struct {
	string_t key;
	string_t value;
} entity_kv_t;

typedef struct {
	entity_kv_t *kvs;
	u32 kvs_length;

	map_brush_t *brushes;
	u32 brushes_length;

	face_t *faces;
	u32 faces_length;
} entity_t;

string_t entity_get(entity_t *entity, string_t key) {
	for (u32 i = 0; i < entity->kvs_length; i++) {
		if (string_equals(key, entity->kvs[i].key)) {
			return entity->kvs[i].value;
		}
	}
	return s("");
}

typedef struct {
	string_t file;
	char *char_ptr;

	char *error;
	char *error_at;

	memvec_declare(map_entity_t) map_entities;
	memvec_declare(map_brush_t) brushes;
	memvec_declare(map_plane_t) planes;
	memvec_declare(face_t) faces;
	memvec_declare(entity_kv_t) entity_kvs;

	entity_t *entities;
	u32 entities_length;
} map_t;

void map_delete(map_t *self);
void map_parse(map_t *self);
void map_build(map_t *self);


map_t *map_new(char *file_name, char **error, u32 *error_at) {
	FILE *fh = fopen(file_name, "rb");
	if (!fh) {
		*error = "Couldn't open file";
		*error_at = 0;
		return NULL;
	}

	map_t *self = calloc(1, sizeof(map_t));

	fseek(fh, 0, SEEK_END);
	i32 size = ftell(fh);
	fseek(fh, 0, SEEK_SET);

	self->file = string(calloc(size+1, sizeof(char)), size);
	fread(self->file.ptr, 1, size, fh);
	fclose(fh);
	self->file.ptr[size] = '\0';

	self->char_ptr = self->file.ptr;

	// Make some educated guesses of the buffer sizes we might need
	memvec_alloc(self->map_entities, self->file.length / 1000);
	memvec_alloc(self->brushes, self->file.length / 300);
	memvec_alloc(self->planes, self->file.length / 50);
	memvec_alloc(self->entity_kvs, self->map_entities.capacity * 3);

	map_parse(self);

	if (self->error) {
		*error = self->error;
		*error_at = self->error_at - self->file.ptr;
		free(self);
		return NULL;
	}

	memvec_alloc(self->faces, self->planes.length * 3);
	map_build(self);

	// Fill the entity_desc array for clients, now that we are sure we
	// don't need to realloc any data and pointers stay fixed
	self->entities_length = self->map_entities.length;
	self->entities = calloc(self->entities_length, sizeof(entity_t));
	for (u32 i = 0; i < self->map_entities.length; i++) {
		map_entity_t *entity = memvec_get(self->map_entities, i);

		self->entities[i] = (entity_t){
			.kvs = (entity->kvs_length > 0)
				? &self->entity_kvs.data[entity->kvs_index]
				: NULL,
			.kvs_length = entity->kvs_length,
			.brushes = (entity->brushes_length > 0)
				? &self->brushes.data[entity->brushes_index]
				: NULL,
			.brushes_length = entity->brushes_length,
			.faces = (entity->faces_length > 0)
				? &self->faces.data[entity->faces_index] 
				: NULL,
			.faces_length = entity->faces_length,
		};

		for (u32 b = 0; b < entity->brushes_length; b++) {
			map_brush_t *brush = &self->brushes.data[entity->brushes_index + b];
			brush->faces = (brush->faces_length > 0)
				? &self->faces.data[brush->faces_index]
				: NULL;
			brush->planes = (brush->planes_length > 0)
				? &self->planes.data[brush->planes_index]
				: NULL;
		}
	}

	return self;
}

void map_delete(map_t *self) {
	memvec_free(self->brushes);
	memvec_free(self->planes);
	memvec_free(self->map_entities);
	memvec_free(self->entity_kvs);
	memvec_free(self->faces);
	free(self->entities);
	free(self->file.ptr);
}


// -----------------------------------------------------------------------------
// Vertex Builder

void map_build_entity(map_t *self, map_entity_t *entity);
void map_build_brush(map_t *self, map_brush_t *brush);
void map_build_planes(map_t *self, map_brush_t *brush, u32 i0, u32 i1, u32 i2, winding_t *winding);
void map_build_faces(map_t *self, map_plane_t *plane, winding_t *winding);
void map_insert_winding(map_t *self, winding_t *winding);

void map_build(map_t *self) {

	// Load textures
	for (int i = 0; i < self->planes.length; i++) {
		// Unused
		// self->planes.data[i].texture_name
	}

	// Build all map_entities
	for (int i = 0; i < self->map_entities.length; i++) {
		map_entity_t *entity = memvec_get(self->map_entities, i);
		map_build_entity(self, entity);
	}
}

void map_build_entity(map_t *self, map_entity_t *entity) {
	entity->faces_index = self->faces.length;

	for (int i = 0; i < entity->brushes_length; i++) {
		map_brush_t *brush = &self->brushes.data[entity->brushes_index + i];
		map_build_brush(self, brush);
	}

	entity->faces_length = self->faces.length - entity->faces_index;
}

void map_build_brush(map_t *self, map_brush_t *brush) {
	winding_t windings[brush->planes_length];
	memset(windings, 0, sizeof(windings));

	// Test all plane combinations to find intersection points
	for (u32 i0 = 0; i0 < brush->planes_length; i0++) {
		for (u32 i1 = i0 + 1; i1 < brush->planes_length; i1++) {
			for (u32 i2 = i1 + 1; i2 < brush->planes_length; i2++) {
				map_build_planes(self, brush, i0, i1, i2, windings);
			}
		}
	}

	// Sort the raw vertices and fill the self->faces buffer
	brush->faces_index = self->faces.length;
	brush->faces_length = brush->planes_length; 
	for (u32 i = 0; i < brush->planes_length; i++) {
		map_plane_t *plane = &self->planes.data[brush->planes_index + i];
		map_build_faces(self, plane, &windings[i]);
	}
}

void map_build_planes(map_t *self, map_brush_t *brush, u32 i0, u32 i1, u32 i2, winding_t *winding) {
	map_plane_t *p0 = &self->planes.data[brush->planes_index + i0];
	map_plane_t *p1 = &self->planes.data[brush->planes_index + i1];
	map_plane_t *p2 = &self->planes.data[brush->planes_index + i2];

	// Plane intersection
	f32 denom = vec3_dot(vec3_cross(p0->normal, p1->normal), p2->normal);
	if (equals(denom, 0)) {
		return;
	}

	vec3_t p0d = vec3_mulf(vec3_cross(p1->normal, p2->normal), p0->dist);
	vec3_t p1d = vec3_mulf(vec3_cross(p2->normal, p0->normal), p1->dist);
	vec3_t p2d = vec3_mulf(vec3_cross(p0->normal, p1->normal), p2->dist);
	vec3_t intersection = vec3_divf(vec3_add(vec3_add(p0d, p1d), p2d), denom);

	// Make sure the produced intersection point is within the hull
	for (u32 i = 0; i < brush->planes_length; i++) {
		map_plane_t *plane = &self->planes.data[brush->planes_index + i];
		f32 proj = vec3_dot(plane->normal, intersection);
		if (proj - plane->dist > F32_COMPARE_EPSILON) {
			return;
		}
	}

	// Add the intersection point to all 3 planes
	winding_add(&winding[i0], intersection, p0->normal, vec2(0, 0));
	winding_add(&winding[i1], intersection, p1->normal, vec2(0, 0));
	winding_add(&winding[i2], intersection, p2->normal, vec2(0, 0));
}

void map_build_faces(map_t *self, map_plane_t *plane, winding_t *winding) {
	// Sort vertices by winding
	winding_sort_ccw(winding);	
	
	// Compute UV coords
	f32 du = fabs(vec3_dot(plane->normal, vec3(0, 0, 1)));
	f32 dr = fabs(vec3_dot(plane->normal, vec3(0, 1, 0)));
	f32 df = fabs(vec3_dot(plane->normal, vec3(1, 0, 0)));

	vec3_t axis_u, axis_v;
	if (du >= dr && du >= df) { // project z axis
		axis_u = vec3(1, 0, 0);
		axis_v = vec3(0, 1, 0);
	}
	else if (dr > du && dr > df) { // project y axis
		axis_u = vec3(1, 0, 0);
		axis_v = vec3(0, 0, 1);
	}
	else { // (df >= du && df >= dr) project x axis
		axis_u = vec3(0, -1, 0);
		axis_v = vec3(0, 0, 1);
	}

	vec2_t tsize = vec2(64, 64);
	for (u32 i = 0; i < winding->num_vertices; i++) {
		vec3_t p = winding->vertices[i].pos;
		vec2_t uv = vec2(vec3_dot(p, axis_u), vec3_dot(p, axis_v));

		uv = vec2_rotate(uv, deg_to_rad(plane->uv_rotation));
		uv = vec2_div(uv, plane->uv_scale);
		uv = vec2_add(uv, plane->uv_offset);
		uv = vec2_div(uv, tsize);

		winding->vertices[i].uv = uv;
	}

	map_insert_winding(self, winding);
}

void map_insert_winding(map_t *self, winding_t *winding) {
	for (u32 vi = 2; vi < winding->num_vertices; vi++) {
		face_t *face = memvec_add(self->faces);
		
		face->vertices[0] = (vertex_t){
			.pos = winding->vertices[0].pos,
			.normal = winding->normal,
			.uv = winding->vertices[0].uv
		};
		
		face->vertices[1] = (vertex_t){
			.pos = winding->vertices[vi-1].pos,
			.normal = winding->normal,
			.uv = winding->vertices[vi-1].uv
		};
		face->vertices[2] = (vertex_t){
			.pos = winding->vertices[vi].pos,
			.normal = winding->normal,
			.uv = winding->vertices[vi].uv
		};
	}
}

// -----------------------------------------------------------------------------
// Parser

#define peek() (*self->char_ptr)
#define next() (self->char_ptr++)
#define invalid(msg) self->error = msg; self->error_at = self->char_ptr;
#define expect(c) if (peek() != c) { invalid("Unexpected char"); } else { next(); }
#define skip_whitespace()\
	 while (\
		peek() == ' ' || peek() == '\n' || peek() == '\r' || peek() == '\t' \
	) { next(); }
#define skip_until(c) while (peek() && peek() != c) { next(); }

void map_parse_entity(map_t *self);
void map_parse_brush(map_t *self, map_entity_t *entity);
void map_parse_key_value(map_t *self, map_entity_t *entity);
string_t map_parse_quoted_string(map_t *self);
void map_parse_plane(map_t *self, map_brush_t *brush);
vec3_t map_parse_vec3(map_t *self);
f32 map_parse_f32(map_t *self);
string_t map_parse_texture(map_t *self);

void map_parse(map_t *self) {
	while (!self->error && peek()) {
		skip_whitespace();

		switch (peek()) {
			case '/': skip_until('\n'); break;
			case '{': map_parse_entity(self); break;
			case '\0': break;
			default: invalid("Unexpected char in global scope"); break;
		}
	}
}

void map_parse_entity(map_t *self) {
	expect('{');

	map_entity_t *entity = memvec_add(self->map_entities);
	entity->kvs_index = self->entity_kvs.length;
	entity->brushes_index = self->brushes.length;

	while (!self->error && peek()) {
		skip_whitespace();

		switch (peek()) {
			case '/': skip_until('\n'); break;
			case '"': map_parse_key_value(self, entity); break;
			case '{': map_parse_brush(self, entity);  break;
			case '}': next(); return;
			default: invalid("Unexpected char in entity scope") break;
		}
	}
}

void map_parse_brush(map_t *self, map_entity_t *entity) {
	expect('{');
	entity->brushes_length++;

	map_brush_t *brush = memvec_add(self->brushes);
	brush->planes_index = self->planes.length;

	while (!self->error && peek()) {
		skip_whitespace();

		switch (peek()) {
			case '(': map_parse_plane(self, brush); break;
			case '}': next(); return;
			default: invalid("Unexpected char in brush scope"); break;
		}
	}
}

void map_parse_key_value(map_t *self, map_entity_t *entity) {
	entity->kvs_length++;

	entity_kv_t *kv = memvec_add(self->entity_kvs);
	kv->key = map_parse_quoted_string(self);
	kv->value = map_parse_quoted_string(self);
}

string_t map_parse_quoted_string(map_t *self) {
	skip_whitespace();
	expect('"');

	char *start = self->char_ptr;
	skip_until('"');
	u32 length = self->char_ptr - start;
	expect('"');
	return string(start, length);
}

void map_parse_plane(map_t *self, map_brush_t *brush) {
	brush->planes_length++;

	map_plane_t *plane = memvec_add(self->planes);

	plane->vertices[0] = map_parse_vec3(self);
	plane->vertices[1] = map_parse_vec3(self);
	plane->vertices[2] = map_parse_vec3(self);
	plane->normal = vec3_face_normal(plane->vertices[0], plane->vertices[1], plane->vertices[2]);

	plane->texture_name = map_parse_texture(self);

	plane->uv_offset.x = map_parse_f32(self);
	plane->uv_offset.y = map_parse_f32(self);
	plane->uv_rotation = map_parse_f32(self);
	plane->uv_scale.x = map_parse_f32(self);
	plane->uv_scale.y = map_parse_f32(self);
	plane->dist = vec3_dot(plane->normal, plane->vertices[1]);
}

vec3_t map_parse_vec3(map_t *self) {
	skip_whitespace();
	expect('(');

	vec3_t v = vec3(
		map_parse_f32(self),
		map_parse_f32(self),
		map_parse_f32(self)
	);

	skip_whitespace();
	expect(')');
	return v;
}

f32 map_parse_f32(map_t *self) {
	skip_whitespace();

	char *start = self->char_ptr;
	while ((peek() >= '0' && peek() <= '9') || peek() == '.' || peek() == '-') {
		next();
	}
	u32 length = self->char_ptr - start;

	if (length == 0 || length > 16) {
		invalid("Expected float")
		return 0;
	}

	char buf[length+1];
	memcpy((void *)buf, start, length);
	buf[length] = '\0';
	return atof(buf);
}

string_t map_parse_texture(map_t *self) {
	skip_whitespace();

	char *start = self->char_ptr;
	skip_until(' ');
	u32 length = self->char_ptr - start;

	return string(start, length);
}

#undef peek
#undef next
#undef invalid
#undef expect
#undef skip_whitespace
#undef skip_until




// -----------------------------------------------------------------------------

#define BLOCK_RES_XZ 32
#define BLOCK_RES_Y 16

#define BLOCK_POS_MAX_XZ ((1<<8) * BLOCK_RES_XZ)
#define BLOCK_POS_MAX_Y ((1<<8) * BLOCK_RES_Y)

#define BLOCK_SIZE_MAX_XZ ((1<<8) * BLOCK_RES_XZ)
#define BLOCK_SIZE_MAX_Y ((1<<8) * BLOCK_RES_Y)

typedef struct {
	u8 x, y, z;
	u8 sx, sy, sz;
	u8 tex;
} block_t;

typedef struct {
	u8 x, y, z;
	u8 sx, sy, sz;
} block_out_t;

typedef struct {
	u8 sentinel;
	u8 tex;
} block_texture_t;

typedef struct {
	char type;
	u8 x, y, z;
	u8 data1, data2;
} block_entity_t;

u32 brushes_to_blocks(block_t *blocks, map_brush_t *brushes, u32 brushes_length) {
	u32 blocks_length = 0;
	for (u32 b = 0; b < brushes_length; b++) {
		map_brush_t *brush = &brushes[b];

		// Find min, max vert of this brush
		vec3_t vmin = vec3(INFINITY, INFINITY, INFINITY);
		vec3_t vmax = vec3(-INFINITY, -INFINITY, -INFINITY);
		for (u32 f = 0; f < brush->faces_length; f++) {
			face_t *face = &brush->faces[f];

			for (u32 v = 0; v < 3; v++) {
				vmin.x = min(vmin.x, round(face->vertices[v].pos.x));
				vmin.y = min(vmin.y, round(face->vertices[v].pos.y));
				vmin.z = min(vmin.z, round(face->vertices[v].pos.z));

				vmax.x = max(vmax.x, round(face->vertices[v].pos.x));
				vmax.y = max(vmax.y, round(face->vertices[v].pos.y));
				vmax.z = max(vmax.z, round(face->vertices[v].pos.z));
			}			
		}

		vec3_t vsize = vec3_sub(vmax, vmin);
		if (
			(vmin.x < 0 || vmin.y < 0 || vmin.z < 0) ||
			(vmin.x >= BLOCK_POS_MAX_XZ || vmin.y >= BLOCK_POS_MAX_XZ || vmin.z >= BLOCK_POS_MAX_Y) ||
			(vsize.x >= BLOCK_SIZE_MAX_XZ || vsize.y >= BLOCK_SIZE_MAX_XZ || vsize.z >= BLOCK_SIZE_MAX_Y) ||
			(vsize.x < BLOCK_RES_XZ || vsize.y < BLOCK_RES_XZ || vsize.z < BLOCK_RES_Y)
		) {
			printf(
				"Brush %d has unsupported dimensions: pos(%g %g %g) size(%g %g %g)\n",
				b, vmin.x, vmin.y, vmin.z, vsize.x, vsize.y, vsize.z
			);
			continue;
		}

		// This assumes all textures are name XX.png
		u8 tex = atoi(string_cstring(brush->planes[0].texture_name));

		// Build block, swap y<>z
		block_t block = (block_t){
			.x = (u8)(round(vmin.x / BLOCK_RES_XZ)),
			.y = (u8)(round(vmin.z / BLOCK_RES_Y)),
			.z = (u8)(round(vmin.y / BLOCK_RES_XZ)),

			.sx = (u8)(round(vsize.x / BLOCK_RES_XZ)),
			.sy = (u8)(round(vsize.z / BLOCK_RES_Y)),
			.sz = (u8)(round(vsize.y / BLOCK_RES_XZ)),

			.tex = tex
		};
		blocks[blocks_length++] = block;
	}
	return blocks_length;
}

i32 block_compare(const void *vlp, const void *vrp) {
	block_t *bl = (block_t *)vlp;
	block_t *br = (block_t *)vrp;

	i32 lt = bl->tex;
	i32 rt = br->tex;

	return lt == rt ? bl->sx - br->sx : lt - rt;
}

i32 block_entity_compare(const void *vlp, const void *vrp) {
	block_entity_t *bl = (block_entity_t *)vlp;
	block_entity_t *br = (block_entity_t *)vrp;

	return bl->type - br->type;
}

i32 main(i32 argc, char **argv) {
	if (argc < 3) {
		printf("Usage: ./map_packer infile.map outfile.plblocks\n");
		exit(1);
	}

	printf("sizeof(block_out_t) = %d\n", sizeof(block_out_t));

	char *error;
	u32 error_at;
	map_t *map = map_new(argv[1], &error, &error_at);
	if (!map) {
		printf("Error loading %s: %s at %d\n", argv[1], error, error_at);
		exit(1);
	}

	printf(
		"Loaded %s: %d entities, %d brushes, %d planes, %d faces\n",
		argv[1],
		map->entities_length, map->brushes.length, 
		map->planes.length, map->faces.length
	);

	FILE *fh = fopen(argv[2], "wb");
	if (!fh) {
		printf("Failed to open %s for writing\n", argv[2]);
		exit(1);
	}

	// Find worldspawn, build brushes
	for (u32 i = 0; i < map->entities_length; i++) {
		entity_t *entity = &map->entities[i];
		string_t classname = entity_get(entity, s("classname"));

		if (!string_equals(classname, s("worldspawn"))) {
			continue;
		}

		block_t *blocks = calloc(entity->brushes_length, sizeof(block_t));
		u16 blocks_length = brushes_to_blocks(blocks, entity->brushes, entity->brushes_length);
		

		// Sort blocks by texture index
		qsort(blocks, blocks_length, sizeof(block_t), block_compare);

		// Write blocks length
		u16 num_textures = 0;
		u8 last_texture_index = 255;
		for (u32 j = 0; j < blocks_length; j++) {
			if (blocks[j].tex != last_texture_index) {
				last_texture_index = blocks[j].tex;
				num_textures++;
			}
		}

		u32 blocks_size = blocks_length * sizeof(block_out_t) + num_textures * sizeof(block_texture_t);
		printf("%d blocks, size: %d\n", blocks_length, blocks_size);
		fwrite(&blocks_size, sizeof(u16), 1, fh);

		// Go through all blocks, write the block and the texture_t whenever
		// the texture changes.
		last_texture_index = 255;
		for (u32 j = 0; j < blocks_length; j++) {
			if (blocks[j].tex != last_texture_index) {
				last_texture_index = blocks[j].tex;
				block_texture_t bt = {255, last_texture_index};
				fwrite(&bt, sizeof(block_texture_t), 1, fh);
			}
			block_out_t bo = {
				.x = blocks[j].x,
				.y = blocks[j].y,
				.z = blocks[j].z,
				.sx = blocks[j].sx,
				.sy = blocks[j].sy,
				.sz = blocks[j].sz
			};
			fwrite(&bo, sizeof(block_out_t), 1, fh);
		}

		free(blocks);
		break;
	}

	// Gather all entities
	block_entity_t *block_entities = calloc(map->entities_length, sizeof(block_entity_t));
	u16 block_entities_length = 0;
	for (u32 i = 0; i < map->entities_length; i++) {
		entity_t *entity = &map->entities[i];
		string_t classname = entity_get(entity, s("classname"));

		char type;
		u8 extra_data1 = 0;
		u8 extra_data2 = 0;
		if (string_equals(classname, s("worldspawn"))) {
			continue;
		}
		if (string_equals(classname, s("info_player_start"))) {
			type = 0;
		}
		else if (string_equals(classname, s("enemy_grunt"))) {
			type = 1;
			extra_data1 = atoi(string_cstring(entity_get(entity, s("patrol"))));
		}
		else if (string_equals(classname, s("enemy_enforcer"))) {
			type = 2;
			extra_data1 = atoi(string_cstring(entity_get(entity, s("patrol"))));
		}
		else if (string_equals(classname, s("enemy_ogre"))) {
			type = 3;
			extra_data1 = atoi(string_cstring(entity_get(entity, s("patrol"))));
		}
		else if (string_equals(classname, s("enemy_zombie"))) {
			type = 4;
			extra_data1 = atoi(string_cstring(entity_get(entity, s("patrol"))));
		}
		else if (string_equals(classname, s("enemy_hound"))) {
			type = 5;
			extra_data1 = atoi(string_cstring(entity_get(entity, s("patrol"))));
		}
		else if (string_equals(classname, s("pickup_nailgun"))) {
			type = 6;
		}
		else if (string_equals(classname, s("pickup_grenadelauncher"))) {
			type = 7;
		}
		else if (string_equals(classname, s("pickup_health"))) {
			type = 8;
		}
		else if (string_equals(classname, s("pickup_nails"))) {
			type = 9;
		}
		else if (string_equals(classname, s("pickup_grenades"))) {
			type = 10;
		}
		else if (string_equals(classname, s("barrel"))) {
			type = 11;
		}
		else if (string_equals(classname, s("light"))) {
			type = 12;
			extra_data1 = atoi(string_cstring(entity_get(entity, s("light"))));

			// Convert 24 bit r g b string into 8 bit color value
			char *color = string_cstring(entity_get(entity, s("color")));
			i32 r, g, b;
			sscanf(color, "%d %d %d", &r, &g, &b);

			union {
				struct {
					u8 r: 3;
					u8 g: 3;
					u8 b: 2;
				} rgb;
				u8 v;
			} rgb8 = {.rgb = {r >> 5, g >> 5, b >> 6}};
			extra_data2 = rgb8.v;
		}
		else if (string_equals(classname, s("trigger_levelchange"))) {
			type = 13;
		}
		else if (string_equals(classname, s("door"))) {
			type = 14;
			extra_data1 = atoi(string_cstring(entity_get(entity, s("texture"))));
			extra_data2 = atoi(string_cstring(entity_get(entity, s("dir"))));
		}
		else if (string_equals(classname, s("pickup_key"))) {
			type = 15;
		}
		else if (string_equals(classname, s("torch"))) {
			type = 16;
		}
		else {
			printf("Unknown entity %s\n", string_cstring(classname));
			continue;
		}

		f32 x, y, z;
		char *origin = string_cstring(entity_get(entity, s("origin")));
		sscanf(origin, "%f %f %f", &x, &y, &z);

		// Build entity, swap y<>z
		block_entity_t be = {
			.type = type,
			.x = (u8)(round(x / BLOCK_RES_XZ)),
			.y = (u8)(round(z / BLOCK_RES_Y)),
			.z = (u8)(round(y / BLOCK_RES_XZ)),
			.data1 = extra_data1,
			.data2 = extra_data2,
		};
		block_entities[block_entities_length++] = be;
	}

	qsort(block_entities, block_entities_length, sizeof(block_entity_t), block_entity_compare);

	printf("%d entities, size: %d\n", block_entities_length, block_entities_length * sizeof(block_entity_t));
	fwrite(&block_entities_length, sizeof(u16), 1, fh);
	fwrite(block_entities, sizeof(block_entity_t), block_entities_length, fh);

	fclose(fh);
	map_delete(map);
}
