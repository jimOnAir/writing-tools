import { logger } from "@writing-tools/shared";
import { nativeImage, NativeImage } from "electron";
import isDev from "electron-is-dev";
import path from "path";

export function getAppIcon() {
  const iconPath = isDev
    ? path.join(__dirname, '../../assets/logo192.png')
    : path.join(__dirname, 'logo192.png');

  let icon: NativeImage;
  try {
    icon = nativeImage.createFromPath(iconPath);
  } catch (error) {
    logger.error('Failed to create app icon from path: %s, %s', iconPath, error);
    // Fallback to a default icon or create a simple one
    icon = nativeImage.createEmpty();
  }
  return icon;
}

