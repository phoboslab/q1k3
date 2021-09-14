
document.body.innerHTML +=
	'<style>'+
		'*{font-family:sans-serif;}'+
		'a,body{color:#fff;background:#111;text-align:center;margin:0;}'+
		'#c{display:block;width:100%;image-rendering:optimizeSpeed;image-rendering:pixelated;max-height:100vh;object-fit:contain;}'+
		'#g{position:relative;margin:0 0 32px 0;font-weight:bold;}'+
		'#ts{position:absolute;bottom:2em;left:0;right:0;font-size:1.2vw;}'+
		'#msg{position:absolute;top:8vw;left:0;right:0;font-size:1.2vw;display:none;}'+
		'#a,#h{position:absolute;bottom:3%;left:20%;right:0;font-size:3.2vw;}'+
		'#h{left:-20%;}'+
		'h1{font-size:16vw;margin:0;}'+
	'</style>'+
	'<div id="g">'+
		'<canvas id=c width=320 height=180></canvas>'+
		'<div id="ts"><h1>Q1K3</h1>CLICK TO START</div>'+
		'<div id="h"></div><div id="a"></div>'+
		'<div id="msg"></div>'+
	'</div>'+
	'<p>MOUSE SPEED: <input id="m" type="range" value=10 min=1 max=50> INVERT: <input type="checkbox" id="mi"></p>'+
	'<p><input id="f" type="button" value="FULLSCREEN"></p>'+
	'<p>'+
		'code: <a href="https://phoboslab.org">phoboslab.org</a> / music: <a href="http://no-fate.net">no-fate.net</a>'+
	'</p>';