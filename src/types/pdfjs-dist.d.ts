declare module 'pdfjs-dist/build/pdf' {
  export const GlobalWorkerOptions: {
    workerSrc: string
  }

  export function getDocument(source: { data: ArrayBuffer }): {
    promise: Promise<{
      numPages: number
      getPage: (pageNumber: number) => Promise<{
        getTextContent: () => Promise<{ items: unknown[] }>
      }>
    }>
  }
}

declare module 'pdfjs-dist/build/pdf.worker.min.mjs' {
  const workerSrc: string
  export default workerSrc
}
