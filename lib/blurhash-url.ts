import { decode } from "blurhash";

const SIZE = 32;

export function blurhashToDataURL(
  blurhash: string | null,
): string | undefined {
  if (!blurhash || typeof document === "undefined") return undefined;

  try {
    const pixels = decode(blurhash, SIZE, SIZE);
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d")!;
    const imageData = ctx.createImageData(SIZE, SIZE);
    imageData.data.set(pixels);
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
  } catch {
    return undefined;
  }
}
