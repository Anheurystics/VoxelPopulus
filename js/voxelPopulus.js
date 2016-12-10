var canvas;
var gl;
var overlay;
var context;

var program;

var cubeSize = 1.0;

var cube = [
	//Front
	-cubeSize / 2,  cubeSize / 2,  cubeSize / 2, 1.0, 0.0,
	 cubeSize / 2,  cubeSize / 2,  cubeSize / 2, 1.0, 1.0,
	 cubeSize / 2, -cubeSize / 2,  cubeSize / 2, 0.0, 1.0,
	-cubeSize / 2, -cubeSize / 2,  cubeSize / 2, 0.0, 0.0,
	//Back
	 cubeSize / 2,  cubeSize / 2, -cubeSize / 2, 1.0, 1.0,
	-cubeSize / 2,  cubeSize / 2, -cubeSize / 2, 0.0, 1.0,
	-cubeSize / 2, -cubeSize / 2, -cubeSize / 2, 0.0, 0.0,
	 cubeSize / 2, -cubeSize / 2, -cubeSize / 2, 1.0, 0.0,
	//Left
	-cubeSize / 2,  cubeSize / 2, -cubeSize / 2, 1.0, 0.0,
	-cubeSize / 2,  cubeSize / 2,  cubeSize / 2, 1.0, 1.0,
	-cubeSize / 2, -cubeSize / 2,  cubeSize / 2, 0.0, 1.0,
	-cubeSize / 2, -cubeSize / 2, -cubeSize / 2, 0.0, 0.0,
	//Right
	 cubeSize / 2,  cubeSize / 2,  cubeSize / 2, 1.0, 1.0,
	 cubeSize / 2,  cubeSize / 2, -cubeSize / 2, 1.0, 0.0,
	 cubeSize / 2, -cubeSize / 2, -cubeSize / 2, 0.0, 0.0,
	 cubeSize / 2, -cubeSize / 2,  cubeSize / 2, 0.0, 1.0,
	//Top
	-cubeSize / 2,  cubeSize / 2, -cubeSize / 2, 0.0, 0.0,
	 cubeSize / 2,  cubeSize / 2, -cubeSize / 2, 1.0, 0.0,
	 cubeSize / 2,  cubeSize / 2,  cubeSize / 2, 1.0, 1.0,
	-cubeSize / 2,  cubeSize / 2,  cubeSize / 2, 0.0, 1.0,
	//Bottom
	-cubeSize / 2, -cubeSize / 2,  cubeSize / 2, 0.0, 1.0,
	 cubeSize / 2, -cubeSize / 2,  cubeSize / 2, 1.0, 1.0,
	 cubeSize / 2, -cubeSize / 2, -cubeSize / 2, 1.0, 0.0,
	-cubeSize / 2, -cubeSize / 2, -cubeSize / 2, 0.0, 0.0
];

var vertexBuffer;
var batchArray = new Float32Array(9 * 36 * 500);
var batchIndex = 0;

var view, projection;

var camPos;
var camFront;
var camRight;
var camUp;
var camGlobalUp;
var camYaw;
var camPitch;

var LOOK_SPEED = Math.PI / 2;

var blockTex = new Image();
blockTex.src = "/img/blockTex_1.png";

var cubeTexture;

var hFov = Math.PI / 2;
var vFov = 0;

var lastUpdate;
var blocks = [];
var blockIDs = 0;
var selectedBlockID = -1;
var colors =
[
	[1.0, 0.2, 0.2],	//Red
	[1.0, 0.5, 0.2],	//Orange
	[1.0, 1.0, 0.2],	//Yellow
	[0.2, 1.0, 0.2],	//Green
	[0.2, 0.2, 1.0],	//Blue
	[0.7, 0.0, 1.0],	//Lavender
	[1.0, 1.0, 1.0],	//White
	[0.1, 0.1, 0.1],	//Black
	[0.5, 0.2, 0.0],	//Brown
	[0.15, 0.5, 0.0]	//Dark green
]
var currentColorIndex = 0;

var targetBlock;
var intersectingSide;

var keyStates = [];
var lastUp = [];
var PRESSED_DURATION = 0.1;
var isPointerLocked = false;

var fps;
var fpsUpdate = 0.5;

var saveInterval = 300;
var saveTimer = 0;
var storageKey = "anheu-voxel-populus-map";

window.addEventListener("load", init);
window.addEventListener("resize", resize);

function init() {
	canvas = document.getElementById("canvas");

	canvas.requestPointerLock = canvas.requestPointerLock ||
           canvas.mozRequestPointerLock ||
           canvas.webkitRequestPointerLock;

	document.exitPointerLock = document.exitPointerLock ||
			 document.mozExitPointerLock ||
			 document.webkitExitPointerLock;

	gl = canvas.getContext("webgl");

	if(!gl) {
		gl = canvas.getContext("experimental-webgl");
	}

	overlay = document.getElementById("canvasOverlay");
	context = overlay.getContext("2d");

	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	overlay.width = canvas.width;
	overlay.height = canvas.height;
	overlay.style.position = "relative";
	overlay.style.transform = canvas.style.transform;

	if(!gl) {
		alert("Can't get WebGL Context!");
	} else {
		initGL();

		loadData();

		lastUpdate = Date.now();
		requestAnimationFrame(render);
	}
}

window.onbeforeunload = function() {
	saveMap();
}

function initGL() {
	var vertShader = makeShader(gl.VERTEX_SHADER, document.getElementById("vert-shader").innerHTML);
	var fragShader = makeShader(gl.FRAGMENT_SHADER, document.getElementById("frag-shader").innerHTML);

	gl.clearColor(0.2, 0.2, 0.2, 1.0);

	program = gl.createProgram();
	gl.attachShader(program, vertShader);
	gl.attachShader(program, fragShader);
	gl.linkProgram(program);
	if(!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		throw "Program link error: " + gl.getProgramInfoLog(program);
	}
	gl.useProgram(program);

	vertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	var posLoc = gl.getAttribLocation(program, "a_Position");
	gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 9 * Float32Array.BYTES_PER_ELEMENT, 0);
	gl.enableVertexAttribArray(posLoc);
	var texLoc = gl.getAttribLocation(program, "a_TexCoord");
	gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 9 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);
	gl.enableVertexAttribArray(texLoc);
	var colLoc = gl.getAttribLocation(program, "a_Color");
	gl.vertexAttribPointer(colLoc, 4, gl.FLOAT, false, 9 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);
	gl.enableVertexAttribArray(colLoc);

	view = mat4.create();

	camPos = [0, 0, 0];
	camPos = [0, 0, -10];
	camFront = [0, 0, 0];
	camGlobalUp = [0, 1, 0];
	camYaw = Math.PI / 2;
	camPitch = 0;

	projection = mat4.create();
	mat4.perspective(projection, vFov = 2 * Math.atan(Math.tan(hFov / 2) * canvas.height / canvas.width), canvas.width / canvas.height, 0.1, 100.0);

	alert(blockTex.width);

	cubeTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, cubeTexture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, blockTex);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.generateMipmap(gl.TEXTURE_2D);
	gl.bindTexture(gl.TEXTURE_2D, null);

	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);

	gl.enable(gl.BLEND);
	gl.blendFunc (gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
}

function makeShader(type, source) {
	var shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		throw "Shader compile error: "  + gl.getShaderInfoLog(shader);
	}
	return shader;
}

var tPos = [];
function allocateVertex(element, index, batchIndex, model, r, g, b, a) {
	tPos[0] = cube[(index * 20) + (element * 5) + 0];
	tPos[1] = cube[(index * 20) + (element * 5) + 1];
	tPos[2] = cube[(index * 20) + (element * 5) + 2];

	vec3.transformMat4(tPos, tPos, model);

	batchArray[batchIndex++] = tPos[0];
	batchArray[batchIndex++] = tPos[1];
	batchArray[batchIndex++] = tPos[2];
	batchArray[batchIndex++] = cube[(index * 20) + (element * 5) + 3];
	batchArray[batchIndex++] = cube[(index * 20) + (element * 5) + 4];
	batchArray[batchIndex++] = r;
	batchArray[batchIndex++] = g;
	batchArray[batchIndex++] = b;
	batchArray[batchIndex++] = a;

	return batchIndex;
}

var indexOrder = [0, 1, 2, 0, 2, 3];
function drawCube(index, model, r, g, b, selected) {
	for(var i = 0; i < 6; i++) {
		for(var j = 0; j < indexOrder.length; j++)  {
			var br = (selected && i == intersectingSide)? 1.75 : 1.0;
			index = allocateVertex(indexOrder[j], i, index, model, r * br, g * br, b * br, 1.0);
		}
	}
	return index;
}

function placeBlock() {
	if(targetBlock != undefined) {
		var newBlock;
		if(intersectingSide == 0) newBlock = spawnBlock(targetBlock.x, targetBlock.y, targetBlock.z + 1);
		if(intersectingSide == 1) newBlock = spawnBlock(targetBlock.x, targetBlock.y, targetBlock.z - 1);
		if(intersectingSide == 2) newBlock = spawnBlock(targetBlock.x - 1, targetBlock.y, targetBlock.z);
		if(intersectingSide == 3) newBlock = spawnBlock(targetBlock.x + 1, targetBlock.y, targetBlock.z);
		if(intersectingSide == 4) newBlock = spawnBlock(targetBlock.x, targetBlock.y + 1, targetBlock.z);
		if(intersectingSide == 5) newBlock = spawnBlock(targetBlock.x, targetBlock.y - 1, targetBlock.z);
	}
}

function removeBlock() {
	deleteBlock(targetBlock);
	targetBlock = undefined;
}

function spawnBlock(x, y, z) {
	var unusedBlockID = -1;
	for(var i = 0; i < blocks.length; i++) {
		var block = blocks[i];
		if(block == undefined) {
			if(unusedBlockID == -1) {
				unusedBlockID = i;
			}
			continue;
		}
		if(block.x == x && block.y == y && block.z == z) {
			return;
		}
	}

	var id = (unusedBlockID != -1 && unusedBlockID < blockIDs)? unusedBlockID : blockIDs++;
	var newBlock = {
		id: id, x: x, y: y, z: z,
		r: colors[currentColorIndex][0], g: colors[currentColorIndex][1], b: colors[currentColorIndex][2]
	};

	blocks[id] = newBlock;

	return newBlock;
}

function deleteBlock(targetBlock) {
	if(targetBlock != undefined && (targetBlock.x != 0 || targetBlock.y != 0 || targetBlock.z != 0)) {
		for(var i = 0; i < blocks.length; i++) {
			if(blocks[i] != undefined && blocks[i].id == targetBlock.id) {
				blocks[i] = undefined;
				break;
			}
		}
	}
}

function setColorIndex(index) {
	currentColorIndex = index;
	if(currentColorIndex < 0) currentColorIndex = colors.length - 1;
	if(currentColorIndex >= colors.length) currentColorIndex = 0;
}

function keydown(key) {
	keyStates[key.keyCode] = true;
	if(lastUp[key.keyCode] == undefined)
		lastUp[key.keyCode] = 0;
}

function keyup(key) {
	keyStates[key.keyCode] = false;
	lastUp[key.keyCode] = 0;
}

window.addEventListener("keydown", keydown);
window.addEventListener("keyup", keyup);

function isKeyPressed(key) {
	if(keyStates[key] && lastUp[key] < PRESSED_DURATION) {
		lastUp[key] = PRESSED_DURATION;
		return true;
	}
	return false;
}

function mousemove(e) {
	if(isPointerLocked) {
		var mx = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
		var my = e.movementY || e.mozMovementY || e.webkitMovementY || 0;

		camYaw += (mx / 1000) * LOOK_SPEED;
		camPitch += (-my / 1000) * LOOK_SPEED;
	}
}

function mousewheel(e) {
	setColorIndex(currentColorIndex + Math.sign(e.wheelDelta));
}

function onPointerLockChange(e) {
	isPointerLocked = document.pointerLockElement === canvas ||
						document.mozPointerLockElement === canvas ||
						document.webkitPointerLockElement === canvas;
}

function click(e) {
	if(!isPointerLocked) {
		if(canvas.requestPointerLock && document.exitPointerLock) {
			canvas.requestPointerLock();
		}
	} else {
		if(e.button == 0) placeBlock();
		if(e.button == 2) removeBlock();
	}
}

document.addEventListener("mousemove", mousemove);
document.addEventListener("mousewheel", mousewheel);
document.addEventListener("click", click);

if ("onpointerlockchange" in document)
	document.addEventListener("pointerlockchange", onPointerLockChange, false);
else if ("onmozpointerlockchange" in document)
	document.addEventListener("mozpointerlockchange", onPointerLockChange, false);
else if ("onwebkitpointerlockchange" in document)
	document.addEventListener("webkitpointerlockchange", onPointerLockChange, false);

function mollerTrumbore(v1, v2, v3, origin, direction) {
	var EPSILON = 0.000001, E1 = [], E2 = [],
		P = [], Q = [], T = [],
		det, u ,v;

	vec3.sub(E1, v2, v1);
	vec3.sub(E2, v3, v1);
	vec3.cross(P, direction, E2);
	det = vec3.dot(E1, P);
	if(det > -EPSILON && det < EPSILON) return 0;
	vec3.sub(T, origin, v1);
	u = vec3.dot(T, P) / det;
	if(u < 0 || u > 1) return 0;
	vec3.cross(Q, T, E1);
	v = vec3.dot(direction, Q) / det;
	if(v < 0 || u + v > 1) return 0;
	if(vec3.dot(E2, Q) / det > EPSILON) return 1;
	return 0;
}

var movement = [];
function moveCam(direction, magnitude) {
	movement[0] = movement[1] = movement[2] = 0;
	vec3.scale(movement, direction, magnitude);
	vec3.add(camPos, camPos, movement);
}

function render() {
	requestAnimationFrame(render);

	var delta = (Date.now() - lastUpdate) / 1000;
	lastUpdate = Date.now();

	for(key in keyStates) {
		if(keyStates[key]) {
			lastUp[key] += delta;
		}
	}

	if(isKeyPressed(27)) {
		if(isPointerLocked) {
			isPointerLocked = false;
		}
	}

	if(isKeyPressed(88)) {
		setColorIndex(currentColorIndex - 1);
	}

	if(isKeyPressed(67)) {
		setColorIndex(currentColorIndex + 1);
	}

	if(isKeyPressed(32)) {
		if(!keyStates[16]) {
			placeBlock();
		}
		else {
			removeBlock();
		}
	}

	if(keyStates[87]) {
		moveCam(camFront, delta * 4);
	}

	if(keyStates[83]) {
		moveCam(camFront, -delta * 4);
	}

	if(keyStates[65]) {
		moveCam(camRight, -delta * 4);
	}

	if(keyStates[68]) {
		moveCam(camRight, delta * 4);
	}

	if(keyStates[81]) {
		moveCam(camUp, delta * 4);
	}

	if(keyStates[69]) {
		moveCam(camUp, -delta * 4);
	}

	if(keyStates[38]) {
		camPitch += LOOK_SPEED * delta;
	}

	if(keyStates[40]) {
		camPitch -= LOOK_SPEED * delta;
	}

	if(keyStates[37]) {
		camYaw -= LOOK_SPEED * delta;
	}

	if(keyStates[39]) {
		camYaw += LOOK_SPEED * delta;
	}

	camPitch = Math.max(Math.min(camPitch, vFov * 1.5), -vFov * 1.5);

	camFront[0] = Math.cos(camYaw) * Math.cos(camPitch);
	camFront[1] = Math.sin(camPitch);
	camFront[2] = Math.sin(camYaw) * Math.cos(camPitch);

	camRight = [];
	camUp = [];

	vec3.cross(camRight, camFront, camGlobalUp);
	vec3.normalize(camRight, camRight);

	vec3.cross(camUp, camRight, camFront);
	vec3.normalize(camUp, camUp);

	var target = [];
	vec3.add(target, camPos, camFront);
	mat4.lookAt(view, camPos, target, camUp);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.viewport(0, 0, canvas.width, canvas.height);

	var tPos = [];

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, cubeTexture);
	gl.uniform1i(gl.getUniformLocation(program, "u_Tex"), 0);

	gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_View"), false, view);
	gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_Proj"), false, projection);

	var index = 0;

	var model;
	targetBlock = undefined;

	for(var i = 0; i < blocks.length; i++) {
		var block = blocks[i];
		if(block == undefined) continue;

		var dx = camPos[0] - block.x;
		var dy = camPos[1] - block.y;
		var dz = camPos[2] - block.z;
		var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

		if(dist < 5) {
			var nearestDistance = 100000;
			for(var j = 0; j < 6; j++) {
				var rFront = [];
				vec3.scale(rFront, camFront, 1.5);

				var t1v1 = [], t1v2 = [], t1v3 = [];
				vec3.set(t1v1,
					block.x + cube[(j * 20) + (0 * 5) + 0],
					block.y + cube[(j * 20) + (0 * 5) + 1],
					block.z + cube[(j * 20) + (0 * 5) + 2]);
				vec3.set(t1v2,
					block.x + cube[(j * 20) + (1 * 5) + 0],
					block.y + cube[(j * 20) + (1 * 5) + 1],
					block.z + cube[(j * 20) + (1 * 5) + 2]);
				vec3.set(t1v3,
					block.x + cube[(j * 20) + (2 * 5) + 0],
					block.y + cube[(j * 20) + (2 * 5) + 1],
					block.z + cube[(j * 20) + (2 * 5) + 2]);

				var t2v1 = [], t2v2 = [], t2v3 = [];
				vec3.set(t2v1,
					block.x + cube[(j * 20) + (0 * 5) + 0],
					block.y + cube[(j * 20) + (0 * 5) + 1],
					block.z + cube[(j * 20) + (0 * 5) + 2]);
				vec3.set(t2v2,
					block.x + cube[(j * 20) + (2 * 5) + 0],
					block.y + cube[(j * 20) + (2 * 5) + 1],
					block.z + cube[(j * 20) + (2 * 5) + 2]);
				vec3.set(t2v3,
					block.x + cube[(j * 20) + (3 * 5) + 0],
					block.y + cube[(j * 20) + (3 * 5) + 1],
					block.z + cube[(j * 20) + (3 * 5) + 2]);

				var i1 = mollerTrumbore(t1v1, t1v2, t1v3, camPos, rFront);
				var i2 = mollerTrumbore(t2v1, t2v2, t2v3, camPos, rFront);
				if(i1 == 1 || i2 == 1) {
					var cx = (t1v1[0] + t1v2[0] + t1v3[0] + t2v3[0]) / 4;
					var cy = (t1v1[1] + t1v2[1] + t1v3[1] + t2v3[1]) / 4;
					var cz = (t1v1[2] + t1v2[2] + t1v3[2] + t2v3[2]) / 4;

					var dx = camPos[0] - cx;
					var dy = camPos[1] - cy;
					var dz = camPos[2] - cz;

					var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
					if(dist < nearestDistance) {
						nearestDistance = dist;
						intersectingSide = j;
						targetBlock = block;
					}
				}
			}
		}
	}

	for(var i = 0; i < blocks.length; i++) {
		var block = blocks[i];
		if(block == undefined) {
			continue;
		}

		var dx = camPos[0] - block.x;
		var dy = camPos[1] - block.y;
		var dz = camPos[2] - block.z;
		var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

		if(dist >= 100) {
			continue;
		}

		model = mat4.create();
		mat4.translate(model, model, [block.x, block.y, block.z]);

		index = drawCube(index, model, block.r, block.g, block.b, targetBlock != undefined && targetBlock.id == block.id);
		if(index == batchArray.length) {
			index = 0;
			gl.bufferData(gl.ARRAY_BUFFER, batchArray, gl.STATIC_DRAW);
			gl.drawArrays(gl.TRIANGLES, 0, batchArray.length / 9);
		}
	}

	for(var i = index; i < batchArray.length; i++)
		batchArray[i] = 0;

	if(index > 0) {
		gl.bufferData(gl.ARRAY_BUFFER, batchArray, gl.STATIC_DRAW);
		gl.drawArrays(gl.TRIANGLES, 0, index / 9);
	}

	overlay.width = overlay.width;

	var r = Math.floor(colors[currentColorIndex][0] * 255);
	var g = Math.floor(colors[currentColorIndex][1] * 255);
	var b = Math.floor(colors[currentColorIndex][2] * 255);

	fpsUpdate += delta;
	if(fpsUpdate >= 0.5) {
		fpsUpdate = 0;
		fps = Math.floor(1 / delta);
	}

	context.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
	context.fillRect(overlay.width * 0.3, overlay.height * 0.9, overlay.width * 0.4, overlay.height * 0.05);
	context.strokeStyle = "#000000";
	context.strokeRect(overlay.width * 0.3, overlay.height * 0.9, overlay.width * 0.4, overlay.height * 0.05);
	context.strokeStyle = "#DDDDDD";
	context.beginPath();
	context.arc(overlay.width/2,overlay.height/2, 4, 0, Math.PI * 2, true);
	context.stroke();
	context.font = "12px Arial";
	context.fillStyle = "#FFFFFF";
	context.fillText(fps + " fps", 20, 20);
}

function resize() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	overlay.width = canvas.width;
	overlay.height = canvas.height;
	mat4.perspective(projection, vFov = 2 * Math.atan(Math.tan(hFov / 2) * canvas.height / canvas.width), canvas.width / canvas.height, 0.1, 100.0);
}

function clearMap() {
	blocks = [blocks[0]];
}

function loadData(data) {
	blocks = [];

	if(data == undefined) {
		data = localStorage.getItem(storageKey);
	}

	if(data != null)  {

		var split = data.split("|");
		for(var i = 0; i < split.length; i++) {
			var blockType = split[i];
			var blockData = split[i].split(" ");
			var rgb = hexStringToRGB(blockData[0]);
			for(var j = 1; j < blockData.length; ) {
				blocks[blocks.length] = {
					id: parseInt(blockData[j++]),
					x: parseInt(blockData[j++]),
					y: parseInt(blockData[j++]),
					z: parseInt(blockData[j++]),
					r: rgb[0], g: rgb[1], b: rgb[2]
				};
			}
		}

		blockIDs = blocks.length;
	} else {
		spawnBlock(0, 0, 0);
	}
}

function saveMap() {
	var map = [];
	var colors = [];
	for(var i = 0; i < blocks.length; i++) {
		var block = blocks[i];
		if(block == undefined)  {
			continue;
		}

		var hex = rgbToHexString(block.r, block.g, block.b);
		if(map[hex] == undefined) {
			map[hex] = [];
			colors[colors.length] = hex;
		}
		map[hex][map[hex].length] = block.id;
		map[hex][map[hex].length] = block.x;
		map[hex][map[hex].length] = block.y;
		map[hex][map[hex].length] = block.z;
	}

	var data = "";
	for(var i = 0; i < colors.length; i++) {
		var hex = colors[i];
		data += hex + " ";
		for(var j = 0; j < map[hex].length; j++) {
			data += map[hex][j];
			if(j < map[hex].length - 1) data += " ";
			else if (i < colors.length - 1) data += "|";
		}
	}

	localStorage.setItem(storageKey, data);
}

function rgbToHexString(r, g, b) {
	r *= 255; g *= 255; b *= 255;
	return ((r << 16) | (g << 8) | b).toString(16);
}

function hexStringToRGB(hex) {
	var i = parseInt(hex, 16);
	return [(((i >> 16)) & 255) / 255, ((i >> 8) & 255) / 255, (i & 255) / 255];
}