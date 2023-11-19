const{PDFDocument:a}=require("pdf-lib"),n=require("fs-extra"),r=async e=>{const t=n.readFileSync(e);return(await a.load(t)).getPageCount()};export{r as default};
