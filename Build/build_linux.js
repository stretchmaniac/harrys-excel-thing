const files = require('fs');
const shell = require('shelljs');

// Remove result directory, then add it back (remove all the files)
// /s is for removing all sub-elements, /q is for quiet (no confirmation)
if(files.existsSync('result')){
	console.log('...Removing result directory');
	shell.exec('rm -r result');
}
console.log('...Creating result directory');
shell.exec('mkdir result');

// copy entire libs, src folders
for(const name of ['libs', 'src']){
	console.log(`...copying ${name}`);
	shell.exec(`cp -r "../${name}" "result/"`);
}
