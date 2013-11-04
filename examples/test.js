var RarArchive = require('rarjs');

var file = RarArchive({type: RarArchive.OPEN_LOCAL, file: '../build/test.rar'}, function(err) {
	this.entries.forEach(function(val) {
		console.log(val.path);
	});
});
