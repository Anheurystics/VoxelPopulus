var http = require("http"),
	IO = require("socket.io"),
	buffer = new Array();

var io = IO.listen(http.createServer(function(req, res) {
	res.writeHead(200, {"Content-Type": "text/html"});
}).listen(3333));

console.log("Server started at port 3333");

var blocks = new Array();
var blockIDs = 0, selectedBlockID = -1;

spawnBlock(0, 0, 0);

function spawnBlock(x, y, z)
{
	if(blockIDs == 0 && selectedBlockID == -1)
	{
		selectedBlockID = 0;
	}

	for(var i = 0; i < blocks.length; i++)
	{
		var block = blocks[i];
		if(block == undefined) continue;
		if(block.x == x && block.y == y && block.z == z)
		{
			return;
		}
	}
	
	var newBlock = {
		id: blockIDs++, x: x, y: y, z: z, 
		r: 1.0, g: 0.2, b: 0.2
	};
	
	blocks[blocks.length] = newBlock;
	
	return newBlock;
}

io.on("connection", function(client) {

	client.emit("update", blocks);

	client.on("block_update", function(data) {
		var type = data.type;
		var block = data.block;
		
		console.log(type, block);
		
		if(type == "add")
		{
			blocks[blocks.length] = data.block;
		}
		else
		if(type == "remove")
		{
			for(var i = 0; i < blocks.length; i++)
			{
				if(blocks[i] == undefined) continue;
				if(blocks[i].id == block.id)
				{
					blocks[i] = undefined;
				}
			}
		}
		
		io.sockets.emit("update", blocks);
	});
	
	client.on("disconnect", function() {

	});

});