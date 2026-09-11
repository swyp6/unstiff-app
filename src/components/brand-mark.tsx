import { Image } from "expo-image";

const LOGO = require("@/assets/images/logo-wordmark.png");
const LOGO_ASPECT_RATIO = 214 / 91;

// Wordmark from Figma nodes 4501:44549 (splash) / 4501:44623 (login).
export function BrandMark({ size = 214 }: { size?: number }) {
  return (
    <Image
      source={LOGO}
      style={{ width: size, height: size / LOGO_ASPECT_RATIO }}
      contentFit="contain"
    />
  );
}
