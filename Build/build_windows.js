const files = require('fs');
const exec = require('child_process').execSync;

// Remove result directory, then add it back (remove all the files)
// /s is for removing all sub-elements, /q is for quiet (no confirmation)
if(files.existsSync('result')){
	exec('rmdir /s /q result');
}
exec('mkdir result');

// copy entire libs, src folders
for(const name of ['libs', 'src']){
	exec(`echo d | xcopy /s /q /r /y "../${name}" "result/${name}"`);
}