declare module 'pdfjs-dist/build/pdf.worker.min.js' {
  const workerContent: string;
  export default workerContent;
}

declare module '*.worker.js' {
  const content: string;
  export default content;
} 