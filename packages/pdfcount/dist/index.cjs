"use strict";const{PDFDocument:s}=require("pdf-lib"),a=require("fs-extra"),index=async e=>{const t=a.readFileSync(e);return(await s.load(t)).getPageCount()};module.exports=index;
