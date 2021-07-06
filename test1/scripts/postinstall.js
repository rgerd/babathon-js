const ENABLE_V8 = "true";
const fs = require("fs");
const xml2js = require('xml2js');
const path = require('path');
const currPath = __dirname;
const projectName = path.join(currPath, "..").substring(path.join(currPath, "..", "..").length);
console.log(`Current path: ${currPath}`);
console.log(`Project name: ${projectName}`);

let v8Version = "0.64.17";
const packagesConfigPath = `${currPath}\\..\\windows\\${projectName}\\packages.config`;
console.log(`packages.config path: ${packagesConfigPath}`);
const packagesConfigContent = fs.readFileSync(packagesConfigPath);
xml2js.parseString(packagesConfigContent, function (err, result) {
    for (let i = 0; i < result.packages.package.length; i++)
    {
        if (result.packages.package[i].$.id == "ReactNative.V8Jsi.Windows.UWP")
        {
            v8Version = result.packages.package[i].$.version;
        }
    }
});
console.log(`Using V8Version: ${v8Version}`);

const jsEnginePropsPath = `${currPath}\\..\\node_modules\\react-native-windows\\PropertySheets\\JSEngine.props`;
console.log(`JSEngine.props path: ${jsEnginePropsPath}`);
const jsEntinePropsContent = fs.readFileSync(jsEnginePropsPath);
xml2js.parseString(jsEntinePropsContent, function (err, result) {
    result.Project.PropertyGroup[0].UseV8[0]._ = ENABLE_V8;
    result.Project.PropertyGroup[0].V8Version[0]._ = v8Version;
    const builder = new xml2js.Builder();
    const newjsEnginePropsContent = builder.buildObject(result);
    fs.writeFileSync(jsEnginePropsPath, newjsEnginePropsContent);
    console.log(`V8 enabled in ${jsEnginePropsPath}`);
});
