import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 静态导出，用于 GitHub Pages 部署
  output: "export",
  // GitHub Pages 项目站点位于子路径 /game-0628-card/，
  // 仅生产构建加 basePath；本地 dev 保持根路径方便调试
  basePath: process.env.NODE_ENV === "production" ? "/game-0628-card" : "",
  images: {
    // 静态导出不支持 next/image 优化
    unoptimized: true,
  },
};

export default nextConfig;
