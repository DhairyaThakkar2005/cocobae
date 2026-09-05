import { useWindowDimensions } from "react-native";

export interface BreakpointInfo {
  width: number;
  height: number;
  isXs: boolean; // 320px - 359px (Compact phones)
  isSm: boolean; // 360px - 429px (Standard phones)
  isMd: boolean; // 430px - 767px (Large phones / phablets)
  isTablet: boolean; // >= 768px (Tablets / Foldables in wide mode)
  isLarge: boolean; // >= 1024px (Large POS Tablets)
  isMobile: boolean; // < 768px
  gridCols: number; // 2, 3, or 4 columns
  contentPadding: number;
}

export function useBreakpoint(): BreakpointInfo {
  const { width, height } = useWindowDimensions();

  const isXs = width < 360;
  const isSm = width >= 360 && width < 430;
  const isMd = width >= 430 && width < 768;
  const isTablet = width >= 768;
  const isLarge = width >= 1024;
  const isMobile = width < 768;

  let gridCols = 2;
  if (isLarge) {
    gridCols = 4;
  } else if (isTablet) {
    gridCols = 3;
  } else if (isXs) {
    gridCols = 2;
  }

  let contentPadding = 12;
  if (isLarge) contentPadding = 24;
  else if (isTablet) contentPadding = 18;
  else if (isXs) contentPadding = 8;

  return {
    width,
    height,
    isXs,
    isSm,
    isMd,
    isTablet,
    isLarge,
    isMobile,
    gridCols,
    contentPadding,
  };
}
