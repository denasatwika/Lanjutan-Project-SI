"use client";

import {
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Trash2 } from "lucide-react";

export interface DrawCanvasRef {
  getSignatureDataURL: () => string | null;
  clear: () => void;
}

const DrawCanvas = forwardRef<DrawCanvasRef>((props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });
  const [isCanvasEmpty, setIsCanvasEmpty] = useState(true);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    getSignatureDataURL: () => {
      const canvas = canvasRef.current;
      if (!canvas || isCanvasEmpty) {
        return null;
      }

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;

      // Get the pixel data of the entire canvas
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      let minX = canvas.width,
        minY = canvas.height,
        maxX = 0,
        maxY = 0;

      // Find the bounding box of the signature
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          // The alpha channel is the 4th byte in each pixel
          const alpha = data[(y * canvas.width + x) * 4 + 3];
          if (alpha > 0) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      // If the canvas is effectively empty
      if (maxX === 0 && minX === canvas.width) {
        return null;
      }

      const padding = 20; // 10px padding on each side
      const cropWidth = maxX - minX + padding;
      const cropHeight = maxY - minY + padding;

      // Create a new canvas with the size of the bounding box
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = cropWidth;
      tempCanvas.height = cropHeight;
      const tempCtx = tempCanvas.getContext("2d");

      if (!tempCtx) {
        return null;
      }

      // Draw the cropped portion of the original canvas onto the new canvas
      tempCtx.drawImage(
        canvas,
        minX - padding / 2, // source X
        minY - padding / 2, // source Y
        cropWidth, // source width
        cropHeight, // source height
        0, // destination X
        0, // destination Y
        cropWidth, // destination width
        cropHeight // destination height
      );

      // Return the data URL of the cropped image
      return tempCanvas.toDataURL("image/png");
    },
    clear: () => {
      handleClear();
    },
  }));

  // Effect to set up canvas and handle resizing for HD rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setCanvasDimensions = () => {
      if (!canvasRef.current) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvasRef.current.getBoundingClientRect();

      canvasRef.current.width = rect.width * dpr;
      canvasRef.current.height = rect.height * dpr;

      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;

      ctx.scale(dpr, dpr);

      // Re-apply context settings after resize
      ctx.strokeStyle = "#000";
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.lineWidth = 2;
    };

    setCanvasDimensions();
    window.addEventListener("resize", setCanvasDimensions);
    return () => window.removeEventListener("resize", setCanvasDimensions);
  }, []);

  const getEventPosition = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    // No need to scale here because the context is already scaled
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const pos = getEventPosition(e);
    setLastPosition(pos);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const pos = getEventPosition(e);

    ctx.beginPath();
    ctx.moveTo(lastPosition.x, lastPosition.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    setLastPosition(pos);
    setIsCanvasEmpty(false);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Clear the canvas considering the scaling
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    setIsCanvasEmpty(true);
  };

  return (
    <div className="space-y-4">
      <canvas
        ref={canvasRef}
        className="bg-gray-100 rounded-lg border-2 border-dashed w-full h-auto aspect-[5/2] touch-none"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing} // Use onMouseLeave for better UX
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      ></canvas>
      <button
        onClick={handleClear}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-gray-200 py-2 text-gray-800 font-medium hover:bg-gray-300 transition"
      >
        <Trash2 className="h-4 w-4" />
        Hapus
      </button>
    </div>
  );
});

DrawCanvas.displayName = "DrawCanvas";
export default DrawCanvas;
