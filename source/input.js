
// We use the ev.code for keyboard input. This contains a string like "KeyW"
// or "ArrowLeft", which is awkward to use, but it's keyboard layout neutral,
// so that WASD should work with any layout.

// We detect the 6th or 3rd char for each of those strings and map them to an
// in-game button.

// Movement, Action, Prev/Next, Jump
let keymap = {
		W: 1, p: 1, // Key[W] or ArrowU[p]
		A: 2, e: 2, // Key[A] or ArrowL[e]ft
		S: 3, o: 3, // Key[S] or ArrowD[o]wn
		D: 4, i: 4, // Key[D] or ArrowR[i]ght
		Q: 5,       // Key[Q]
		E: 6,       // Key[E]
		c: 9,       // KeySpa[c]e
	},
	keys = [
		// Unused zeroth key, so we can test the keymap result for truthiness
		0,

		// WASD/Arrow Keys and prev next have to be set to zero, because we use 
		// the value (0 or 1) to calculate the move direction or weapon switch
		0,0,0,0,
		0,0

		// Following Keys (action, jump) to not have to be set here
		// as they are just tested for truthiness
	],
	key_up = 1,
	key_down = 3,
	key_left = 2,
	key_right = 4,
	key_prev = 5,
	key_next = 6,
	key_action = 7, // ev.button = 0
	key_jump = 9, // ev.button = 2
	mouse_x = 0, 
	mouse_y = 0,
	last_wheel_event = 0;

document.onkeydown = (ev) => {
	let k = keymap[ev.code[6] || ev.code[3]];
	if (k) {
		ev.preventDefault();
		keys[k] = 1;
	}
};

document.onkeyup = (ev) => {
	let k = keymap[ev.code[6] || ev.code[3]];
	if (k) {
		ev.preventDefault();
		keys[k] = 0;
	}
};

document.onwheel = (ev) => {
	// Allow for one wheel event every 0.1s. This sucks, but prevents free
	// spinning or touch scrolling mouses (eg. Apple Magic Mouse) from doing
	// wild things.
	if (game_time - last_wheel_event > 0.1) {
		keys[key_prev + (ev.deltaY > 1 ? 1 : 0)] = 1;
		last_wheel_event = game_time;
	}
};

c.onmousemove = (ev) => {
	mouse_x += ev.movementX;
	mouse_y += ev.movementY;
};

c.onmousedown = (ev) => {
	ev.preventDefault();
	keys[key_action + ev.button] = 1;
};

c.onmouseup = (ev) => {
	ev.preventDefault();
	keys[key_action + ev.button] = 0;
};

