/*
TTT Tiny Texture Tumbler
Dominic Szablewski - https://phoboslab.org

-- LICENSE: The MIT License(MIT)
Copyright(c) 2019 Dominic Szablewski
Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files(the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and / or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions :
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

// Compress with:
// uglifyjs ttt.js --compress --screw-ie8 --mangle toplevel -o ttt.min.js
let 
ttt=(td, only_this_index = -1,stack_depth = 0) => {
	return td.filter((d,i) => only_this_index < 0 || i == only_this_index).map(d => {
		let i = 0,
			e = document.createElement('canvas'),
			c = e.getContext('2d'),
			rgba_from_2byte = (c) => 
				'rgba(' + [
					((c>>12)&15) * 17,
					((c>>8)&15) * 17, 
					((c>>4)&15) * 17,
					(c&15)/15
				].join() + ')',
			fill_rect = (x, y, w, h, ...colors) =>
				colors.map((color, j) => {
					c.fillStyle = rgba_from_2byte(color);
					c.fillRect(x+[-1,1,0][j], y+[-1,1,0][j], w, h);
				})
			;
		// Set up canvas width and height
		e.width = d[i++];
		e.height = d[i++];

		// Fill with background color
		fill_rect(0, 0, e.width, e.height, 0,0, d[i++]);

		// Perform all the steps for this texture
		while (i < d.length) {
			let f = [
				// 0 - rectangle: x, y, width, height, top, bottom, fill
				(x, y, width, height, top, bottom, fill) => {
					fill_rect(x, y, width, height, top, bottom, fill)
				},
				
				// 1 - rectangle_multiple: start_x, start_y, width, height, 
				//                         inc_x, inc_y, top, bottom, fill
				(sx, sy, w, h, inc_x, inc_y, top, bottom, fill) => {
					for (let x = sx; x < e.width; x += inc_x) {
						for (let y = sy; y < e.height; y += inc_y) {
							fill_rect(x, y, w, h, top, bottom, fill);
						}
					}
				},
				
				// 2 - random noise: color, size
				(color, size) => {
					for (let x = 0; x < e.width; x += size) {
						for (let y = 0; y < e.height; y += size) {
							// Take the color value (first 3 nibbles) and 
							// randomize the alpha value (last nibble)
							// between 0 and the input alpha.
							fill_rect(
								x, y, size, size, 0, 0, 
								(color&0xfff0) + Math.random()*(color&15)
							);
						}
					}
				},
				
				// 3 - text: x, y, color, font,size, text
				(x, y, color, font, size, text) => {
					c.fillStyle = rgba_from_2byte(color);
					c.font = size + 'px ' + ['sans-',''][font]+'serif';
					c.fillText(text, x, y);
				},
				
				// 4 - draw a previous texture
				// We limit the stack depth here to not end up in an infinite 
				// loop by accident
				(texture_index, x, y, w, h, alpha) => {
					c.globalAlpha = alpha/15;
					(
						texture_index < td.length && stack_depth < 16 &&
						c.drawImage(
							ttt(td, texture_index, stack_depth+1)[0], 
							x, y, w, h
						)
					);
					c.globalAlpha = 1;
				}
			][d[i++]];
			f(...d.slice(i, i+=f.length));
		}
		return e;
	});
};
