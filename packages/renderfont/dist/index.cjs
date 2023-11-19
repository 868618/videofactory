"use strict";const t=require("fontmin"),u=async(n,s)=>new Promise((r,i)=>{new t().src(s).use(t.glyph({text:n,hinting:!1})).run((e,o)=>{e?i(e):r(o)})});module.exports=u;
