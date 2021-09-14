set -e

# Compile the pack_map
gcc -std=c99 pack_map.c -lm -o pack_map

# Pack maps
./pack_map assets/maps/m1.map build/m1.plb
./pack_map assets/maps/m2.map build/m2.plb

# Concat all maps into one file
cat \
	build/m1.plb \
	build/m2.plb \
	> build/l

# Pack models
php pack_model.php assets/models/boulder.obj build/boulder.rmf
php pack_model.php assets/models/q.obj build/q.rmf
php pack_model.php assets/models/grenade.obj build/grenade.rmf
php pack_model.php \
	assets/models/hound_run_1.obj \
	assets/models/hound_run_2.obj \
	build/hound.rmf	
php pack_model.php \
	assets/models/unit_idle.obj \
	assets/models/unit_run_1.obj \
	assets/models/unit_run_2.obj \
	assets/models/unit_run_3.obj \
	assets/models/unit_run_4.obj \
	assets/models/unit_fire.obj \
	build/unit.rmf

php pack_model.php assets/models/box.obj build/box.rmf
php pack_model.php assets/models/nailgun.obj build/nailgun.rmf
php pack_model.php \
	assets/models/torch_1.obj \
	assets/models/torch_2.obj \
	assets/models/torch_3.obj \
	build/torch.rmf

# Concat all models into one file
cat \
	build/boulder.rmf \
	build/unit.rmf \
	build/grenade.rmf \
	build/q.rmf \
	build/hound.rmf \
	build/box.rmf \
	build/nailgun.rmf \
	build/torch.rmf \
	> build/m


# Concat js Source
cat \
	source/wrap_pre.js \
	source/document.js \
	source/textures.js \
	source/music.js \
	source/audio.js \
	source/input.js \
	source/ttt.js \
	source/math_utils.js \
	source/renderer.js \
	source/model.js \
	source/map.js \
	source/entity.js \
	source/entity_player.js \
	source/entity_door.js \
	source/entity_light.js \
	source/entity_torch.js \
	source/entity_barrel.js \
	source/entity_particle.js \
	source/entity_projectile_grenade.js \
	source/entity_projectile_nail.js \
	source/entity_projectile_plasma.js \
	source/entity_projectile_gib.js \
	source/entity_projectile_shell.js \
	source/entity_enemy.js \
	source/entity_enemy_grunt.js \
	source/entity_enemy_enforcer.js \
	source/entity_enemy_ogre.js \
	source/entity_enemy_zombie.js \
	source/entity_enemy_hound.js \
	source/entity_pickup.js \
	source/entity_pickup_key.js \
	source/entity_pickup_nailgun.js \
	source/entity_pickup_grenadelauncher.js \
	source/entity_pickup_health.js \
	source/entity_pickup_nails.js \
	source/entity_pickup_grenades.js \
	source/entity_trigger_level.js \
	source/weapons.js \
	source/game.js \
	source/main.js \
	source/wrap_post.js \
	> build/game.js


# Compress WebGL calls, remove DEBUG[...]
php pack_js.php build/game.js > build/game.packed.js

# Uglify JS
npx uglify-js build/game.packed.js \
	--compress --mangle toplevel -c --beautify --mangle-props regex=/^_/ \
	-o build/game.min.beauty.js
	
npx uglify-js build/game.packed.js \
	--compress --mangle toplevel --mangle-props regex=/^_/ \
	-o build/game.min.js

npx roadroller -Zab14 -Zlr930 -Zmd19 -Zpr14 -S0,1,2,3,7,13,14,19,58,97,305,422 build/game.min.js -o build/game.roadrolled.js

# Embed source into HTML
sed -e '/GAME_SOURCE/{r build/game.roadrolled.js' -e 'd}' source/html_template.html > build/index.html

# Build ZIP
rm -f -- build/game.zip
cd build
zip game.zip index.html l m
cd ..

advzip -z -4 build/game.zip
ls -la build/
