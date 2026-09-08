// Run after npm run build. Exercise the minified journal to catch unresolved
// identifiers introduced by production bundling. External dependencies are stubbed;
// React and the compiled journal component render normally. No account is used.
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname, '..');
const react=require(root+'/node_modules/react'),jsx=require(root+'/node_modules/react/jsx-runtime'),ssr=require(root+'/node_modules/react-dom/server');
const dir=root+'/.next/static/chunks';
let count=0;
for(const name of fs.readdirSync(dir)){
 if(!name.endsWith('.js'))continue;
 const source=fs.readFileSync(path.join(dir,name),'utf8');
 if(!source.includes('Error loading journal owner language'))continue;
 const registrations=[];vm.runInNewContext(source,{TURBOPACK:registrations,console});
 for(const entry of registrations){for(let i=1;i<entry.length;i++){
 if(typeof entry[i]!=='function'||!entry[i].toString().includes('Error loading journal owner language'))continue;
 let component;
 entry[i]({i(){return {...react,...jsx,normalizeLanguageCode:v=>v,isNativeLanguageBook:({bookLanguageCode,ownerNativeLanguage})=>bookLanguageCode===ownerNativeLanguage};},s(values){for(let k=0;k<values.length;k+=3)if(values[k]==='default')component=values[k+2];}});
 assert(component,'journal export missing');
 for(const language of ['en','ja']){const html=ssr.renderToString(react.createElement(component,{userBookId:'book',ownerUserId:'owner',bookLanguageCode:language}));assert(html.includes('Characters'));console.log('Production bundle rendered:',language);count++;}
 }}
}
assert(count>=2,'No compiled journals tested');
