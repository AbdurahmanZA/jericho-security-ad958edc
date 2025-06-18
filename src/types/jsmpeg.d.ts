
declare global {
  interface Window {
    JSMpeg?: {
      Player: new (
        url: string,
        options: {
          canvas: HTMLCanvasElement;
          autoplay?: boolean;
          audio?: boolean;
          loop?: boolean;
          disableGl?: boolean;
          preserveDrawingBuffer?: boolean;
          progressive?: boolean;
          throttled?: boolean;
          chunkSize?: number;
          onSourceEstablished?: () => void;
          onSourceCompleted?: () => void;
          onSourceError?: (error: any) => void;
        }
      ) => {
        destroy: () => void;
      };
    };
  }
}

export {};
