interface IPdf2images {
    (pdfPath: string, outputDir: string, filename?: string): Promise<{
        list: string[];
        pattern: string;
    }>;
}
declare const pdf2images: IPdf2images;

export { pdf2images as default };
