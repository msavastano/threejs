// Type declarations so TypeScript treats imported shader files as string modules
// (resolved at build time by vite-plugin-glsl, which also inlines #include chunks).
declare module "*.glsl" {
  const value: string;
  export default value;
}
declare module "*.vert" {
  const value: string;
  export default value;
}
declare module "*.frag" {
  const value: string;
  export default value;
}
declare module "*.vert.glsl" {
  const value: string;
  export default value;
}
declare module "*.frag.glsl" {
  const value: string;
  export default value;
}
