<?php


$script = array_shift($argv);


/* Convert Wavefront OBJ to Retarded Model Format (RMF)

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

if (count($argv) < 2 || !file_exists($argv[0])) {
	die("Usage: php model_packer.php frame1.obj frame2.obj... outfile.rmf\n");
}

$infiles = array_slice($argv, 0, -1);
$verts = [];
$indices = [];
$max = -INF;

// Find vertices in all files
foreach ($infiles as $file) {
	if (!file_exists($file)) {
		die("Couldn't load $file\n");
	}
	echo "Loading $file\n";
	foreach (file($file) as $line) {
		if (preg_match('#^v (.*?) (.*?) (.*?)$#', $line, $m)) {
			$v = [(float)$m[1], (float)$m[2], (float)$m[3]];
			$verts[] = $v;
			$max = max($max, abs($v[0]), abs($v[1]), abs($v[2]));
		}
	}	
}

// Find indices in first file (we assume the layout is the same in all
// subsequent animation frames).
foreach (file($infiles[0]) as $line) {	
	if (preg_match('#^f (\d+).*?(\d+).*?(\d+).*?$#', $line, $m)) {
		$indices[] = [((int)$m[1])-1, ((int)$m[2])-1, ((int)$m[3])-1];
	}
}

// Pack header
$packed = 
	pack('C', count($infiles)).
	pack('C', count($verts)/count($infiles)).
	pack('C', count($indices));
	
// Pack normalized (-15, 15) vertices	
foreach ($verts as $i => $v) {
	$x = round(($v[0]/$max)*15)+15;
	$y = round(($v[1]/$max)*15)+15;
	$z = round(($v[2]/$max)*15)+15;

	// echo "Vertex $i => ($x, $y, $z)\n";
	$packed .= 
		pack('C', $x).
		pack('C', $y).
		pack('C', $z);

}

// Pack indices w. vertex index
$a_last_index = 0;
foreach ($indices as $i => $f) {
	$a_address_inc =  $f[0] - $a_last_index;
	if ($a_address_inc > 3) {
		die("Face $i index a increment exceeds 2 bits ($a_address_inc)\n");
	}
	$a_last_index = $f[0];

	if ($f[1] > 127 || $f[2] > 127) {
		die("Face $i index exceeds 7 bits ({$f[1]}, {$f[1]}, {$f[2]})\n");
	}
	
	// echo "Face $i => ({$f[1]}, {$f[1]}, {$f[2]})\n";
	// $packed .= pack('v', ($a_address_inc << 14) | ($f[1] << 7) | $f[2]);
	$packed .= 
		pack('C', $a_address_inc).
		pack('C', $f[1]).
		pack('C', $f[2]);
}

// Write
$packedfile = $argv[count($argv)-1];
file_put_contents($packedfile, $packed);

echo "Wrote $packedfile: ".
	count($infiles)." frame(s), ".
	count($verts)." verts, ".
	count($indices)." indices, ".
	strlen($packed)." bytes\n";
