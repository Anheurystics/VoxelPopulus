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
var batchArray = new Float32Array(9 * 36 * 1000);
var batchIndex = 0;

var view, projection;

var camPos;
var camFront;
var camRight;
var camUp;
var camGlobalUp;
var camYaw;
var camPitch;

var blockTex = new Image();
blockTex.src = "images/blockTex.png";

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
	[0.15, 0.5, 0.0],	//Dark green
]
var currentColorIndex = 0;

var isSoloGame = false;
var socket;

var targetBlock;
var intersectingSide;

var keyStates = [];
var ctrlReleased = false;
var isPointerLocked = false;

window.onload = function()
{
	canvas = document.getElementById("canvas");
	
	canvas.requestPointerLock = canvas.requestPointerLock ||
           canvas.mozRequestPointerLock ||
           canvas.webkitRequestPointerLock;

	document.exitPointerLock = document.exitPointerLock ||
			 document.mozExitPointerLock ||
			 document.webkitExitPointerLock;
	
	gl = canvas.getContext("webgl", {antialias: true});

	overlay = document.getElementById("canvasOverlay");
	context = overlay.getContext("2d");

	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	
	overlay.width = canvas.width;
	overlay.height = canvas.height;
	overlay.style.position = "relative";
	overlay.style.transform = canvas.style.transform;
	
	if(!gl)
	{
		alert("Can't get WebGL Context!");
	}
	
	initGL();
	
	lastUpdate = Date.now();
	
	var query = window.location.search;
	if(query.substring(0, 1) == '?')
	{
		query = query.substring(1);
	}
	var data = query.split(",");
	for(var i = 0; i < data.length; i++)
	{
		data[i] = unescape(data[i]);
	}
	
	isSoloGame = data[0] != "false";
	
	if(isSoloGame)
	{
		spawnBlock(0, 0, 0);
		
		//Benchmark
		/*
		var range = 100;
		for(var i = 0; i < 1; i++)
		{
			var block = spawnBlock(Math.floor(Math.random() * range), Math.floor(Math.random() * range), Math.floor(Math.random() * range))
			if(block == undefined) continue;
			block.r = Math.random();
			block.g = Math.random();
			block.b = Math.random();
		}
		*/
	}
	else
	{
		socket = io.connect(data[1] + ":" + data[2]);
		
		socket.on("update", function(data) {
			blocks = data;
		})
	}
	
	requestAnimationFrame(render);
}

function initGL()
{
	var vertShader = makeShader(gl.VERTEX_SHADER, document.getElementById("vert-shader").innerHTML);
	var fragShader = makeShader(gl.FRAGMENT_SHADER, document.getElementById("frag-shader").innerHTML);

	gl.clearColor(0.2, 0.2, 0.2, 1.0);
	
	program = gl.createProgram();
	gl.attachShader(program, vertShader);
	gl.attachShader(program, fragShader);
	gl.linkProgram(program);
	console.log(gl.getProgramInfoLog(program));
	gl.useProgram(program);
	
	vertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	var posLoc = gl.getAttribLocation(program, "position");
	gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 9 * Float32Array.BYTES_PER_ELEMENT, 0);
	gl.enableVertexAttribArray(posLoc);
	var texLoc = gl.getAttribLocation(program, "texCoord");
	gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 9 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);
	gl.enableVertexAttribArray(texLoc);
	var colLoc = gl.getAttribLocation(program, "color");
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
	console.log(gl.getShaderInfoLog(shader));
	return shader;
}

function updateBlockData(blockIndex)
{
	var block = blocks[blockIndex];
	console.log(block, blockIndex);
}

function allocateVertex(tPos, element, index, batchIndex, model, r, g, b, a)
{
	vec3.set(tPos, 
		cube[(index * 20) + (element * 5) + 0],
		cube[(index * 20) + (element * 5) + 1],
		cube[(index * 20) + (element * 5) + 2]
	)
	
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

var tPos = [];

function drawCube(index, model, r, g, b, a)
{
	gl.uniformMatrix4fv(gl.getUniformLocation(program, "model"), false, model);
	for(var i = 0; i < 6; i++)
	{
		index = allocateVertex(tPos, 0, i, index, model, r, g, b, a);
		index = allocateVertex(tPos, 1, i, index, model, r, g, b, a);
		index = allocateVertex(tPos, 2, i, index, model, r, g, b, a);
		index = allocateVertex(tPos, 0, i, index, model, r, g, b, a);
		index = allocateVertex(tPos, 2, i, index, model, r, g, b, a);
		index = allocateVertex(tPos, 3, i, index, model, r, g, b, a);
	}
	return index;
}

function spawnBlock(x, y, z)
{
	var unusedBlockID = -1;
	for(var i = 0; i < blocks.length; i++)
	{
		var block = blocks[i];
		if(block == undefined) 
		{
			if(unusedBlockID == -1)
			{
				unusedBlockID = i;
			}
			continue;
		}
		if(block.x == x && block.y == y && block.z == z)
		{
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

function deleteBlock(targetBlock)
{
	if(targetBlock != undefined && (targetBlock.x != 0 || targetBlock.y != 0 || targetBlock.z != 0))
	{
		for(var i = 0; i < blocks.length; i++)
		{
			if(blocks[i] != undefined && blocks[i].id == targetBlock.id)
			{
				blocks[i] = undefined;
				break;
			}
		}
	}
}

window.onkeydown = function(key)
{ 
	keyStates[key.keyCode] = true;
}

window.onkeyup = function(key)
{
	keyStates[key.keyCode] = false;
	if(key.keyCode == 77)
	{
		if(canvas.requestPointerLock && document.exitPointerLock)
		{
			if(isPointerLocked) document.exitPointerLock();
			else 				canvas.requestPointerLock();
			
			isPointerLocked = !isPointerLocked;
		}
	}
	if(key.keyCode == 88)
	{
		currentColorIndex -= 1;
		if(currentColorIndex < 0)
		{
			currentColorIndex = colors.length - 1;
		}
	}
	if(key.keyCode == 67)
	{
		currentColorIndex += 1;
		if(currentColorIndex >= colors.length)
		{
			currentColorIndex = 0;
		}
	}
	if(key.keyCode == 32)
	{
		if(!key.shiftKey && targetBlock != undefined)
		{
			var newBlock;
			if(intersectingSide == 0) newBlock = spawnBlock(targetBlock.x, targetBlock.y, targetBlock.z + 1);
			if(intersectingSide == 1) newBlock = spawnBlock(targetBlock.x, targetBlock.y, targetBlock.z - 1);
			if(intersectingSide == 2) newBlock = spawnBlock(targetBlock.x - 1, targetBlock.y, targetBlock.z);
			if(intersectingSide == 3) newBlock = spawnBlock(targetBlock.x + 1, targetBlock.y, targetBlock.z);
			if(intersectingSide == 4) newBlock = spawnBlock(targetBlock.x, targetBlock.y + 1, targetBlock.z);
			if(intersectingSide == 5) newBlock = spawnBlock(targetBlock.x, targetBlock.y - 1, targetBlock.z);
			
			if(!isSoloGame)
			{
				socket.emit("block_update", {type: "add", block: newBlock});
			}
		}
		else
		{
			deleteBlock(targetBlock);
			if(!isSoloGame)
			{
				socket.emit("block_update", {type: "remove", block: targetBlock});
			}
			targetBlock = undefined;
		}
	}
}

document.onmousemove = function(e)
{
	if(isPointerLocked)
	{
		  var mx = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
		  var my = e.movementY || e.mozMovementY || e.webkitMovementY || 0;
		  
		  camYaw += (mx / canvas.width) * Math.PI / 2;
		  camPitch += (-my / canvas.height) * Math.PI / 2;
	}
}

//Based on the C example on Wikipedia. I'll understand this someday
function mollerTrumbore(v1, v2, v3, origin, direction)
{
	var EPSILON = 0.000001, E1 = vec3.create(), E2 = vec3.create(),
		P = vec3.create(), Q = vec3.create(), T = vec3.create(),
		det, invDet, u ,v;
	
	vec3.sub(E1, v2, v1);
	vec3.sub(E2, v3, v1);
	vec3.cross(P, direction, E2);
	det = vec3.dot(E1, P);
	if(det > -EPSILON && det < EPSILON) return 0;
	invDet = 1.0 / det;
	vec3.sub(T, origin, v1);
	u = vec3.dot(T, P) * invDet;
	if(u < 0 || u > 1) return 0;
	vec3.cross(Q, T, E1);
	v = vec3.dot(direction, Q) * invDet;
	if(v < 0 || u + v > 1) return 0;
	if(vec3.dot(E2, Q) * invDet > EPSILON) return 1;
	return 0;
}

function render()
{	
	var delta = (Date.now() - lastUpdate) / 1000;
	lastUpdate = Date.now();
	
	if(keyStates[87])
	{
		var movement = vec3.create();
		vec3.scale(movement, camFront, delta * 4);
		
		vec3.add(camPos, camPos, movement);
	}
	if(keyStates[83])
	{
		var movement = vec3.create();
		vec3.scale(movement, camFront, -delta * 4);
		
		vec3.add(camPos, camPos, movement);
	}
	if(keyStates[65])
	{
		var movement = vec3.create();
		vec3.scale(movement, camRight, -delta * 4);
		
		vec3.add(camPos, camPos, movement);
	}
	if(keyStates[68])
	{
		var movement = vec3.create();
		vec3.scale(movement, camRight, delta * 4);
		
		vec3.add(camPos, camPos, movement);
	}
	if(keyStates[81])
	{
		var movement = vec3.create();
		vec3.scale(movement, camUp, delta * 4);
		
		vec3.add(camPos, camPos, movement);
	}
	if(keyStates[69])
	{
		var movement = vec3.create();
		vec3.scale(movement, camUp, -delta * 4);
		
		vec3.add(camPos, camPos, movement);		
	}
	if(keyStates[38])
	{
		camPitch += Math.PI / 3 * delta;
	}
	if(keyStates[40])
	{
		camPitch -= Math.PI / 3 * delta;
	}
	if(keyStates[37])
	{
		camYaw -= Math.PI / 3 * delta;
	}
	if(keyStates[39])
	{
		camYaw += Math.PI / 3 * delta;
	}
	
	camPitch = clamp(camPitch, -vFov, vFov);
	
	camFront[0] = Math.cos(camYaw) * Math.cos(camPitch);
	camFront[1] = Math.sin(camPitch);
	camFront[2] = Math.sin(camYaw) * Math.cos(camPitch);

	camRight = vec3.create();
	camUp = vec3.create();

	vec3.cross(camRight, camFront, camGlobalUp);
	vec3.normalize(camRight, camRight);

	vec3.cross(camUp, camRight, camFront);
	vec3.normalize(camUp, camUp);

	var target = vec3.create();
	vec3.add(target, camPos, camFront);
	mat4.lookAt(view, camPos, target, camUp);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.viewport(0, 0, canvas.width, canvas.height);
	
	var tPos = vec3.create();
	
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, cubeTexture);
	gl.uniform1i(gl.getUniformLocation(program, "tex"), 0);
	
	gl.uniformMatrix4fv(gl.getUniformLocation(program, "view"), false, view);
	gl.uniformMatrix4fv(gl.getUniformLocation(program, "proj"), false, projection);
	
	var index = 0;
	
	var model;
	targetBlock = undefined;
	for(var i = 0; i < blocks.length; i++)
	{
		var block = blocks[i];
		if(block == undefined) continue;
		
		var dx = camPos[0] - block.x;
		var dy = camPos[1] - block.y;
		var dz = camPos[2] - block.z;
		var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
		
		if(dist < 5)
		{
			var nearestDistance = 100000;
			for(var j = 0; j < 6; j++)
			{
				var rFront = vec3.create();
				vec3.scale(rFront, camFront, 1.5);
				
				var t1v1 = vec3.create(), t1v2 = vec3.create(), t1v3 = vec3.create();
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
								
				var t2v1 = vec3.create(), t2v2 = vec3.create(), t2v3 = vec3.create();
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
				if(i1 == 1 || i2 == 1)
				{
					var cx = (t1v1[0] + t1v2[0] + t1v3[0] + t2v3[0]) / 4;
					var cy = (t1v1[1] + t1v2[1] + t1v3[1] + t2v3[1]) / 4;
					var cz = (t1v1[2] + t1v2[2] + t1v3[2] + t2v3[2]) / 4;
					
					var dx = camPos[0] - cx;
					var dy = camPos[1] - cy;
					var dz = camPos[2] - cz;
					
					var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
					if(dist < nearestDistance)
					{
						nearestDistance = dist;
						intersectingSide = j;
						targetBlock = block;
					}
				}
			}
		}
	}
	
	for(var i = 0; i < blocks.length; i++)
	{
		var block = blocks[i];
		if(block == undefined) continue;
		
		var dx = camPos[0] - block.x;
		var dy = camPos[1] - block.y;
		var dz = camPos[2] - block.z;
		var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
		
		if(dist >= 100)
		{
			continue;
		}
		
		model = mat4.create();
		mat4.translate(model, model, [block.x, block.y, block.z]);
		
		var brightness = (targetBlock != undefined && targetBlock.id == block.id)? 1.5 : 1.0;
		index = drawCube(index, model, block.r * brightness, block.g * brightness, block.b * brightness, 1.0);	
		if(index == batchArray.length)
		{
			index = 0;
			gl.bufferData(gl.ARRAY_BUFFER, batchArray, gl.STATIC_DRAW);
			gl.drawArrays(gl.TRIANGLES, 0, batchArray.length / 9);
		}
	}
	/*
	for(var i = index; i < batchArray.length; i++)
	{
		batchArray[i] = 0;
	}
	*/
	batchArray.fill(0, index, batchArray.length);
	
	if(index > 0)
	{
		gl.bufferData(gl.ARRAY_BUFFER, batchArray, gl.STATIC_DRAW);
		gl.drawArrays(gl.TRIANGLES, 0, index / 9);
	}

	overlay.width = overlay.width;
	
	var r = Math.floor(colors[currentColorIndex][0] * 255);
	var g = Math.floor(colors[currentColorIndex][1] * 255);
	var b = Math.floor(colors[currentColorIndex][2] * 255);
	
	context.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
	context.fillRect(overlay.width * 0.3, overlay.height * 0.9, overlay.width * 0.4, overlay.height * 0.05);
	context.strokeStyle = "#000000";
	context.strokeRect(overlay.width * 0.3, overlay.height * 0.9, overlay.width * 0.4, overlay.height * 0.05);
	context.strokeStyle = "#DDDDDD";
	context.strokeRect(overlay.width/2 - 5,overlay.height/2 - 5, 10, 10);
	context.fillStyle = "#FFFFFF";
	context.fillText(Math.floor(1 / delta) + " fps", 20, 20);
	requestAnimationFrame(render);
}

function clamp(val, min, max)
{
	if(val < min) return min;
	if(val > max) return max;
	return val;
}

window.onresize = function()
{
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	overlay.width = canvas.width;
	overlay.height = canvas.height;
	mat4.perspective(projection, vFov = 2 * Math.atan(Math.tan(hFov / 2) * canvas.height / canvas.width), canvas.width / canvas.height, 0.1, 100.0);
}