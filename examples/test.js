var Rar = require('rarjs');

Rar.fromLocal('test.rar').then((archive) => {
	archive.entries.forEach((val) => {
		console.log(val.path);
	});
});
