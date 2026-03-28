const fs = require('fs');

const files = ['template_12', 'template_16', 'template_17'];

files.forEach(name => {
  const b64 = fs.readFileSync(`dist/${name}.docx`).toString('base64');
  fs.writeFileSync(`src/${name}b64.js`, `export default "${b64}";`);
  console.log(`完成：src/${name}b64.js 已產生。`);
});