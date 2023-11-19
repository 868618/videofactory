type ICreateFonts = (text: string, source: string, output?: string) => Promise<any>;
declare const createFonts: ICreateFonts;

export { createFonts as default };
