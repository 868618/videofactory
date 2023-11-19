const n=require("fontmin"),o=async(t,r)=>new Promise((s,i)=>{new n().src(r).use(n.glyph({text:t,hinting:!1})).run((e,u)=>{e?i(e):s(u)})});export{o as default};
